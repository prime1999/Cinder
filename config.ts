"use client";

import { http, createConfig } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

// Central wagmi runtime config used by wallet hooks and contract actions.
export const config = createConfig({
  // Support both default Sepolia and Base Sepolia networks.
  chains: [sepolia, baseSepolia],
  // Allow injected wallets and Coinbase Wallet connector.
  connectors: [injected(), coinbaseWallet({ appName: "Cinder" })],
  transports: {
    // Default RPC for Sepolia.
    [sepolia.id]: http(),
    // Explicit RPC for Base Sepolia used by contract interactions.
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});
