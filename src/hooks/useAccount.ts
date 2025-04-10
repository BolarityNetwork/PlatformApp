"use client";

import { ClusterNetwork, useCluster } from "@/providers/cluster-provider";
import { ellipsify, isValidEvmAddress } from "@/lib/utils";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatEther, formatUnits, erc20Abi, watchBlockNumber } from "viem";
import {
  CLAIM_TOKEN_CONTRACT,
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  SupportChain,
} from "@/config";
import { BalanceData } from "./atoms";
import { publicClient } from "@/config/wagmi";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useEffect } from "react";

const endpoint = `${process.env.NEXT_PUBLIC_RPC_URL}`;

async function ethGetSplTokenAccount(address: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        address,
        { programId: TOKEN_PROGRAM_ID },
        { encoding: "jsonParsed" },
      ],
    }),
  });
  return await response.json();
}

export const getSolTokenMintAddress = (tokenSymbol: string, network: string) => {
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

function isWebSocketConnection(endpoint: string): boolean {
  return endpoint.startsWith("ws");
}

export const useGetBalance = () => {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const { evmAddress, solAddress, ChainType } = useBolarityWalletProvider();
  const queryClient = useQueryClient();
  const globalChainType = ChainType === SupportChain.Ethereum;

  const usePolling = !isWebSocketConnection(connection.rpcEndpoint);

  const query = useQuery({
    queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, solAddress, evmAddress }],
    enabled: !!solAddress || !!evmAddress,
    queryFn: async (): Promise<BalanceData> => {
      let data: BalanceData = {
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

      if (solAddress) {
        const solPublicKey = new PublicKey(solAddress);
        try {
          const solBalance = await connection.getBalance(solPublicKey);
          data.solBalance = Number(solBalance) / LAMPORTS_PER_SOL;
        } catch (e) {
          console.error("get SOL Balance error:", e);
        }

        try {
          const solUsdcMint = getSolTokenMintAddress(CurrencyEnum.USDC, cluster.name);
          const solUsdcAddress = await getAssociatedTokenAddress(new PublicKey(solUsdcMint), solPublicKey);
          const solUsdcAccount = await getAccount(connection, solUsdcAddress);
          data.solUsdcBalance = Number(solUsdcAccount.amount) / 1e6;
        } catch (e) {
          console.error("get SOL USDC Account error:", e);
        }

        try {
          const solBolAddress = await getAssociatedTokenAddress(new PublicKey(CLAIM_TOKEN_CONTRACT), solPublicKey);
          const solBolAccount = await getAccount(connection, solBolAddress);
          data.solBolBalance = Number(formatUnits(solBolAccount.amount, 9));
        } catch (e) {
          console.error("get SOL BOLARITY Account error:", e);
        }
      }

      if (globalChainType && evmAddress && solAddress) {
        try {
          const resUsdc = await ethGetSplTokenAccount(solAddress);
          if (resUsdc?.result?.value?.length) {
            const usdcAccount = resUsdc.result.value.find(
              (item: any) => item.account.data.parsed.info.owner === solAddress
            );
            if (usdcAccount) {
              data.solUsdcBalance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
            }
          }
        } catch (e) {
          console.error("eth proxy SPL token query error:", e);
        }
      }

      if (isValidEvmAddress(evmAddress) && publicClient) {
        try {
          const ethBalance = await publicClient.getBalance({ address: evmAddress as `0x${string}` });
          data.ethBalance = Number(formatEther(ethBalance));
        } catch (e) {
          console.error("get ETH Balance error:", e);
        }

        try {
          const wsolBalance = await publicClient.readContract({
            address: EVM_WSOL_CONTRACT,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          data.ethSolBalance = Number(formatUnits(wsolBalance, 9));
        } catch (e) {
          console.error("get ETH WSOL Balance error:", e);
        }

        try {
          const usdcBalance = await publicClient.readContract({
            address: EVM_USDC_CONTRACT,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          data.ethUsdcBalance = Number(formatUnits(usdcBalance, 6));
        } catch (e) {
          console.error("get ETH USDC Balance error:", e);
        }

        try {
          const usdtBalance = await publicClient.readContract({
            address: EVM_USDT_CONTRACT,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          data.ethUsdtBalance = Number(formatUnits(usdtBalance, 6));
        } catch (e) {
          console.error("get ETH USDT Balance error:", e);
        }
      }

      return data;
    },
    refetchInterval: usePolling ? 10000 : false,
    refetchIntervalInBackground: usePolling,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!solAddress || !connection.onAccountChange) return;
    const publicKey = new PublicKey(solAddress);
    const subscriptionId = connection.onAccountChange(publicKey, () => {
      console.log("Solana账户变化，刷新余额");
      queryClient.invalidateQueries({ queryKey: ["get-balance"] });
    });
    return () => connection.removeAccountChangeListener(subscriptionId);
  }, [solAddress, connection]);

  useEffect(() => {
    if (!publicClient || !evmAddress) return;
    const unwatch = watchBlockNumber(publicClient, {
      onBlockNumber: () => {
        console.log("以太坊新块刷新余额");
        queryClient.invalidateQueries({ queryKey: ["get-balance"] });
      },
    });
    return () => unwatch();
  }, [publicClient, evmAddress]);

  return query;
};

export const useTransferSol = ({ solPublicKey }: { solPublicKey?: PublicKey }) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: ["transfer-sol", { endpoint: connection.rpcEndpoint, solPublicKey }],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      if (!solPublicKey) return;
      const { transaction, latestBlockhash } = await createSolanaTransaction({
        publicKey: solPublicKey,
        destination: input.destination,
        amount: input.amount,
        connection,
      });
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");
      return signature;
    },
    onSuccess: (signature) => {
      if (signature) {
        toast.success("Transaction Successful", {
          description: ellipsify(signature),
          action: { label: "Explorer", onClick: () => window.open(getExplorerUrl(`tx/${signature}`), "_blank") },
        });
      }
      return Promise.all([
        client.invalidateQueries({ queryKey: ["get-balance"] }),
        client.invalidateQueries({ queryKey: ["get-signatures"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Transaction Failed", { description: String(error) });
      console.error("Transaction failed:", error);
    },
  });
};

export const useTransferSolToken = ({ solPublicKey }: { solPublicKey?: PublicKey }) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: ["transfer-sol-token", { endpoint: connection.rpcEndpoint, solPublicKey }],
    mutationFn: async (input: { tokenMintPublicKey: PublicKey; destination: PublicKey; amount: number }) => {
      if (!solPublicKey) return;
      const senderTokenAccount = await getAssociatedTokenAddress(input.tokenMintPublicKey, solPublicKey);
      const recipientTokenAccount = await getAssociatedTokenAddress(input.tokenMintPublicKey, input.destination);
      const latestBlockhash = await connection.getLatestBlockhash();
      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          solPublicKey,
          input.amount * 1e6,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");
      return signature;
    },
    onSuccess: (signature) => {
      if (signature) {
        toast.success("Transaction Successful", {
          description: ellipsify(signature),
          action: { label: "Explorer", onClick: () => window.open(getExplorerUrl(`tx/${signature}`), "_blank") },
        });
      }
      return Promise.all([
        client.invalidateQueries({ queryKey: ["get-balance"] }),
        client.invalidateQueries({ queryKey: ["get-signatures"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Transaction Failed", { description: String(error) });
      console.error("Transaction failed:", error);
    },
  });
};

export const createSolanaTransaction = async ({
  publicKey,
  destination,
  amount,
  connection,
}: {
  publicKey: PublicKey;
  destination: PublicKey;
  amount: number;
  connection: Connection;
}): Promise<{
  transaction: VersionedTransaction;
  latestBlockhash: { blockhash: string; lastValidBlockHeight: number };
}> => {
  const latestBlockhash = await connection.getLatestBlockhash();
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    }),
  ];
  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage();
  return {
    transaction: new VersionedTransaction(messageLegacy),
    latestBlockhash,
  };
};

export const useGetSignatures = ({ address }: { address: PublicKey }) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  });
};

export const useGetParsedTransactions = (signatures: string[], options?: { enabled: boolean }) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["get-parsed-transactions", { endpoint: connection.rpcEndpoint, signatures }],
    queryFn: () => connection.getParsedTransactions(signatures),
    ...options,
  });
};