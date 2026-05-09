"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
// wagmi imports: wallet helpers and types
import type { Connector } from "wagmi";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSignTypedData,
} from "wagmi";
// Chain metadata for Base Sepolia used when attempting network switch/add
import { baseSepolia } from "wagmi/chains";
// Utility to wait for a transaction receipt after submitting a tx
import { waitForTransactionReceipt } from "wagmi/actions";
// shadcn-imports
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import EventSearchDialog from "@/components/EventSearchDialog";

const Navbar = () => {
  // Controls whether the wallet popover is visible.
  const [isWalletPopoverOpen, setIsWalletPopoverOpen] = useState(false);
  // Controls whether to show connector picker or connected-wallet actions.
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);

  // Wagmi hooks provide current wallet session and connector actions.
  // Current connected wallet address and connection boolean.
  const { address, isConnected } = useAccount();
  // Active chain id used to route backend analysis to matching network.
  const chainId = useChainId();
  // Connector operations and loading state for wallet connection.
  const { connectAsync, connectors, isPending } = useConnect();
  // Disconnect operations and loading state for wallet disconnection.
  const {
    disconnect,
    disconnectAsync,
    isPending: isDisconnecting,
  } = useDisconnect();
  // Signing hook for ERC-2612 permit (EIP-712 typed data).
  const { signTypedDataAsync } = useSignTypedData();

  // Compact wallet label for the navbar button.
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Connect Wallet";

  /**
   * Attempt to connect using the selected wallet connector.
   * - prevents overlapping wallet actions
   * - disconnects an existing session first for a clean switch
   */
  const handleConnectorSelect = async (connector: Connector) => {
    // Prevent overlapping connect/disconnect actions.
    if (isPending || isDisconnecting) return;
    // Connection flow can be rejected by the user, so keep it in try/catch.
    try {
      // If a wallet is already connected, disconnect first to avoid mixed state.
      if (isConnected) {
        // Await disconnect completion before starting next connection.
        await disconnectAsync();
      }
      // Before connecting, if an injected provider exists, check its chain
      // and attempt to switch/add Base Sepolia so the user connects on the
      // expected network.
      try {
        // Use any injected provider (MetaMask, Brave, etc.) if available
        const injected = (window as any)?.ethereum;
        if (injected) {
          // Ask the provider for its currently selected chain id (hex string)
          const hexCurrent = await injected.request({ method: "eth_chainId" });
          // Convert the hex chain id into a numeric id for comparison
          const currentId =
            typeof hexCurrent === "string"
              ? parseInt(hexCurrent, 16)
              : undefined;
          // If the wallet is not already on Base Sepolia, attempt to switch it
          if (currentId !== baseSepolia.id) {
            // Prepare the hex chain id value required by wallet RPC methods
            const hexChainId = `0x${baseSepolia.id.toString(16)}`;
            try {
              // Request the wallet to switch to Base Sepolia
              await injected.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: hexChainId }],
              });
            } catch (switchErr: any) {
              // If the chain is not known to the wallet, providers commonly use code 4902
              const isUnknownChain =
                switchErr?.code === 4902 ||
                /Unrecognized chain/i.test(switchErr?.message ?? "");
              if (isUnknownChain) {
                // Derive a reasonable RPC URL from the chain definition (best-effort)
                const rpcUrl = ((baseSepolia as any).rpcUrls?.default
                  ?.http?.[0] ??
                  (baseSepolia as any).rpcUrls?.[0] ??
                  "") as string;
                // Ask the wallet to add Base Sepolia to the user's networks
                await injected.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: hexChainId,
                      chainName: baseSepolia.name ?? "Base Sepolia",
                      nativeCurrency: baseSepolia.nativeCurrency ?? {
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                      },
                      rpcUrls: rpcUrl ? [rpcUrl] : [],
                    },
                  ],
                });
                // After adding the chain, request a switch again
                await injected.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: hexChainId }],
                });
              } else {
                // Re-throw unexpected errors so outer catch can handle/log them
                throw switchErr;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to switch/add Base Sepolia pre-connect:", err);
        // Continue to connect anyway; wallets may still prompt to switch.
      }

      // Connect using selected connector.
      await connectAsync({ connector });
      // Reset UI to collapsed state after success.
      setShowConnectorPicker(false);
      setIsWalletPopoverOpen(false);
    } catch {
      // User may reject wallet connection.
    }
  };
  /**
   * Disconnect the current wallet and reset the popover UI.
   * Safe to call repeatedly; guards against concurrent disconnects.
   */
  const handleDisconnectWallet = () => {
    // Do not queue another disconnect while one is pending.
    if (isDisconnecting) return;
    // Disconnect current wallet session.
    disconnect();
    // Reset popover UI after disconnect.
    setIsWalletPopoverOpen(false);
    setShowConnectorPicker(false);
  };
  /**
   * Show connector picker to switch from current wallet.
   * Prevents switching while another wallet action is pending.
   */
  const handleSwitchWallet = () => {
    // Block switch while another wallet action is pending.
    if (isPending || isDisconnecting) return;
    // Open connector picker so user can choose another wallet.
    setShowConnectorPicker(true);
  };

  /**
   * Toggle the wallet popover from the navbar button. When closed,
   * sub-views (like the connector picker) are reset.
   */
  const handleWalletButtonClick = () => {
    // Show connector list when disconnected, else show connected-wallet menu.
    setShowConnectorPicker(!isConnected);
    // Open wallet popover on button click.
    setIsWalletPopoverOpen(true);
  };

  /**
   * Keep nested picker state in sync when the popover opens/closes.
   * Ensures connector picker doesn't remain visible when popover closes.
   */
  const handlePopoverOpenChange = (open: boolean) => {
    // Apply external open state from popover component.
    setIsWalletPopoverOpen(open);
    // When popover closes, also reset connector-picker sub-view.
    if (!open) {
      setShowConnectorPicker(false);
    }
  };

  return (
    <nav className="w-full md:w-10/12 lg:w-7/12 mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-green-950 font-fjallaOne tracking-widest">
          Cinder
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <EventSearchDialog buttonClassName="inline-flex" />
            <button>
              <Bell fill="green" stroke="green" size={20} />
            </button>
          </div>
          <button className="lg:hidden">
            <Bell fill="green" stroke="green" size={20} />
          </button>
          {/* for the wallet connection */}
          <Popover
            open={isWalletPopoverOpen}
            onOpenChange={handlePopoverOpenChange}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={handleWalletButtonClick}
                disabled={isPending || isDisconnecting}
                className="hidden lg:block w-32 xl:w-36 bg-green-800 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-white text-xs font-poppins p-2 rounded-md truncate"
              >
                {isConnected
                  ? shortAddress
                  : isPending
                    ? "Connecting..."
                    : "Connect Wallet"}
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-56 sm:w-64 bg-green-800/20 text-green-950"
              align="end"
            >
              {showConnectorPicker || !isConnected ? (
                <>
                  <PopoverHeader>
                    <PopoverTitle>Choose Wallet</PopoverTitle>
                    <PopoverDescription className="text-green-800/70">
                      Select the wallet you want to connect.
                    </PopoverDescription>
                  </PopoverHeader>

                  <div className="mt-2 flex flex-col gap-2 font-fjallaOne font-bold tracking-wider">
                    {connectors.map((connector: Connector) => (
                      <button
                        key={connector.uid}
                        type="button"
                        onClick={() => void handleConnectorSelect(connector)}
                        disabled={isPending || isDisconnecting}
                        className="w-full rounded-md bg-white/30 px-3 py-2 text-left text-xs font-poppins cursor-pointer hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {connector.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <PopoverHeader>
                    <PopoverTitle>Wallet Connected</PopoverTitle>
                    <PopoverDescription className="text-green-800/70 break-all">
                      {address}
                    </PopoverDescription>
                  </PopoverHeader>

                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSwitchWallet}
                      disabled={isPending || isDisconnecting}
                      className="w-full rounded-md bg-white/30 px-3 py-2 text-left text-xs font-poppins font-semibold hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Switch Wallet
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      disabled={isDisconnecting}
                      className="w-full rounded-md bg-red-500/80 px-3 py-2 text-left text-xs font-poppins text-white hover:bg-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isDisconnecting
                        ? "Disconnecting..."
                        : "Disconnect Wallet"}
                    </button>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* For mobile view */}
      <div className="mt-4 flex w-full justify-center lg:hidden">
        <EventSearchDialog buttonClassName="mt-0" />
      </div>
    </nav>
  );
};

export default Navbar;
