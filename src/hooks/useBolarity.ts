import { SupportChain } from "@/config";
import { useCallback, useEffect, useMemo } from "react";
import { isConnectedAtom, walletAtom } from "./atoms";
import { useAtom } from "jotai";

export const useBolarity = () => {
  const [isConnected, setIsConnected] = useAtom(isConnectedAtom);
  const [wallet, setWallet] = useAtom(walletAtom);

  const connectWallet = useCallback(({
    chain,
    address,
    disconnect,
  }: {
    chain: SupportChain;
    address: string;
    disconnect: () => void;
  }) => {
    switch (chain) {
      case SupportChain.Solana:
        setWallet({ chain, address, evmAddress: '', disconnect });
        setIsConnected(true);
        break;
      case SupportChain.Ethereum:
        setWallet({ chain, address: '', evmAddress: address, disconnect });
        setIsConnected(true);
        break;
    }
  }, [setIsConnected, setWallet]);

  const disconnectWallet = useCallback(() => {
    wallet?.disconnect();
    setWallet({
      chain: null,
      address: '',
      evmAddress: '',
      disconnect: () => { },
    });
    setIsConnected(false);
  }, [wallet, setWallet, setIsConnected]);

  const updateWalletAddress = useCallback(({ chain, address }: { chain: SupportChain, address: string }) => {
    switch (chain) {
      case SupportChain.Solana:
        setWallet({ ...wallet, address });
        break;
      case SupportChain.Ethereum:
        setWallet({ ...wallet, evmAddress: address });
        break;
    }
  }, [wallet, setWallet]);

  return useMemo(() => ({
    isConnected,
    wallet,
    connectWallet,
    disconnectWallet,
    updateWalletAddress,
  }), [isConnected, wallet, connectWallet, disconnectWallet, updateWalletAddress]);
}