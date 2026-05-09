"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAccount } from "wagmi";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TicketFormState } from "@/lib/types";
import { useCreateEvent } from "@/lib/Queries/supabaseQueries";

const initialFormState: TicketFormState = {
  organizerWallet: "",
  title: "",
  description: "",
  location: "",
  startDate: "",
  name: "VIP",
  price: "",
  maxSupply: "",
  perks: "",
};

const TicketSheet = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TicketFormState>(initialFormState);
  const [ticketTypes, setTicketTypes] = useState<
    Array<{ name: string; price: string; maxSupply: string; perks: string }>
  >([]);
  const [typeLimitReached, setTypeLimitReached] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { mutateAsync: mutation, isPending } = useCreateEvent();

  useEffect(() => {
    if (isConnected && address)
      setForm((f) => ({ ...f, organizerWallet: address }));
    else setForm((f) => ({ ...f, organizerWallet: "" }));
  }, [isConnected, address]);

  const handleChange =
    (key: keyof TicketFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSubmitted(false);
      setSubmitError(null);
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(false);
    setSubmitError(null);

    if (!isConnected) {
      setSubmitError("Connect your wallet before saving the event.");
      return;
    }

    const submissionTicketTypes =
      ticketTypes.length > 0
        ? ticketTypes
        : [
            {
              name: "pass",
              price: form.price,
              maxSupply: form.maxSupply,
              perks: form.perks,
            },
          ];

    if (!submissionTicketTypes[0].price) {
      setSubmitError("Add a ticket price for the pass ticket type.");
      return;
    }

    const organizerWallet = address ?? form.organizerWallet;

    const payload = {
      event: {
        organizerWallet: organizerWallet,
        title: form.title,
        description: form.description,
        location: form.location,
        startDate: form.startDate,
      },
      ticket_types: submissionTicketTypes.map((t) => ({
        name: t.name,
        price: t.price,
        maxSupply: t.maxSupply || null,
        perks: t.perks
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      })),
    };

    try {
      setSubmitError(null);
      await mutation(payload);
      setSubmitted(true);
      setForm({ ...initialFormState, organizerWallet });
      setTicketTypes([]);
      setTypeLimitReached(false);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to save event and ticket types.");
    }
  };

  const addType = () => {
    if (!form.name || !form.price) return;
    if (ticketTypes.length >= 5) {
      setTypeLimitReached(true);
      return;
    }

    setTicketTypes((current) => [
      ...current,
      {
        name: form.name,
        price: form.price,
        maxSupply: form.maxSupply,
        perks: form.perks,
      },
    ]);
    setForm((f) => ({ ...f, name: "", price: "", maxSupply: "", perks: "" }));
    setTypeLimitReached(false);
  };

  const removeType = (index: number) => {
    setTicketTypes((current) => current.filter((_, i) => i !== index));
    setTypeLimitReached(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-52 rounded-full bg-green-700 px-6 py-3 text-sm font-bold text-white/90 cursor-pointer transition duration-500 hover:bg-green-800 sm:text-base">
          Create a Ticket
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create event ticket</SheetTitle>
          <SheetDescription>
            Create a new ticket for your event. We will handle the rest.
          </SheetDescription>
        </SheetHeader>

        <form className="flex flex-col gap-4 px-4 pb-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Create the event first, then add ticket types under it. If you skip
            custom types, a default <span className="font-medium">pass</span>{" "}
            ticket will be saved using the price below.
          </div>

          <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/60 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Event</h3>
              <p className="text-xs text-muted-foreground">
                Maps to the <span className="font-medium">events</span> table.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Organizer wallet
              <input
                value={address ?? form.organizerWallet}
                placeholder={
                  isConnected
                    ? ""
                    : "Connect wallet to autofill organizer address"
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                readOnly
                aria-readonly
              />
              {!isConnected && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                  Wallet not connected — tickets cannot be created until you
                  connect your wallet.
                </p>
              )}
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Event title
              <input
                value={form.title}
                onChange={handleChange("title")}
                placeholder="Event title"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Description
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                placeholder="What is the event about?"
                rows={4}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Location
                <input
                  value={form.location}
                  onChange={handleChange("location")}
                  placeholder="Venue or city"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Start date
                <input
                  value={form.startDate}
                  onChange={handleChange("startDate")}
                  type="datetime-local"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  required
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/60 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Ticket type
              </h3>
              <p className="text-xs text-muted-foreground">
                Ticket categories available for the event, e.g. VIP, Regular,
                Table, etc.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Ticket name
              <input
                value={form.name}
                onChange={handleChange("name")}
                placeholder="VIP, VVIP, Regular, Table"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Price
                <input
                  value={form.price}
                  onChange={handleChange("price")}
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="0.000000"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Max supply
                <input
                  value={form.maxSupply}
                  onChange={handleChange("maxSupply")}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Max supply (leave blank for unlimited)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <span className="text-xs text-muted-foreground">
                  Optional. (leave blank for unlimited).
                </span>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Perks
              <textarea
                value={form.perks}
                onChange={handleChange("perks")}
                placeholder="Lounge access, free drinks, priority entry"
                rows={4}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <span className="text-xs text-muted-foreground">
                Separate perks with commas. Saved as a text array.
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={addType}
                disabled={ticketTypes.length >= 5}
                className={`rounded-full bg-amber-400 px-4 py-2 text-sm text-amber-900 hover:bg-amber-300 ${ticketTypes.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Add type
              </Button>
              <p className="text-xs text-muted-foreground">
                Added types: {ticketTypes.length} / 5
              </p>
            </div>

            {typeLimitReached || ticketTypes.length >= 5 ? (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Maximum 5 ticket types allowed.
              </p>
            ) : null}

            {ticketTypes.length > 0 && (
              <div className="mt-3 space-y-2">
                {ticketTypes.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Price: {t.price} • Supply: {t.maxSupply}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeType(i)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {submitted && (
            <p className="rounded-lg border border-green-700/20 bg-green-700/10 px-3 py-2 text-xs text-green-900">
              Event and ticket types saved to Supabase.
            </p>
          )}

          {submitError && (
            <p className="rounded-lg border border-red-700/20 bg-red-700/10 px-3 py-2 text-xs text-red-900">
              {submitError}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={(e: any) => handleSubmit(e)}
              className="w-1/2 rounded-full bg-green-700 px-5 py-2 text-white cursor-pointer duration-500 hover:bg-green-800"
              disabled={!isConnected || isPending}
            >
              {isPending ? "Saving..." : "Create Ticket"}
            </button>
            <button
              type="button"
              className="w-1/2 py-2 border border-input cursor-pointer rounded-full px-5 duration-500 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default TicketSheet;
