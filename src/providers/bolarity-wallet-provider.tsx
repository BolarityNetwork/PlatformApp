"use client";
import { createContext, useContext, useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  AAVE_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  SupportChain,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
} from "@/config";
import { useAccount as useEvmAccount } from "wagmi";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";
import { erc20Abi } from "viem";
import { publicClient } from "@/config/wagmi";

interface BolarityWalletProviderContextType {
  // allowanceWsol: string;
  evmAddress: string;
  solAddress: string;
  ChainType: SupportChain | null;
  setSolAddress: (address: string) => void;
  setEvmAddress: (address: string) => void;
  setChainType: (address: SupportChain | null) => void;
  SolRefreshProxyAddress: () => void;
  EvmRefreshProxyAddress: () => void;
  CheckApproveTransfer: () => Promise<number>;
  CheckUSDTApproveTransfer: () => Promise<number>;
}

const BolarityWalletProviderContext =
  createContext<BolarityWalletProviderContextType>({
    // allowanceWsol: "",
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
    CheckUSDTApproveTransfer: async () => {
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

  const [solAddress, setSolAddress] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [ChainType, setChainType] = useState(null as SupportChain | null);
  const { fetchProxySolanaAddress, fetchProxyEvmAddress } = useFetchAddress();
  // const { connect, connectors } = useConnect();

  // useEffect(() => {
  //   const allowReconnect = localStorage.getItem("wagmi.recentConnectorId");
  //   console.log("allowReconnect--", allowReconnect);
  //   if (allowReconnect) {
  //     const parsed = allowReconnect?.replace(/^"(.*)"$/, "$1");
  //     let wallet_id = connectors.find((c) => {
  //       if (c.id === parsed) {
  //         console.log("c---11111-", c);
  //         return c;
  //       }
  //     });
  //     console.log("parsed---", parsed);
  //     console.log("wallet_id---", wallet_id);
  //     connect({
  //       connector: wallet_id as Connector<CreateConnectorFn>,
  //     });
  //   }
  // }, []);
  // 检查evm钱包链接状态
  // useEffect(() => {
  //   const tryReconnect = async () => {
  //     const allowReconnect = localStorage.getItem("wagmi.recentConnectorId");
  //     // if (allowReconnect !== 'true') return;
  //     if (allowReconnect) {
  //       for (const connector of connectors) {
  //         console.log("connector--", connector);
  //         if (
  //           "isAuthorized" in connector &&
  //           typeof connector.isAuthorized === "function"
  //         ) {
  //           const authorized = await connector.isAuthorized();
  //           if (authorized) {
  //             connect({ connector });
  //             break;
  //           }
  //         }
  //       }
  //     }
  //   };

  //   tryReconnect();
  // }, []);
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
        console.log("fetchProxyEvmAddress----", res);
        if (res) {
          setEvmAddress(res);
        }
      });
    }
  }

  // 读取是否授权了wsol合约
  const CheckApproveTransfer = async () => {
    console.log("CheckApproveTransfer---evmAddress", evmAddress);
    const allowanceStatus = await publicClient.readContract({
      address: EVM_WSOL_CONTRACT,
      abi: erc20Abi,
      functionName: "allowance",
      args: [evmAddress as `0x${string}`, TOKEN_BRIDGE_RELAYER_CONTRACT],
    });
    console.log("CheckApproveTransfer---allowanceStatus", allowanceStatus);
    return Number(allowanceStatus);
  };
  // 读取是否授权了usdt合约
  const CheckUSDTApproveTransfer = async () => {
    const allowanceStatus = await publicClient.readContract({
      address: EVM_USDT_CONTRACT,
      abi: erc20Abi,
      functionName: "allowance",
      args: [evmAddress as `0x${string}`, AAVE_CONTRACT],
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
        CheckApproveTransfer,
        CheckUSDTApproveTransfer,
      }}
    >
      {children}
    </BolarityWalletProviderContext.Provider>
  );
}
