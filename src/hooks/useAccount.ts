"use client";

import { ClusterNetwork } from "@/providers/cluster-provider";
import { isValidEvmAddress, fetchWithTimeout } from "@/lib/utils";

import { useConnection } from "@solana/wallet-adapter-react";

import { useQuery } from "@tanstack/react-query";

import { formatEther, formatUnits, erc20Abi } from "viem";
import {
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  SOL_BTC_TOKEN,
  SOLANA_USDC_CONTRACT,
} from "@/config";

import { BalanceData } from "./atoms";
import { publicClient } from "@/config/wagmi";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

export const getSolTokenMintAddress = (
  tokenSymbol: string,
  network: string
) => {
  const mintAddresses: Record<string, Record<string, string>> = {
    [ClusterNetwork.Mainnet]: {
      [CurrencyEnum.USDT]: "Es9vMFrzaCERUKHPvo1PiYVg3sboFev3K56CVNezj6ou",
      [CurrencyEnum.USDC]: "AxsjH9JvUD7fLShMMYZ1xDb4sCVXzvhmWgDWpS6muZGi",
      [CurrencyEnum.BTC]: "",
    },
    [ClusterNetwork.Devnet]: {
      [CurrencyEnum.USDT]: SOLANA_USDC_CONTRACT,
      [CurrencyEnum.USDC]: SOLANA_USDC_CONTRACT,
      [CurrencyEnum.BTC]: SOL_BTC_TOKEN,
    },
  };

  return mintAddresses[network]?.[tokenSymbol];
};

export const useGetBalance = () => {
  const { connection } = useConnection();

  const { evmAddress, solAddress } = useBolarityWalletProvider();

  return useQuery({
    queryKey: [
      "get-balance",
      { endpoint: connection.rpcEndpoint, solAddress, evmAddress },
    ],
    enabled: !!solAddress || !!evmAddress,
    queryFn: async (): Promise<BalanceData> => {
      let data = {
        ethBalance: 0,
        ethSolBalance: 0,
        ethUsdtBalance: 0,
        ethUsdcBalance: 0,
      };

      // 并行执行所有请求
      const promises = [];

      // 以太坊相关请求
      if (isValidEvmAddress(evmAddress) && publicClient) {
        // 1. ETH 余额
        promises.push(
          fetchWithTimeout(
            publicClient.getBalance({
              address: evmAddress as `0x${string}`,
            })
          )
            .then((ethBalance) => {
              console.log("ethBalance--", ethBalance);
              if (ethBalance) {
                data.ethBalance = Number(formatEther(ethBalance));
              }
            })
            .catch((e) => console.log("get ETH Balance error:", e))
        );

        // 2. WSOL 余额
        promises.push(
          fetchWithTimeout(
            publicClient.readContract({
              address: EVM_WSOL_CONTRACT as `0x${string}`,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [evmAddress as `0x${string}`],
            })
          )
            .then((wsolBalance) => {
              if (wsolBalance) {
                data.ethSolBalance = Number(formatUnits(wsolBalance, 9));
              }
            })
            .catch((e) => console.log("get ETH SOL Balance error:", e))
        );

        // 3. USDC 余额
        promises.push(
          fetchWithTimeout(
            publicClient.readContract({
              address: EVM_USDC_CONTRACT,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [evmAddress as `0x${string}`],
            })
          )
            .then((ethUsdcBalance) => {
              if (ethUsdcBalance) {
                data.ethUsdcBalance = Number(formatUnits(ethUsdcBalance, 6));
              }
            })
            .catch((e) => console.log("get ETH USDC Balance error:", e))
        );

        // 4. USDT 余额
        promises.push(
          fetchWithTimeout(
            publicClient.readContract({
              address: EVM_USDT_CONTRACT,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [evmAddress as `0x${string}`],
            })
          )
            .then((ethUsdtBalance) => {
              if (ethUsdtBalance) {
                data.ethUsdtBalance = Number(formatUnits(ethUsdtBalance, 6));
              }
            })
            .catch((e) => console.log("get ETH USDT Balance error:", e))
        );
      }

      // 等待所有请求完成
      await Promise.allSettled(promises);
      return data;
    },
    // refetchInterval: usePolling ? 30 * 1000 : false,
    refetchInterval: 30000, // 增加到30秒
    refetchIntervalInBackground: false, // 在后台不要刷新

    refetchOnWindowFocus: true, // 窗口获得焦点时刷新
    staleTime: 20000, // 数据20秒内认为是新鲜的
  });
};
