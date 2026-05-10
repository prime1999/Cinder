"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  CreateEventPayload,
  SearchEventFilters,
  SearchEventsResponse,
  GenerateMetadataRequest,
  MetadataUploadResponse,
  OwnedContractNftsResponse,
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
  console.log({ filters });
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
      console.log({ res, body });

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to search events");
      }

      return body as SearchEventsResponse;
    },
  });
};

export const useGenerateMetadata = () => {
  const generateMetadataFn = async (payload: GenerateMetadataRequest) => {
    const res = await fetch("/api/tickets/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(body?.error ?? "Failed to generate metadata");
    }

    return body as MetadataUploadResponse;
  };

  return useMutation<MetadataUploadResponse, Error, GenerateMetadataRequest>({
    mutationFn: generateMetadataFn,
  });
};

export const useOwnedContractNfts = (
  address: string | undefined,
  enabled: boolean,
) => {
  return useQuery<OwnedContractNftsResponse, Error>({
    queryKey: ["owned-contract-nfts", address],
    enabled: enabled && Boolean(address),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (address) searchParams.set("address", address);

      const res = await fetch(`/api/nfts?${searchParams.toString()}`);
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to load wallet NFTs");
      }

      return body as OwnedContractNftsResponse;
    },
  });
};
