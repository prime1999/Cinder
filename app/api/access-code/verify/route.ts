import { NextRequest, NextResponse } from "next/server";
import { recoverTypedDataAddress } from "viem";
import { getSupabaseAdminClient } from "@/lib/supabase/config/client";

export const runtime = "nodejs";

type VerifyRequestBody = {
  tokenId?: string;
  eventId?: string;
  issuedAt?: string;
  signature?: string;
  signerAddress?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: VerifyRequestBody = await req.json();
    const { tokenId, eventId, issuedAt, signature } = body;
    console.log({ tokenId, eventId, issuedAt, signature });

    // Validate that all required fields are present.
    if (!tokenId || !eventId || !issuedAt || !signature) {
      return NextResponse.json(
        { error: "Missing required verification parameters" },
        { status: 400 },
      );
    }

    // Get the Supabase admin client for database access.
    const supabase = getSupabaseAdminClient();

    // Fetch the ticket from the database by token_id.
    const { data: ticket, error: ticketError } = await supabase
      .from("CINDER_Ticket_Schema")
      .select("*")
      .eq("token_id", tokenId)
      .single();

    // If the ticket is not found, return an error.
    if (ticketError) {
      console.error("Ticket lookup failed:", ticketError);
      return NextResponse.json(
        { error: "Ticket not found or invalid token ID" },
        { status: 404 },
      );
    }
    console.log({ eventId: parseInt(eventId), ticketEventId: ticket.event_id });
    // Verify the ticket belongs to the specified event.
    if (ticket.event_id !== eventId) {
      return NextResponse.json(
        { error: "Ticket does not belong to this event" },
        { status: 403 },
      );
    }
    console.log({ ticket });
    // Check if the ticket has already been used.
    if (ticket.is_used) {
      // Reject verification if the ticket has already been verified.
      return NextResponse.json(
        {
          error: "Ticket already verified",
          message:
            "This ticket has already been used. Each ticket can only be used once.",
        },
        { status: 403 },
      );
    }

    // Mark the ticket as used and record the verification timestamp.
    const { error: updateError } = await supabase
      .from("CINDER_Ticket_Schema")
      .update({
        is_used: true,
      })
      .eq("id", ticket.id);

    // If the update fails, return an error.
    if (updateError) {
      console.error("Failed to mark ticket as used:", updateError);
      return NextResponse.json(
        { error: "Failed to process ticket verification" },
        { status: 500 },
      );
    }

    // Return success with ticket information.
    return NextResponse.json(
      {
        success: true,
        message: "Ticket verified and marked as used",
        ticketInfo: {
          eventId: ticket.event_id,
          tokenId: ticket.token_id,
          buyer_wallet: ticket.buyer_wallet,
          used: true,
          usedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Failed to verify access code:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to verify access code" },
      { status: 500 },
    );
  }
}
