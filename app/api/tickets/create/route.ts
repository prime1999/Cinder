import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/config/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      event_id,
      ticket_type_id,
      buyer_wallet,
      token_id,
      token_uri,
      tx_hash,
      is_used,
      minted_at,
    } = body;

    if (!event_id || !buyer_wallet || !tx_hash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Insert ticket record
    const insertPayload: any = {
      event_id,
      ticket_type_id,
      buyer_wallet,
      token_uri,
      tx_hash,
      is_used: is_used ?? false,
      minted_at: minted_at ?? new Date().toISOString(),
    };

    if (token_id !== undefined && token_id !== null)
      insertPayload.token_id = token_id;

    const { data: ticketData, error: ticketError } = await supabase
      .from("CINDER_Ticket_Schema")
      .insert(insertPayload)
      .select("id")
      .single();

    if (ticketError) {
      console.error("Failed to insert ticket:", ticketError);
      return NextResponse.json(
        { error: ticketError.message ?? "Failed to insert ticket" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { success: true, ticket_id: ticketData.id },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Error in create ticket route:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
