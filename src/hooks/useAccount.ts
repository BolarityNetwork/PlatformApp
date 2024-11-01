"use client";

import { ClusterNetwork, useCluster } from "@/providers/cluster-provider";
import { ellipsify, isValidEvmAddress, isValidPublicKey } from "@/lib/utils";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { formatEther, formatUnits, erc20Abi, http, createPublicClient } from "viem";
import { CurrencyEnum } from "@/config";
import { useAtom } from "jotai";
import { accountBalanceDataAtom, BalanceData } from "./atoms";
import { publicClient } from "@/config/wagmi";

export const getSolTokenMintAddress = (tokenSymbol: string, network: string) => {
  const mintAddresses: Record<string, Record<string, string>> = {
    [ClusterNetwork.Mainnet]: {
      [CurrencyEnum.USDT]: 'Es9vMFrzaCERUKHPvo1PiYVg3sboFev3K56CVNezj6ou',
      [CurrencyEnum.USDC]: 'AxsjH9JvUD7fLShMMYZ1xDb4sCVXzvhmWgDWpS6muZGi',
    },
    [ClusterNetwork.Devnet]: {
      [CurrencyEnum.USDT]: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      [CurrencyEnum.USDC]: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },
  };

  return mintAddresses[network]?.[tokenSymbol];
};

export const useGetBalance = ({ solAddress, evmAddress = '' }: { solAddress?: string, evmAddress?: string }) => {
  const { connection } = useConnection();
  const { cluster } = useCluster();

  return useQuery({
    queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, solAddress, evmAddress }],
    enabled: !!solAddress || !!evmAddress,
    queryFn: async (): Promise<BalanceData> => {
      console.log("queryFn starting...", solAddress, evmAddress);

      const data = {
        solBalance: 0,
        solUsdtBalance: 0,
        solUsdcBalance: 0,
        ethBalance: 0,
        ethUsdtBalance: 0,
        ethUsdcBalance: 0,
      }

      if (solAddress) {
        try {
          const solPublicKey = new PublicKey(solAddress);
          if (isValidPublicKey(solPublicKey)) {
            // 1. Get SOL balance
            try {
              const solBalance = await connection.getBalance(solPublicKey);
              if (solBalance) {
                data.solBalance = Number(solBalance / LAMPORTS_PER_SOL);
              }
            } catch (e) {
              console.log("get SOL Balance error:", e);
            }

            // 2. Get SOL -> USDC balance
            const SOL_USDC_MINT_ADDRESS = getSolTokenMintAddress(CurrencyEnum.USDC, cluster.name); // Solana USDC Mint address
            let solUsdcAddress;
            try {
              solUsdcAddress = await getAssociatedTokenAddress(
                new PublicKey(SOL_USDC_MINT_ADDRESS),
                solPublicKey
              );
            } catch (e) {
              console.log("getAssociatedTokenAddress error:", e);
            }
            if (solUsdcAddress) {
              try {
                const solUsdcAccount = await getAccount(connection, solUsdcAddress);
                if (solUsdcAccount) {
                  data.solUsdcBalance = Number(solUsdcAccount.amount / BigInt(1e6));
                }
              } catch (e) {
                console.log("get SOL USDC Account error:", e);
              }
            }

            // 3. Get SOL -> USDT balance
            // const SOL_USDT_MINT_ADDRESS = getSolTokenMintAddress(CurrencyEnum.USDT, cluster.name);
            // const solUsdtAddress = await getAssociatedTokenAddress(
            //   new PublicKey(SOL_USDT_MINT_ADDRESS),
            //   solPublicKey
            // );
            // const solUsdtAccount = await getAccount(connection, solUsdtAddress);
            // if (solUsdtAccount) {
            //   data.solUsdtBalance = Number(solUsdtAccount.amount / BigInt(1e6));
            // }   
          }
        } catch (e) {
          console.log("new PublicKey error:", e);
        }
      }

      if (isValidEvmAddress(evmAddress) && publicClient) {
        // 1. Get ETH balance
        try {
          const ethBalance = await publicClient.getBalance({ address: evmAddress as `0x${string}` });
          if (ethBalance) {
            data.ethBalance = Number(formatEther(ethBalance));
          }
        } catch (e) {
          console.log("get ETH Balance error:", e);
        }

        // 2. Get ETH -> USDC balance
        try {
          const USDC_CONTRACT = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
          const ethUsdcDecimals = 6;
          // const ethUsdcDecimals = await client.readContract({
          //   address: USDC_CONTRACT,
          //   abi: erc20Abi,
          //   functionName: 'decimals',
          //   args: [],
          // })
          // console.log('ethUsdcDecimals:', ethUsdcDecimals)
          const ethUsdcBalance = await publicClient.readContract({
            address: USDC_CONTRACT,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [evmAddress as `0x${string}`],
          });
          if (ethUsdcBalance) {
            data.ethUsdcBalance = Number(formatUnits(ethUsdcBalance, ethUsdcDecimals));
          }
        } catch (e) {
          console.log("get ETH USDC Balance error:", e);
        }

        // 3. Get ETH -> USDT balance
        try {
          const USDT_CONTRACT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"
          const ethUsdtDecimals = 6;
          // const ethUsdtDecimals = await client.readContract({
          //   address: USDT_CONTRACT,
          //   abi: erc20Abi,
          //   functionName: 'decimals',
          //   args: [],
          // })
          // console.log('ethUsdtDecimals:', ethUsdtDecimals)
          const ethUsdtBalance = await publicClient.readContract({
            address: USDT_CONTRACT,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [evmAddress as `0x${string}`],
          });
          if (ethUsdtBalance) {
            data.ethUsdtBalance = Number(formatUnits(ethUsdtBalance, ethUsdtDecimals));
          }
        } catch (e) {
          console.log("get ETH USDT Balance error:", e);
        }
      }

      return data;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  })
}

