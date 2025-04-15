"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { wagmiConfig } from "@/config/wagmi";
import { sepolia } from "wagmi/chains";
import { State, switchChain } from "@wagmi/core";
import { useEffect, useCallback } from "react";
import {
  WagmiProvider,
  useConnect,
  useConnectors,
  useAccount as useEvmAccount,
  useDisconnect as useDisconnectEvm,
} from "wagmi";
import { WalletConnectButton } from "@/components/widgets/connect-button";
import { toast } from "sonner";
import { useWidgetsProvider } from "./widgets-provider";

// Hook: 获取支持的 EVM 连接器
export const useEvmConnectors = () => {
  return useConnectors().filter((connector) => connector.id !== "injected");
};

// Hook: 处理 EVM 钱包连接
export const useConnectEvm = () => {
  const { error, ...connectProps } = useConnect();

  useEffect(() => {
    if (error) {
      console.error("Wallet connection declined:", error.message);
      toast.error("Wallet connection declined.");
    }
  }, [error]);

  return connectProps;
};

// 组件: EVM 连接模态框
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
  const { chain, isConnected } = useEvmAccount();
  const { disconnectAsync } = useDisconnectEvm();
  const { setIconUrl } = useWidgetsProvider();

  // 切换到指定网络（sepolia）
  const ensureCorrectChain = useCallback(async () => {
    if (isConnected && chain?.id !== sepolia.id) {
      try {
        await switchChain(wagmiConfig, { chainId: sepolia.id });
      } catch (err: any) {
        console.error("Failed to switch network:", err);
        toast.error("Failed to switch network: " + err.message);
      }
    }
  }, [isConnected, chain?.id]);

  useEffect(() => {
    ensureCorrectChain();
  }, [ensureCorrectChain]);

  // 处理连接逻辑
  const handleConnect = useCallback(
    async (connector: any) => {
      try {
        await disconnectAsync();
        const res = await connectAsync({ connector });
        if (res.accounts.length === 0) {
          toast.error("Please enable Ethereum account in your wallet.");
          console.error("No accounts found in the wallet.");
          return;
        }
        const address = res.accounts[0];
        onConnected(address, disconnectAsync);
        console.log("connector.icon---", connector.icon);
        setIconUrl(connector.icon);
      } catch (err: any) {
        console.error("Connection error:", err);
        toast.error("Failed to connect: " + err.message);
      }
    },
    [disconnectAsync, connectAsync, onConnected]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[350px] md:max-w-sm p-6 border-0 bg-theme-light dark:bg-darkmode-theme-light">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="text-xl">Connect Wallet</div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-3 py-4">
              {connectors.map((connector) => (
                <WalletConnectButton
                  key={connector.id}
                  name={connector.name}
                  iconUrl={connector.icon}
                  connected={connector.id === connector?.id}
                  onConnectRequest={() => handleConnect(connector)}
                />
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

type Props = {
  children: React.ReactNode;
  initialState?: State | undefined;
};
// 组件: EVM Provider
export const EvmProvider = ({ initialState, children }: Props) => {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
};
