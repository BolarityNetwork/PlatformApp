"use client";
import {
  AnchorWallet,
  ConnectionProvider,
  useConnection,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletAdapterNetwork,
  WalletError,
  WalletName,
} from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
require("@solana/wallet-adapter-react-ui/styles.css");

import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useCallback, useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletConnectButton } from "@/components/widgets/connect-button";
import { useWidgetsProvider } from "./widgets-provider";
import { AnchorProvider } from "@coral-xyz/anchor";

export const SolanaConnectModal = ({
  open = false,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}) => {
  const { wallets, select } = useWallet();

  const { setIconUrl } = useWidgetsProvider();
  const handleConnect = (walletName: WalletName, icon: string) => {
    setIconUrl(icon);
    select(walletName);
    onConnected();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px] md:max-w-sm p-6 border-0 bg-theme-light dark:bg-darkmode-theme-light">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="text-xl">Connect Wallet</div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 py-4">
              {wallets?.map((wallet) => (
                <WalletConnectButton
                  key={wallet.adapter.name}
                  name={wallet.adapter.name}
                  iconUrl={wallet.adapter.icon}
                  onConnectRequest={() =>
                    handleConnect(wallet.adapter.name, wallet.adapter.icon)
                  }
                  // disabled={disabled}
                />
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  // HTTP endpoint for regular RPC calls
  const endpoint = `${process.env.NEXT_PUBLIC_RPC_URL}`;
  // WebSocket endpoint for subscription-based updates
  const wsEndpoint = `${process.env.NEXT_PUBLIC_SOL_RPC_WSS}`;
  // const wsEndpoint = "wss://devnet.helius-rpc.com/?api-key=123";

  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
  }, []);

  const network = WalletAdapterNetwork.Devnet;

  // Memoize wallets to prevent unnecessary re-renders
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [network]
  );

  // Connection configuration with WebSocket support
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed",
      wsEndpoint: wsEndpoint,
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000, // 60 seconds
    }),
    [wsEndpoint]
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      {/* <RpcContextProvider> */}
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
      {/* </RpcContextProvider> */}
    </ConnectionProvider>
  );
}

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return new AnchorProvider(connection, wallet as AnchorWallet, {
    commitment: "confirmed",
  });
}