export const useAccountBalance = ({ solAddress, evmAddress }: { solAddress?: string, evmAddress?: string }) => {
  const { isLoading, refetch, error, data } = useGetBalance({ solAddress, evmAddress });
  const { connection } = useConnection();
  const [accountBalance, setAccountBalance] = useAtom(accountBalanceDataAtom);

  useEffect(() => {
    if (data) {
      console.log("fetch account balance:", data);
      setAccountBalance(data);
    }
  }, [data, setAccountBalance]);

  useEffect(() => {
    if (!refetch || isLoading) {
      return;
    }

    const _refetch = async () => {
      await refetch();
    }
    _refetch();

    // Subscribe to solana account changes
    let solSubscriptionId: number;
    if (solAddress) {
      const ACCOUNT_TO_WATCH = new PublicKey(solAddress);      
      const subscribeToAccount = async () => {
        solSubscriptionId = connection.onAccountChange(
          ACCOUNT_TO_WATCH,
          () => {
            refetch();
          },
          { commitment: "confirmed" }
        );
        console.log("Subscription ID:", solSubscriptionId);
      };

      subscribeToAccount();
    }

    return () => {
      if (solSubscriptionId) {
        connection.removeAccountChangeListener(solSubscriptionId).then(() => {
          console.log("Unsubscribed from account changes");
        });
      }
    }

  }, [solAddress, evmAddress, refetch, isLoading, connection]);


  const accountBalanceData = useMemo(() => ({
    accountBalance,
    isLoading,
    refetch,
    error
  }), [accountBalance, isLoading, refetch, error]);

  return accountBalanceData;
}

export const useTransferSol = ({ solPublicKey }: { solPublicKey?: PublicKey }) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: ["transfer-sol", { endpoint: connection.rpcEndpoint, solPublicKey: solPublicKey?.toString() }],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = "";
      try {
        if (solPublicKey) {
          const { transaction, latestBlockhash } = await createSolanaTransaction({
            publicKey: solPublicKey,
            destination: input.destination,
            amount: input.amount,
            connection,
          });

          // Send transaction and await for signature
          signature = await wallet.sendTransaction(transaction, connection);

          // Send transaction and await for signature
          await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

          return signature;
        }

      } catch (error: unknown) {
        console.log("error", `Transaction failed! ${error}`, signature);

        return;
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        toast.success("Transaction Successfull", {
          description: ellipsify(signature),
          action: {
            label: "Explorer Link",
            onClick: () => window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
      }
      return Promise.all([
        client.invalidateQueries({
          queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, solPublicKey }],
        }),
        client.invalidateQueries({
          queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, solPublicKey }],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Transaction Failed", {
        description: `${error}`,
        duration: 10000,
      });
      console.log("error", `Transaction failed! ${error}`);
    },
  });
}

