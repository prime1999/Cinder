export type TicketFormState = {
  organizerWallet: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  name: string;
  price: string;
  maxSupply: string;
  perks: string;
};

export type CreateEventPayload = {
  event: {
    organizerWallet: string;
    title: string;
    description: string;
    location: string;
    startDate: string;
  };
  ticket_types: Array<{
    name: string;
    price: string;
    maxSupply: string | null;
    perks: string;
  }>;
};

export type SearchEventFilters = {
  title: string;
  location: string;
  startDate: string;
};

export type SearchTicketType = {
  id: string | number;
  event_id: string | number;
  name: string;
  price: number;
  max_supply: number | null;
  minted_count: number;
  perks: string;
};

export type SearchEventResult = {
  id: string | number;
  organizer_wallet: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  max_supply: number | null;
  minted_count: number;
  ticket_types: SearchTicketType[];
};

export type SearchEventsResponse = {
  events: SearchEventResult[];
};

export type EventRow = {
  id: string | number;
  organizer_wallet: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  max_supply: number | null;
  minted_count: number;
};

export type TicketTypeRow = {
  id: string | number;
  event_id: string | number;
  name: string;
  price: number;
  max_supply: number | null;
  minted_count: number;
  perks: string;
};

export type TokenMetadata = {
  name: string;
  description: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  event_id: string | number;
  ticket_type_id: string | number;
  price: number;
  issuer: string;
};

export type GenerateMetadataRequest = {
  event: SearchEventResult;
  ticketType: SearchTicketType;
};

export type MetadataUploadResponse = {
  tokenURI: string;
  ipfsHash: string;
};
