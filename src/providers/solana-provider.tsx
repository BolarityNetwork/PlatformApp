"use client";

import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletError, WalletName } from "@solana/wallet-adapter-base";
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  toWalletAdapterNetwork,
  useCluster,
} from "@/providers/cluster-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletConnectButton } from "@/components/widgets/connect-button";
import { PhantomWalletName } from "@solana/wallet-adapter-phantom";

export const SolanaConnectModal = ({
  open = false,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (address: string, disconnect: () => void) => void;
}) => {
  const { wallets, select, connect } = useWallet();
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    setDisabled(false);
  }, []);

  const handleConnect = useCallback(
    async (walletName: WalletName) => {
      await select(walletName);
      await connect();
      onConnected("", () => {});
    },
    [connect, onConnected, select]
  );

  useEffect(() => {
    select(PhantomWalletName);
  }, [select])

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
                  onConnectRequest={() => handleConnect(wallet.adapter.name)}
                  disabled={disabled}
                />
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export const SolanaProvider = (props: PropsWithChildren) => {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => cluster.endpoint, [cluster]);

  const wallets = useMemo(
    () => [
      // new PhantomWalletAdapter({
      //   network: toWalletAdapterNetwork(cluster.network),
      // }),
      // new BitgetWalletAdapter({
      //   network: toWalletAdapterNetwork(cluster.network),
      // }),
      new SolflareWalletAdapter({
        network: toWalletAdapterNetwork(cluster.network),
      }),
    ],
    [cluster]
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={false}>
        {props.children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
