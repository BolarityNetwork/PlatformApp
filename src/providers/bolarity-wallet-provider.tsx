"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  EVM_WSOL_CONTRACT,
  SupportChain,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
} from "@/config";
import { useAccount as useEvmAccount, useReadContract } from "wagmi";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";
import { erc20Abi } from "viem";
import { publicClient } from "@/config/wagmi";

interface BolarityWalletProviderContextType {
  allowanceWsol: string;
  evmAddress: string;
  solAddress: string;
  ChainType: SupportChain | null;
  setSolAddress: (address: string) => void;
  setEvmAddress: (address: string) => void;
  setChainType: (address: SupportChain | null) => void;
  SolRefreshProxyAddress: () => void;
  EvmRefreshProxyAddress: () => void;
  CheckApproveTransfer: () => Promise<number>;
}

const BolarityWalletProviderContext =
  createContext<BolarityWalletProviderContextType>({
    allowanceWsol: "",
    evmAddress: "",
    solAddress: "",
    ChainType: null,
    setSolAddress: () => {},
    setEvmAddress: () => {},
    setChainType: () => {},
    SolRefreshProxyAddress: () => {},
    EvmRefreshProxyAddress: () => {},
    CheckApproveTransfer: async () => {
      return 0;
    },
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
  // 读取是否授权了wsol合约
  const { data: allowanceWsol } = useReadContract({
    address: EVM_WSOL_CONTRACT,
    abi: erc20Abi,
    functionName: "allowance",
    args: [evmAddress as `0x${string}`, TOKEN_BRIDGE_RELAYER_CONTRACT],
  });
  console.log("allowanceWsol---init--", allowanceWsol);

  const CheckApproveTransfer = async () => {
    const allowanceStatus = await publicClient.readContract({
      address: EVM_WSOL_CONTRACT,
      abi: erc20Abi,
      functionName: "allowance",
      args: [evmAddress as `0x${string}`, TOKEN_BRIDGE_RELAYER_CONTRACT],
    });
    console.log("allowanceStatus", allowanceStatus);
    return Number(allowanceStatus);
  };
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
        allowanceWsol,
        CheckApproveTransfer,
      }}
    >
      {children}
    </BolarityWalletProviderContext.Provider>
  );
}
