"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { wagmiConfig } from "@/config/wagmi";
import { sepolia } from 'wagmi/chains'
import { switchChain } from '@wagmi/core'
import { useEffect, useMemo, type PropsWithChildren } from "react";
import {
  WagmiProvider,
  useConnect,
  useConnectors,
  useAccount as useEvmAccount,
  useDisconnect as useDisconnectEvm,
} from "wagmi";
import { WalletConnectButton } from "@/components/widgets/connect-button";
import { toast } from "sonner";

export const useEvmConnectors = () =>
  useConnectors().filter((connector) => connector.id !== "injected");

export const useConnectEvm = () => {
  const base = useConnect();

  useEffect(() => {
    if (base.error !== null) {
      console.error("Wallet connection declined");
    }
  }, [base.error]);

  return base;
};

export const EvmConnectModal = ({
  open = false,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (address: string, disconnect: () => void) => void;
}) => {
  const connectors = useEvmConnectors();
  const { connectAsync } = useConnectEvm();
  const { connector, chain, isConnected } = useEvmAccount();
  const { disconnectAsync } = useDisconnectEvm();

  useMemo(() => {
    if (isConnected && chain?.id !== sepolia.id) {      
      switchChain(wagmiConfig, { chainId: sepolia.id }).catch((err) => {
        toast.error("Failed to switch network:", err.message);
      });
    }
  }, [isConnected, chain?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px] md:max-w-sm p-6 border-0 bg-theme-light dark:bg-darkmode-theme-light">
        <DialogHeader>
          <DialogTitle asChild>
            <h2 className="text-xl">Connect Wallet</h2>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 py-4">
              {connectors.map((x) => (
                <WalletConnectButton
                  key={x.uid}
                  name={x.name}
                  iconUrl={x.icon}
                  connected={x.id === connector?.id}
                  onConnectRequest={async () => {
                    await disconnectAsync();
                    const res = await connectAsync({ connector: x });
                    if (res.accounts.length === 0) {
                      console.error(
                        "Please enable ethereum account in your wallet."
                      );
                    } else {
                      const address = res.accounts[0].toString();
                      onConnected(address, disconnectAsync);
                    }
                  }}
                />
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export const EvmProvider = (props: PropsWithChildren) => {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      {props.children}
    </WagmiProvider>
  );
};
