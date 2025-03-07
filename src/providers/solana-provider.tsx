"use client";
import React from "react";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider
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
import { ReactNode, useCallback, useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletConnectButton } from "@/components/widgets/connect-button";
import { useWidgetsProvider } from "./widgets-provider";

export const SolanaConnectModal = ({
  open = false,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}) => {
  const { wallets, select, connect } = useWallet();

  const { setIconUrl } = useWidgetsProvider()
  const handleConnect = (walletName: WalletName, icon: string) => {
    setIconUrl(icon)
    select(walletName);
    onConnected();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px] md:max-w-sm p-6 border-0 bg-theme-light dark:bg-darkmode-theme-light">
        <DialogHeader>
          <DialogTitle asChild>
            <h2 className="text-xl">Connect Wallet</h2>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 py-4">
              {wallets?.map((wallet) => (
                <WalletConnectButton
                  key={wallet.adapter.name}
                  name={wallet.adapter.name}
                  iconUrl={wallet.adapter.icon}
                  onConnectRequest={() => handleConnect(wallet.adapter.name, wallet.adapter.icon)}
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
  const endpoint = `${process.env.NEXT_PUBLIC_RPC_URL}`;

  const onError = useCallback((error: WalletError) => {
    console.error(error);
  }, []);

  const network = WalletAdapterNetwork.Devnet;
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [network]
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
