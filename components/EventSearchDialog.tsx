"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Search, Ticket, MapPin, CalendarDays, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SearchEventFilters } from "@/lib/types";
import { useSearchEvents } from "@/lib/Queries/supabaseQueries";
import { cn } from "@/lib/utils";

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

  const searchQuery = useSearchEvents(submittedFilters, open && hasSearched);

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

  const events = searchQuery.data?.events ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Search events"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-green-900/20 bg-white/70 text-green-950 transition hover:bg-green-700 hover:text-white",
            buttonClassName,
          )}
        >
          <Search size={18} />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl gap-6 overflow-y-auto sm:max-w-3xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Search events</DialogTitle>
          <DialogDescription>
            Search by event title, location, or start date. Matching events will
            show their available ticket types.
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
          <div className="grid gap-4">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {event.ticket_types.map((ticket) => (
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
                        Price: {ticket.price} • Sold: {ticket.minted_count}
                      </p>
                      {ticket.perks.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Perks: {ticket.perks.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            Search by title, location, or date to discover available events and
            their ticket inventory.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventSearchDialog;
