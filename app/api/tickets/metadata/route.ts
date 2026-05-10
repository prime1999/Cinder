import { NextRequest, NextResponse } from "next/server";
import type { TokenMetadata, GenerateMetadataRequest } from "@/lib/types";
import { uploadMetadataToIPFS } from "@/lib/pinata";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateMetadataRequest = await req.json();
    const { event, ticketType } = body;

    if (!event || !ticketType) {
      return NextResponse.json(
        { error: "Missing event or ticket type data" },
        { status: 400 },
      );
    }

    // Generate token metadata
    const metadata: TokenMetadata = {
      name: `${event.title} - ${ticketType.name}`,
      description: `A ticket for ${event.title} event. ${event.description}`,
      attributes: [
        { trait_type: "Event", value: event.title },
        { trait_type: "Ticket Type", value: ticketType.name },
        { trait_type: "Location", value: event.location },
        {
          trait_type: "Event Date",
          value: new Date(event.start_date).toISOString(),
        },
        { trait_type: "Price", value: ticketType.price },
        { trait_type: "Perks", value: ticketType.perks },
      ],
      image:
        "https://gateway.pinata.cloud/ipfs/bafybeihm6vysvroh4dknagt6xxts56p2ninqyjjd4u75lipatqo5xdgxai",
      event_id: event.id,
      ticket_type_id: ticketType.id,
      price: ticketType.price,
      issuer: event.organizer_wallet,
    };

    // Upload metadata to IPFS via Pinata
    const { ipfsHash, tokenURI } = await uploadMetadataToIPFS(metadata);

    const cid = tokenURI.replace("ipfs://", "");
    // return `${gateway}/ipfs/${cid}`;

    return NextResponse.json({
      success: true,
      tokenURI: `https://coral-added-salamander-278.mypinata.cloud/ipfs/${cid}`,
      ipfsHash,
      metadata,
    });
  } catch (error) {
    console.error("Error generating or uploading metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate and upload metadata",
      },
      { status: 500 },
    );
  }
}
