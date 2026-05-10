import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type AlchemyOwnedNft = {
  tokenId?: string;
  name?: string;
  tokenType?: string;
  contract?: { address?: string };
  contractAddress?: string;
  image?: { originalUrl?: string; cachedUrl?: string };
  media?: Array<{ gateway?: string }>;
  raw?: { metadata?: Record<string, unknown> };
  rawMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tokenUri?: string;
};

const getAlchemyUrl = (address: string, pageKey?: string) => {
  const baseUrl = process.env.ALCHEMY_NFT_URL;

  if (!baseUrl) {
    throw new Error("ALCHEMY_NFT_URL is not configured");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("owner", address);
  url.searchParams.set("withMetadata", "true");
  url.searchParams.set("pageSize", "100");

  if (pageKey) {
    url.searchParams.set("pageKey", pageKey);
  }

  return url.toString();
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address")?.trim();

    if (!address) {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Missing contract address configuration" },
        { status: 500 },
      );
    }

    const contractAddressLower = contractAddress.toLowerCase();
    const ownedNfts: AlchemyOwnedNft[] = [];
    let pageKey: string | undefined;

    do {
      const alchemyResponse = await fetch(getAlchemyUrl(address, pageKey), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const alchemyBody = await alchemyResponse.json().catch(() => null);

      if (!alchemyResponse.ok) {
        throw new Error(
          alchemyBody?.error?.message ??
            alchemyBody?.message ??
            "Failed to fetch NFTs from Alchemy",
        );
      }

      const pageNfts: AlchemyOwnedNft[] = Array.isArray(alchemyBody?.ownedNfts)
        ? alchemyBody.ownedNfts
        : Array.isArray(alchemyBody?.nfts)
          ? alchemyBody.nfts
          : [];

      ownedNfts.push(...pageNfts);
      pageKey = alchemyBody?.pageKey ?? undefined;
    } while (pageKey);

    const filtered = ownedNfts.filter((nft) => {
      const nftContractAddress =
        nft.contract?.address ?? nft.contractAddress ?? "";

      return nftContractAddress.toLowerCase() === contractAddressLower;
    });
    console.log({ ownedNfts });

    return NextResponse.json({
      nfts: filtered.map((nft) => ({
        tokenId: nft.tokenId ?? "",
        name: nft.name ?? "Untitled NFT",
        contractAddress:
          nft.contract?.address ?? nft.contractAddress ?? contractAddress,
        tokenType: nft.tokenType ?? "unknown",
        imageUrl:
          nft.image?.originalUrl ??
          nft.image?.cachedUrl ??
          nft.media?.[0]?.gateway ??
          "",
        tokenUri: nft.tokenUri ?? "",
      })),
      count: filtered.length,
    });
  } catch (err: any) {
    console.error("Error fetching wallet NFTs:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
