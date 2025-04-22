"use client";

import { ClusterNetwork, useCluster } from "@/providers/cluster-provider";
import { isValidEvmAddress } from "@/lib/utils";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { formatEther, formatUnits, erc20Abi } from "viem";
import {
  CLAIM_TOKEN_CONTRACT,
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
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
    },
    [ClusterNetwork.Devnet]: {
      [CurrencyEnum.USDT]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      [CurrencyEnum.USDC]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    },
  };

  return mintAddresses[network]?.[tokenSymbol];
};

export function useGetTokenAccounts({ address }: { address: PublicKey }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: [
      "get-token-accounts",
      { endpoint: connection.rpcEndpoint, address },
    ],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);
      return [...tokenAccounts.value, ...token2022Accounts.value];
    },
  });
}
export const useGetBalance = () => {
  const { connection } = useConnection();

  const { cluster } = useCluster();
  const { evmAddress, solAddress } = useBolarityWalletProvider();

  const SOL_USDC_MINT_ADDRESS = getSolTokenMintAddress(
    CurrencyEnum.USDC,
    cluster.name
  );

  return useQuery({
    queryKey: [
      "get-balance",
      { endpoint: connection.rpcEndpoint, solAddress, evmAddress },
    ],
    enabled: !!solAddress || !!evmAddress,
    queryFn: async (): Promise<BalanceData> => {
      let data = {
        solBalance: 0,
        solEthBalance: 0,
        solUsdtBalance: 0,
        solUsdcBalance: 0,
        ethBalance: 0,
        ethSolBalance: 0,
        ethUsdtBalance: 0,
        ethUsdcBalance: 0,
        solBolBalance: 0,
      };

      // 创建一个带超时的请求函数
      const fetchWithTimeout = async (promise, timeout = 5000) => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("Request timeout"));
          }, timeout);
        });

        try {
          const result = await Promise.race([promise, timeoutPromise]);
          clearTimeout(timer);
          return result;
        } catch (error) {
          clearTimeout(timer);
          throw error;
        }
      };

      // 并行执行所有请求
      const promises = [];

      // Solana 相关请求
      if (solAddress) {
        const solPublicKey = new PublicKey(solAddress);

        // 1. SOL 余额请求
        promises.push(
          fetchWithTimeout(connection.getBalance(solPublicKey))
            .then((solBalance) => {
              if (solBalance) {
                data.solBalance = Number(solBalance / LAMPORTS_PER_SOL);
              }
            })
            .catch((e) => console.log("get SOL Balance error:", e))
        );

        // 2. USDC +bolarity 余额请求
        promises.push(
          fetchWithTimeout(
            connection
              .getParsedTokenAccountsByOwner(new PublicKey(solAddress), {
                programId: TOKEN_PROGRAM_ID,
              })
              .then((tokenAccounts) => {
                console.log("tokenAccounts---tokenAccounts--", tokenAccounts);
                if (tokenAccounts.value.length) {
                  tokenAccounts.value.forEach(({ account }) => {
                    const { mint, tokenAmount } = account.data.parsed.info;
                    if (SOL_USDC_MINT_ADDRESS == mint) {
                      data.solUsdcBalance = tokenAmount.uiAmount;
                    }
                    if (CLAIM_TOKEN_CONTRACT == mint) {
                      data.solBolBalance = tokenAmount.uiAmount;
                    }
                  });
                }
              })
          )
        );
      }

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
