"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { SupportChain } from "@/config";
import { useAccount as useEvmAccount } from "wagmi";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";

interface BolarityWalletProviderContextType {
  evmAddress: string;
  solAddress: string;
  ChainType: SupportChain | null;
  setSolAddress: (address: string) => void;
  setEvmAddress: (address: string) => void;
  setChainType: (address: SupportChain | null) => void;
  SolRefreshProxyAddress: () => void;
  EvmRefreshProxyAddress: () => void;
}

const BolarityWalletProviderContext =
  createContext<BolarityWalletProviderContextType>({
    evmAddress: "",
    solAddress: "",
    ChainType: null,
    setSolAddress: () => { },
    setEvmAddress: () => { },
    setChainType: () => { },
    SolRefreshProxyAddress: () => { },
    EvmRefreshProxyAddress: () => { },
  });

export const useBolarityWalletProvider = () =>
  useContext(BolarityWalletProviderContext);

export function BolarityWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { publicKey } = useWallet();
  const { address } = useEvmAccount();

  const [solAddress, setSolAddress] = useState<string>("");
  const [evmAddress, setEvmAddress] = useState<string>("");
  const [ChainType, setChainType] = useState<SupportChain | null>(null);
  const { fetchProxySolanaAddress, fetchProxyEvmAddress } = useFetchAddress();

  useEffect(() => {
    if (address) {
      setChainType(SupportChain.Ethereum);
      setEvmAddress(address);
      SolRefreshProxyAddress();
    }
    if (publicKey) {
      setChainType(SupportChain.Solana);
      setSolAddress(publicKey.toBase58());
      EvmRefreshProxyAddress();
    }
  }, [address, publicKey]);

  function SolRefreshProxyAddress() {
    if (address) {
      fetchProxySolanaAddress(address).then((res) => {
        if (res) {
          setSolAddress(res);
        }
      });
    }
  }
  function EvmRefreshProxyAddress() {
    if (publicKey) {
      fetchProxyEvmAddress(publicKey.toBase58()).then((res) => {
        if (res) {
          setEvmAddress(res);
        }
      });
    }
  }

  return (
    <BolarityWalletProviderContext.Provider
      value={{
        solAddress,
        evmAddress,
        ChainType,
        setSolAddress,
        setEvmAddress,
        setChainType,
        SolRefreshProxyAddress,
        EvmRefreshProxyAddress,
      }}
    >
      {children}
    </BolarityWalletProviderContext.Provider>
  );
}
