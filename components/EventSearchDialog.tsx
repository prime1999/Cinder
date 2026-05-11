"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import {
  Search,
  Ticket,
  MapPin,
  CalendarDays,
  Loader2,
  CheckCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  SearchEventFilters,
  SearchEventResult,
  SearchTicketType,
} from "@/lib/types";
import {
  useSearchEvents,
  useGenerateMetadata,
} from "@/lib/Queries/supabaseQueries";
import { useAccount } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
  readContract,
} from "wagmi/actions";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  USDC_ABI,
  USDC_ADDRESS,
} from "@/lib/constants";
import { parseEventLogs } from "viem";
import { config } from "@/config";

type EventSearchDialogProps = {
  buttonClassName?: string;
};

const emptyFilters: SearchEventFilters = {
  title: "",
  location: "",
  startDate: "",
};

const formatAvailability = (maxSupply: number | null, mintedCount: number) => {
  if (maxSupply === null) return "Unlimited";
  const remaining = Math.max(maxSupply - mintedCount, 0);
  return remaining === 0 ? "Sold out" : `${remaining} available`;
};

const EventSearchDialog = ({ buttonClassName }: EventSearchDialogProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<SearchEventFilters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] =
    useState<SearchEventFilters>(emptyFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [purchasingTicketId, setPurchasingTicketId] = useState<
    string | number | null
  >(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    tokenURI: string;
    ipfsHash: string;
    ticketId: string | number | null;
    txHash: string;
  } | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [failedTicketId, setFailedTicketId] = useState<string | number | null>(
    null,
  );

  const searchQuery = useSearchEvents(submittedFilters, open && hasSearched);
  const {
    mutateAsync: generateMetadataAsync,
    isPending: isGeneratingMetadata,
  } = useGenerateMetadata();
  const { address } = useAccount();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!filters.title && !filters.location && !filters.startDate) {
      setSearchError("Add a title, location, or date to search events.");
      return;
    }

    setSearchError(null);
    setSubmittedFilters(filters);
    setHasSearched(true);
  };

  const handleInputChange =
    (key: keyof SearchEventFilters) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFilters((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleBuyTicket = async (
    event: SearchEventResult,
    ticket: SearchTicketType,
  ) => {
    try {
      setPurchasingTicketId(ticket.id);
      setPurchaseError(null);
      setPurchaseResult(null);
      setFailedTicketId(null);

      // =========================
      // CHECK WALLET
      // =========================

      const buyer = address;

      if (!buyer) {
        throw new Error("Wallet not connected");
      }

      // =========================
      // GENERATE NFT METADATA
      // =========================

      const metadataResponse = await generateMetadataAsync({
        event,
        ticketType: ticket,
      });

      // token URI returned from backend/IPFS
      const tokenURI = metadataResponse.tokenURI;
      console.log({ tokenURI });

      // =========================
      // PRICE IN USDC (6 DECIMALS)
      // =========================

      const priceMicro = BigInt(Math.round(ticket.price * 1_000_000));

      // =========================
      // CHECK USDC ALLOWANCE
      // =========================

      let allowance: any = await readContract(config, {
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [buyer, CONTRACT_ADDRESS],
      });

      console.log({ priceMicro });
      console.log({ allowance });

      // =========================
      // APPROVE IF NEEDED
      // =========================

      if (allowance < priceMicro) {
        const approveTx = await writeContract(config, {
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, priceMicro],
        });

        console.log({ approveTx });

        // wait for approval confirmation
        await waitForTransactionReceipt(config, {
          hash: approveTx,
        });

        // wait + re-sync
        await new Promise((r) => setTimeout(r, 1200));

        allowance = await readContract(config, {
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: "allowance",
          args: [buyer, CONTRACT_ADDRESS],
        });
      }

      // =========================
      // MINT NFT TICKET
      // =========================

      const mintTx = await writeContract(config, {
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "mintTicket",
        args: [buyer, tokenURI, priceMicro, event.organizer_wallet],
      });
      console.log({ mintTx });

      // wait for mint confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash: mintTx,
      });

      // =========================
      // EXTRACT TOKEN ID
      // =========================

      let tokenId: any = null;

      try {
        const ticketMintedEvents = parseEventLogs({
          abi: CONTRACT_ABI as any,
          logs: receipt.logs,
          eventName: "TicketMinted",
        });

        if (ticketMintedEvents.length > 0) {
          const ticketMinted = ticketMintedEvents[0] as any;

          tokenId = ticketMinted.args?.tokenId?.toString() ?? null;
        }
      } catch (err) {
        console.warn("Failed to decode TicketMinted event", err);
      }

      // =========================
      // SAVE TO DATABASE
      // =========================

      await fetch("/api/tickets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: event.id,
          ticket_type_id: ticket.id,
          buyer_wallet: buyer,
          token_id: tokenId,
          token_uri: tokenURI,
          tx_hash: mintTx,
          is_used: false,
          minted_at: new Date().toISOString(),
        }),
      });

      setPurchaseResult({
        tokenURI,
        ipfsHash: metadataResponse.ipfsHash,
        ticketId: tokenId,
        txHash: mintTx,
      });

      setPurchasingTicketId(null);
    } catch (err: any) {
      console.error(err);

      setPurchaseError(
        err?.shortMessage || err?.message || "Failed to buy ticket",
      );

      setFailedTicketId(ticket.id);
      setPurchasingTicketId(null);
    }
  };
  const events = searchQuery.data?.events ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Search events"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-green-900/20 bg-white/70 text-green-950 transition hover:bg-green-700 hover:text-white"
        >
          <Search size={18} />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden sm:max-w-3xl lg:max-w-5xl">
        <div className="flex max-h-[calc(85vh-2rem)] flex-col gap-6 overflow-y-auto pr-2 scrollbar-green">
          <DialogHeader>
            <DialogTitle>Search events</DialogTitle>
            <DialogDescription>
              Search by event title, location, or start date. Matching events
              will show their available ticket types.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-xl border border-border bg-background/70 p-4 sm:grid-cols-3"
          >
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Title
              <input
                value={filters.title}
                onChange={handleInputChange("title")}
                placeholder="Search by title"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Location
              <input
                value={filters.location}
                onChange={handleInputChange("location")}
                placeholder="Search by location"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Start date
              <input
                value={filters.startDate}
                onChange={handleInputChange("startDate")}
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>

            <div className="sm:col-span-3 flex items-center gap-3">
              <Button
                type="submit"
                className="rounded-full bg-green-700 px-5 text-white hover:bg-green-800"
              >
                Search events
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => {
                  setFilters(emptyFilters);
                  setSubmittedFilters(emptyFilters);
                  setHasSearched(false);
                  setSearchError(null);
                  setPurchaseError(null);
                  setPurchaseResult(null);
                  setFailedTicketId(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>

          {searchError && (
            <p className="rounded-lg border border-red-700/20 bg-red-700/10 px-3 py-2 text-sm text-red-900">
              {searchError}
            </p>
          )}

          {searchQuery.isPending && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching events and ticket types...
            </div>
          )}

          {!searchQuery.isPending &&
            hasSearched &&
            events.length === 0 &&
            !searchError && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                No matching events found.
              </div>
            )}

          {!searchQuery.isPending && events.length > 0 && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2 scrollbar-green">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                      <span className="inline-flex items-center gap-1 justify-start sm:justify-end">
                        <MapPin className="h-3.5 w-3.5" /> {event.location}
                      </span>
                      <span className="inline-flex items-center gap-1 justify-start sm:justify-end">
                        <CalendarDays className="h-3.5 w-3.5" />{" "}
                        {new Date(event.start_date).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1">
                      Event capacity:{" "}
                      {formatAvailability(event.max_supply, event.minted_count)}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1">
                      {event.ticket_types.length} ticket type
                      {event.ticket_types.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-4 max-h-64 overflow-y-auto pr-2 scrollbar-green">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {event.ticket_types.map((ticket) => {
                        const isSoldOut =
                          ticket.max_supply !== null &&
                          ticket.max_supply - ticket.minted_count <= 0;
                        const activePurchaseResult =
                          purchaseResult?.ticketId === ticket.id
                            ? purchaseResult
                            : null;

                        return (
                          <div
                            key={ticket.id}
                            className="rounded-xl border border-border bg-muted/20 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Ticket className="h-4 w-4 text-green-700" />
                                <h4 className="font-medium text-foreground">
                                  {ticket.name}
                                </h4>
                              </div>
                              <span className="text-xs font-semibold text-green-800">
                                {formatAvailability(
                                  ticket.max_supply,
                                  ticket.minted_count,
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Price: {ticket.price} • Sold:{" "}
                              {ticket.minted_count}
                            </p>

                            <p className="mt-2 text-xs text-muted-foreground">
                              Perks: {ticket.perks}
                            </p>
                            <button
                              onClick={() => handleBuyTicket(event, ticket)}
                              disabled={
                                isSoldOut ||
                                isGeneratingMetadata ||
                                purchasingTicketId === ticket.id
                              }
                              className="mt-4 rounded-full px-4 py-2 font-poppins font-semibold text-xs bg-green-700 text-white cursor-pointer hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {purchasingTicketId === ticket.id &&
                              isGeneratingMetadata ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Processing...
                                </>
                              ) : isSoldOut ? (
                                "Sold Out"
                              ) : (
                                "Buy Ticket"
                              )}
                            </button>

                            {purchaseError && failedTicketId === ticket.id && (
                              <div className="mt-3 rounded-lg border border-red-700/20 bg-red-700/10 px-3 py-2 text-sm text-red-900">
                                {purchaseError}
                              </div>
                            )}

                            {activePurchaseResult && (
                              <div className="mt-3 rounded-lg border border-green-700/20 bg-green-700/10 px-3 py-3 flex items-start gap-2">
                                <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-green-700" />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <p className="text-sm text-green-900 font-semibold">
                                    ✓ Ticket minted successfully!
                                  </p>
                                  <div className="text-xs text-green-800 space-y-1">
                                    {activePurchaseResult.ticketId && (
                                      <p>
                                        <span className="font-medium">
                                          Token ID:
                                        </span>{" "}
                                        {activePurchaseResult.ticketId}
                                      </p>
                                    )}
                                    <p>
                                      <span className="font-medium">
                                        Tx Hash:
                                      </span>{" "}
                                      <span className="font-mono truncate">
                                        {activePurchaseResult.txHash.slice(
                                          0,
                                          16,
                                        )}
                                        ...
                                        {activePurchaseResult.txHash.slice(-8)}
                                      </span>
                                    </p>
                                    <p className="wrap-break-word">
                                      <span className="font-medium">
                                        Token URI:
                                      </span>{" "}
                                      <span className="font-mono text-xs">
                                        {activePurchaseResult.tokenURI.length >
                                        50
                                          ? `${activePurchaseResult.tokenURI.slice(0, 50)}...`
                                          : activePurchaseResult.tokenURI}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasSearched && (
            <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Search by title, location, or date to discover available events
              and their ticket inventory.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventSearchDialog;
