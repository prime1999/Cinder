import { getSupabaseAdminClient } from "@/lib/supabase/config/client";
import { EventRow, TicketTypeRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim() ?? "";
  const location = url.searchParams.get("location")?.trim() ?? "";
  const startDate = url.searchParams.get("startDate")?.trim() ?? "";

  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("CINDER_Events_Schema")
    .select(
      "id, organizer_wallet, title, description, location, start_date, max_supply, minted_count",
    )
    .order("start_date", { ascending: true })
    .limit(30);

  if (title) {
    query = query.ilike("title", `%${title}%`);
  }

  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  if (startDate) {
    const parsedDay = new Date(`${startDate}T00:00:00`);

    if (Number.isNaN(parsedDay.getTime())) {
      return Response.json(
        { error: "Invalid start date filter." },
        { status: 400 },
      );
    }

    const nextDay = new Date(parsedDay);
    nextDay.setDate(nextDay.getDate() + 1);

    query = query
      .gte("start_date", parsedDay.toISOString())
      .lt("start_date", nextDay.toISOString());
  }

  const { data: events, error: eventError } = await query;

  if (eventError) {
    return Response.json({ error: eventError.message }, { status: 500 });
  }

  const eventRows = (events ?? []) as EventRow[];

  if (eventRows.length === 0) {
    return Response.json({ events: [] }, { status: 200 });
  }

  const eventIds = eventRows.map((event) => event.id);
  const { data: ticketTypes, error: ticketTypeError } = await supabase
    .from("CINDER_Ticket_Type_Schema")
    .select("id, event_id, name, price, max_supply, minted_count, perks")
    .in("event_id", eventIds);

  if (ticketTypeError) {
    return Response.json({ error: ticketTypeError.message }, { status: 500 });
  }

  const ticketTypeRows = (ticketTypes ?? []) as TicketTypeRow[];
  const groupedTicketTypes = ticketTypeRows.reduce<
    Record<string, TicketTypeRow[]>
  >((acc, ticketType) => {
    const key = String(ticketType.event_id);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ticketType);
    return acc;
  }, {});

  const responseEvents = eventRows.map((event) => ({
    ...event,
    ticket_types: groupedTicketTypes[String(event.id)] ?? [],
  }));

  return Response.json({ events: responseEvents }, { status: 200 });
}
