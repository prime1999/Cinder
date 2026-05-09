"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  CreateEventPayload,
  SearchEventFilters,
  SearchEventsResponse,
} from "../types";

/**
 * useCreateEvent
 * React Query mutation that sends an event + ticket types payload to
 * the server route at `/api/events`.
 *
 * Usage:
 * const mutation = useCreateEvent();
 * mutation.mutate(payload, { onSuccess(){}, onError(){} });
 */
export const useCreateEvent = () => {
  const createEventFn = async (payload: CreateEventPayload) => {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(body?.error ?? "Failed to create event");
    }

    return body;
  };

  return useMutation<any, Error, CreateEventPayload>({
    mutationFn: createEventFn,
  });
};

export const useSearchEvents = (
  filters: SearchEventFilters,
  enabled: boolean,
) => {
  return useQuery<SearchEventsResponse, Error>({
    queryKey: [
      "search-events",
      filters.title,
      filters.location,
      filters.startDate,
    ],
    enabled,
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (filters.title) searchParams.set("title", filters.title);
      if (filters.location) searchParams.set("location", filters.location);
      if (filters.startDate) searchParams.set("startDate", filters.startDate);

      const res = await fetch(`/api/events/search?${searchParams.toString()}`);
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to search events");
      }

      return body as SearchEventsResponse;
    },
  });
};
