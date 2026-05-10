import { PinataSDK } from "pinata-web3";
import type { TokenMetadata } from "./types";

const pinata = new PinataSDK({
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
  pinataJwt: process.env.PINATA_JWT,
});

export async function uploadMetadataToIPFS(
  metadata: TokenMetadata,
): Promise<{ ipfsHash: string; tokenURI: string }> {
  if (!process.env.PINATA_JWT) {
    throw new Error("PINATA_JWT is not configured in environment variables");
  }

  if (!process.env.NEXT_PUBLIC_PINATA_GATEWAY) {
    throw new Error(
      "NEXT_PUBLIC_PINATA_GATEWAY is not configured in environment variables",
    );
  }

  try {
    const file = new File([JSON.stringify(metadata)], "metadata.json", {
      type: "application/json",
    });

    const upload = await pinata.upload.file(file);

    const ipfsHash = upload.IpfsHash;
    const tokenURI = `ipfs://${ipfsHash}`;
    console.log({ ipfsHash, tokenURI });
    return { ipfsHash, tokenURI };
  } catch (error) {
    console.error("Failed to upload metadata to IPFS:", error);
    throw new Error("Failed to upload metadata to IPFS");
  }
}
