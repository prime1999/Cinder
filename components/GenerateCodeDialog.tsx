"use client";

// React hooks provide local state and side effects.
import { useEffect, useState } from "react";
// Wagmi gives access to the connected wallet address.
import { useAccount } from "wagmi";
// Dialog primitives come from the shadcn UI layer.
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
// Button is reused for the trigger, generate action, and close action.
import { Button } from "@/components/ui/button";
// This query hook loads the connected wallet's contract-matching NFTs.
import { useOwnedContractNfts } from "@/lib/Queries/supabaseQueries";
// Loader2 is used as a spinning loading indicator.
import { Loader2 } from "lucide-react";

// GenerateCodeDialog renders the Generate code button and the modal dialog.
const GenerateCodeDialog = () => {
  // open controls whether the dialog is visible.
  const [open, setOpen] = useState(false);
  // address stores the current connected wallet address.
  const { address } = useAccount();

  // ownedNfts holds the filtered NFTs returned from the API.
  // isLoading tracks the NFT query loading state.
  // error stores any failure from the NFT query.
  const {
    data: ownedNfts,
    isLoading,
    error,
  } = useOwnedContractNfts(address, open && Boolean(address));

  // enriched keeps the NFT list after metadata is fetched from tokenUri.
  const [enriched, setEnriched] = useState<any[] | null>(null);
  // loadingMeta tracks the secondary token-metadata fetch step.
  const [loadingMeta, setLoadingMeta] = useState(false);
  // payload stores the generated QR data and signature.
  const [payload, setPayload] = useState<{
    tokenId: string;
    eventId: string;
    issuedAt: string;
    signature: string;
  } | null>(null);
  // qrCodeDataUrl stores the generated QR image returned by the backend.
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  // qrPreviewOpen controls the preview modal that shows the QR image.
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  // payloadError stores any issue that occurs while building the QR payload.
  const [payloadError, setPayloadError] = useState<string | null>(null);

  // When the dialog opens, fetch metadata for each owned NFT.
  useEffect(() => {
    // Skip all work while the dialog is closed.
    if (!open) return;

    // If there are no NFTs, store an empty list and stop.
    if (!ownedNfts?.nfts?.length) {
      setEnriched([]);
      return;
    }

    // cancelled prevents state writes after the effect is cleaned up.
    let cancelled = false;

    // Prefer the configured Pinata gateway, then fall back to ipfs.io.
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
      ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
      : "https://ipfs.io";

    // Convert ipfs:// URIs into fetchable HTTP URLs.
    const normalizeUrl = (uri: string | undefined | null) => {
      // Return null when nothing is available.
      if (!uri) return null;

      // Replace the IPFS scheme with the selected HTTP gateway.
      if (uri.startsWith("ipfs://")) {
        return uri.replace("ipfs://", `${gateway}/ipfs/`);
      }

      // Return normal HTTP URLs unchanged.
      return uri;
    };

    // Start the asynchronous metadata fetch pipeline.
    (async () => {
      // Show the metadata loading state.
      setLoadingMeta(true);

      // Fetch and enrich every NFT in parallel.
      const promises = (ownedNfts.nfts || []).map(async (nft: any) => {
        try {
          // Prefer tokenUri, then imageUrl, as the metadata source.
          const possible = nft.tokenUri || nft.imageUrl || "";
          // Normalize the URI so fetch can load it.
          const uri = normalizeUrl(possible);

          // metadata will hold the JSON returned by the token URI.
          let metadata: any = null;

          // Only perform the network request when a URI exists.
          if (uri) {
            // Fetch the token metadata JSON.
            const res = await fetch(uri);
            // Parse the JSON only when the fetch succeeded.
            if (res.ok) metadata = await res.json().catch(() => null);
          }

          // Description comes from the metadata, with the NFT name as fallback.
          const description = metadata?.description ?? nft.name ?? "";
          // attributes is the array we inspect for location and date.
          const attributes: any[] =
            metadata?.attributes ?? metadata?.props ?? [];
          // eventId is read from top-level metadata first, then from common aliases.
          const eventId =
            metadata?.event_id ??
            metadata?.eventId ??
            metadata?.eventID ??
            null;

          // findAttr looks for the first attribute whose trait matches keywords.
          const findAttr = (keywords: string[]) => {
            // Return null if the metadata does not have a usable attribute array.
            if (!attributes || !Array.isArray(attributes)) return null;

            // Lowercase the keywords so matching is case-insensitive.
            const lowerKeywords = keywords.map((k) => k.toLowerCase());

            // Scan each attribute until a matching trait is found.
            for (const a of attributes) {
              // Normalize the trait name before comparing.
              const t = (a.trait_type || a.trait || a.type || "")
                .toString()
                .toLowerCase();

              // Return the attribute value as soon as one keyword matches.
              if (lowerKeywords.some((k) => t.includes(k))) return a.value ?? a;
            }

            // Return null if nothing matches.
            return null;
          };

          // Extract the event location from metadata attributes.
          const location = findAttr(["location", "venue", "place"]);
          // Extract the event date from metadata attributes.
          const eventDate = findAttr([
            "date",
            "start",
            "start_date",
            "event_date",
          ]);

          // Return the NFT merged with the extracted metadata fields.
          return { ...nft, description, location, eventDate, eventId };
        } catch (e) {
          // Keep the ticket visible even if metadata loading fails.
          return {
            ...nft,
            description: "",
            location: null,
            eventDate: null,
            eventId: null,
          };
        }
      });

      // Wait for all metadata fetches to complete.
      const results = await Promise.all(promises);

      // Only update state if the dialog is still active.
      if (!cancelled) setEnriched(results);

      // Clear the loading state after enrichment finishes.
      setLoadingMeta(false);
    })();

    // Mark the effect as cancelled when the dialog closes or component unmounts.
    return () => {
      cancelled = true;
    };
  }, [open, ownedNfts]);

  // Build the QR payload and ask the backend to sign the payload data.
  const handleGeneratePayload = async (nft: any) => {
    // Remove any previous payload before generating a new one.
    setPayload(null);
    // Remove previous QR image while generating a new one.
    setQrCodeDataUrl(null);
    // Close preview until we get fresh data.
    setQrPreviewOpen(false);
    // Clear any previous error so the user sees the latest attempt.
    setPayloadError(null);

    // The metadata must include an event id for the QR payload to be valid.
    if (!nft?.eventId) {
      setPayloadError("This ticket does not include an event id in metadata.");
      return;
    }
    console.log({ nft });
    // Serialize the token id as a string so the QR payload stays JSON-safe.
    const tokenId = String(nft.tokenId);
    // Serialize the event id as a string for consistency.
    const eventId = String(nft.eventId);
    console.log({ eventId: nft.eventId });
    // issuedAt records the moment the user generated the code.
    const issuedAt = new Date().toISOString();

    try {
      // Request a server-side signature for the payload fields.
      const res = await fetch("/api/access-code/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenId,
          eventId,
          issuedAt,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to sign access code payload.");
      }

      const signature = body?.signature;
      const qrImage = body?.qrCodeDataUrl;
      console.log({ qrImage });

      if (!signature) {
        throw new Error("Missing signature from backend response.");
      }
      if (!qrImage) {
        throw new Error("Missing QR code image from backend response.");
      }
      console.log({
        tokenId,
        eventId,
        issuedAt,
        signature,
      });
      // Store the QR-ready data so it can be rendered or encoded later.
      setPayload({
        tokenId,
        eventId,
        issuedAt,
        signature,
      });
      // Store the image and open the preview modal.
      setQrCodeDataUrl(qrImage);
      setQrPreviewOpen(true);
    } catch (err: any) {
      // Surface signing failures to the dialog.
      setPayloadError(err?.message ?? "Failed to sign access code payload.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-52 rounded-full bg-green-700/50 px-6 py-3 text-sm font-semibold text-green-950 backdrop-blur-sm transition duration-500 hover:bg-green-700/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base">
            Generate code
          </button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Access Code</DialogTitle>

            <DialogDescription>
              Pick a ticket to generate an access code.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {isLoading || loadingMeta ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tickets...
              </div>
            ) : error ? (
              <p className="text-sm text-red-700">Failed to load tickets.</p>
            ) : ownedNfts?.nfts?.length ? (
              <ul className="space-y-3">
                {(enriched ?? ownedNfts?.nfts).map((n) => (
                  <li
                    key={`${n.contractAddress}-${n.tokenId}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">Token #{n.tokenId}</div>

                      <div className="text-xs text-muted-foreground">
                        {n.name}
                      </div>

                      {n.description ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          {n.description}
                        </div>
                      ) : null}

                      {n.location ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          <strong>Location:</strong> {n.location}
                        </div>
                      ) : null}

                      {n.eventDate ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          <strong>Date:</strong> {n.eventDate}
                        </div>
                      ) : null}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => void handleGeneratePayload(n)}
                    >
                      Generate
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No ticket NFTs found for this wallet.
              </p>
            )}

            {payloadError ? (
              <p className="mt-3 text-sm text-red-700">{payloadError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrPreviewOpen} onOpenChange={setQrPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access QR Code</DialogTitle>
            <DialogDescription>
              Save this QR image and present it at the event entrance.
            </DialogDescription>
          </DialogHeader>

          {qrCodeDataUrl ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <img
                src={qrCodeDataUrl}
                alt="Generated access QR code"
                className="h-72 w-72 rounded-md border border-border object-contain"
              />

              <a
                href={qrCodeDataUrl}
                download={`cinder-access-${payload?.tokenId ?? "ticket"}.png`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Download QR Code
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No QR image available.
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setQrPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export the dialog so the page can render it.
export default GenerateCodeDialog;