export const useTransferSolToken = ({ solPublicKey }: { solPublicKey?: PublicKey }) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: ["transfer-sol-token", { endpoint: connection.rpcEndpoint, solPublicKey: solPublicKey?.toString() }],
    mutationFn: async (input: { tokenMintPublicKey: PublicKey; destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = "";
      try {
        if (solPublicKey) {
          console.log("transfer sol token", solPublicKey.toString(), input.tokenMintPublicKey.toString(), input.destination.toString(), input.amount);


          const senderTokenAccount = await getAssociatedTokenAddress(input.tokenMintPublicKey, solPublicKey);
          console.log("senderTokenAccount", senderTokenAccount.toString());

          let recipientTokenAccount = await getAssociatedTokenAddress(input.tokenMintPublicKey, input.destination);
          console.log("recipientTokenAccount", recipientTokenAccount.toString());

          if (!recipientTokenAccount) {
            const _transaction = new Transaction().add(
              createAssociatedTokenAccountInstruction(
                solPublicKey,
                input.destination,
                input.destination,
                input.tokenMintPublicKey
              )
            );
            // Send transaction to create account
            const _latestBlockhash = await connection.getLatestBlockhash();
            const _signature = await wallet.sendTransaction(_transaction, connection);
            await connection.confirmTransaction({ signature: _signature, ..._latestBlockhash }, "confirmed");
          }

          if (recipientTokenAccount) {
            const latestBlockhash = await connection.getLatestBlockhash();
            const tx = new Transaction().add(
              createTransferInstruction(
                senderTokenAccount,
                recipientTokenAccount,
                solPublicKey,
                input.amount * 10 ** 6, // Convert to smallest unit with decimal places
                [],
                TOKEN_PROGRAM_ID
              )
            );
            // tx.feePayer = solPublicKey;
            // tx.recentBlockhash = latestBlockhash.blockhash;

            // signature = await connection.simulateTransaction(tx);

            signature = await wallet.sendTransaction(tx, connection);
            await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

            return signature;
          }
        }

      } catch (error: unknown) {
        console.log("error", `Transaction failed! ${error}`, signature);

        return;
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        toast.success("Transaction Successfull", {
          description: ellipsify(signature),
          action: {
            label: "Explorer Link",
            onClick: () => window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
      }
      return Promise.all([
        client.invalidateQueries({
          queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, solPublicKey }],
        }),
        client.invalidateQueries({
          queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, solPublicKey }],
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Transaction Failed", {
        description: `${error}`,
        duration: 10000,
      });
      console.log("error", `Transaction failed! ${error}`);
    },
  });
}

export const createSolanaTransaction = async ({ publicKey, destination, amount, connection }: { publicKey: PublicKey; destination: PublicKey; amount: number; connection: Connection; }): Promise<{ transaction: VersionedTransaction; latestBlockhash: { blockhash: string; lastValidBlockHeight: number }; }> => {
  // Get the latest blockhash to use in our transaction
  const latestBlockhash = await connection.getLatestBlockhash();

  // Create instructions to send, in this case a simple transfer
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    }),
  ];

  // Create a new TransactionMessage with version and compile it to legacy
  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage();

  // Create a new VersionedTransaction which supports legacy and v0
  const transaction = new VersionedTransaction(messageLegacy);

  return {
    transaction,
    latestBlockhash,
  };
}

export const useGetSignatures = ({ address }: { address: PublicKey }) => {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  });
}

export const useGetParsedTransactions = (signatures: string[], options?: { enabled: boolean }) => {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-parsed-transactions", { endpoint: connection.rpcEndpoint, signatures }],
    queryFn: () => connection.getParsedTransactions(signatures),
    ...options,
  });
}