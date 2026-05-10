import { getSupabaseAdminClient } from "@/lib/supabase/config/client";
import { CreateEventPayload } from "@/lib/types";

const MAX_TICKET_TYPES = 5;

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Read and parse the request body.
  let payload: CreateEventPayload;

  try {
    // Convert the incoming JSON into the typed payload structure.
    payload = (await request.json()) as CreateEventPayload;
  } catch (error) {
    console.log("Error parsing JSON:", error);
    // Reject requests that are not valid JSON.
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // Make sure the payload has an event object and a ticket type array.
  if (!payload?.event || !Array.isArray(payload.ticket_types)) {
    return Response.json(
      { error: "Event and ticket types are required." },
      { status: 400 },
    );
  }

  // Extract the event data so the checks below are easier to read.
  const event = payload.event;

  // Reject the request if any required event field is missing.
  if (
    !event.organizerWallet ||
    !event.title ||
    !event.location ||
    !event.startDate
  ) {
    return Response.json(
      {
        error:
          "Event title, location, start date, and organizer wallet are required.",
      },
      { status: 400 },
    );
  }

  // Enforce the five-ticket limit on the server as well as in the UI.
  if (payload.ticket_types.length > MAX_TICKET_TYPES) {
    return Response.json(
      { error: "Maximum 5 ticket types allowed." },
      { status: 400 },
    );
  }

  // Create the privileged Supabase client used only on the server.
  const supabase = getSupabaseAdminClient();

  // Calculate the total max_supply by summing all non-null ticket type supplies.
  let totalMaxSupply: number | null = null;
  for (const ticketType of payload.ticket_types) {
    // Only count ticket types that have a max supply defined.
    if (ticketType.maxSupply !== null && ticketType.maxSupply !== "") {
      // Add this ticket type's supply to the running total.
      totalMaxSupply = (totalMaxSupply ?? 0) + Number(ticketType.maxSupply);
    }
  }
  // Insert the parent event row first so we can capture its generated id.
  const { data: eventRow, error: eventError } = await supabase
    .from("CINDER_Event_Schema")
    .insert({
      organizer_wallet: event.organizerWallet,
      title: event.title,
      description: event.description,
      location: event.location,
      start_date: event.startDate,
      max_supply: totalMaxSupply,
      minted_count: 0,
    })
    .select("id")
    .single();

  if (eventError || !eventRow?.id) {
    console.log({ eventError });
    return Response.json(
      { error: eventError?.message ?? "Failed to save event." },
      { status: 500 },
    );
  }

  // Track the inserted ticket-type ids for the response.
  const ticketTypeIds: Array<string | number> = [];

  // Insert each ticket type with the event id returned above.
  for (const ticketType of payload.ticket_types) {
    // Convert the submitted price string into a numeric value.
    const price = Number(ticketType.price);
    // Treat an empty max supply as null so the database stores no limit.
    const maxSupply =
      ticketType.maxSupply === null || ticketType.maxSupply === ""
        ? null
        : Number(ticketType.maxSupply);

    // Reject invalid price values and invalid max supply values.
    if (
      !Number.isFinite(price) ||
      (maxSupply !== null && (!Number.isFinite(maxSupply) || maxSupply < 1))
    ) {
      return Response.json(
        {
          error:
            "Each ticket type must have a valid price. Max supply can be blank or a positive number.",
        },
        { status: 400 },
      );
    }

    // Insert the child row with event_id so it belongs to the saved event.
    const { data: ticketTypeRow, error: ticketTypeError } = await supabase
      .from("CINDER_Ticket_Type_Schema")
      .insert({
        event_id: eventRow.id,
        name: ticketType.name,
        price,
        max_supply: maxSupply,
        minted_count: 0,
        perks: ticketType.perks,
      })
      .select("id")
      .single();

    if (ticketTypeError || !ticketTypeRow?.id) {
      return Response.json(
        {
          error:
            ticketTypeError?.message ??
            "Failed to save one of the ticket types.",
          event_id: eventRow.id,
        },
        { status: 500 },
      );
    }

    ticketTypeIds.push(ticketTypeRow.id);
  }

  return Response.json(
    {
      message: "Event and ticket types saved.",
      event_id: eventRow.id,
      ticket_type_ids: ticketTypeIds,
    },
    { status: 201 },
  );
}
