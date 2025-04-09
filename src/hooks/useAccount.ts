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
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { formatEther, formatUnits, erc20Abi } from "viem";
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

const endpoint = `${process.env.NEXT_PUBLIC_RPC_URL}`;

// eth钱包登陆时。获取代理sol地址的余额代币
async function ethGetSPlTOkenAccount(address: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        address,
        {
          programId: TOKEN_PROGRAM_ID,
        },
        {
          encoding: "jsonParsed",
        },
      ],
    }),
  });
  return await response.json();
}

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

export const useGetBalance = () => {
  const { connection } = useConnection();
  const { cluster } = useCluster();

  const { evmAddress, solAddress, ChainType } = useBolarityWalletProvider();
  const globalChainType = ChainType == SupportChain.Ethereum;

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

      if (solAddress) {
        const solPublicKey = new PublicKey(solAddress);
        // 1. Get SOL balance
        try {
          const solBalance = await connection.getBalance(solPublicKey);
          console.log("useAccount--- solBalance", solBalance);
          if (solBalance) {
            data.solBalance = Number(solBalance / LAMPORTS_PER_SOL);
          }
        } catch (e: any) {
          console.log("get SOL Balance error:", e);
          console.log("get SOL Balance error:", e.message);
        }

        // 2. Get SOL -> USDC balance
        const SOL_USDC_MINT_ADDRESS = getSolTokenMintAddress(
          CurrencyEnum.USDC,
          cluster.name
        ); // Solana USDC Mint address
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

        // 3. Get SOL -> BOLARITY balance
        // const SOL_BOLARITY_MINT_ADDRESS = getSolTokenMintAddress(
        //   CurrencyEnum.BOLARITY,
        //   cluster.name
        // ); // Solana BOLARITY Mint 地址
        try {
          const solBolAddress = await getAssociatedTokenAddress(
            // new PublicKey(SOL_BOLARITY_MINT_ADDRESS),
            new PublicKey(CLAIM_TOKEN_CONTRACT),
            solPublicKey
          );
          const solBolAccount = await getAccount(connection, solBolAddress);
          console.log("useAccount---solBolAccount", solBolAccount);
          if (solBolAccount) {
            data.solBolBalance = Number(formatUnits(solBolAccount.amount, 9));
          }
        } catch (e) {
          console.log("get SOL BOLARITY Account error:", e);
        }
        // 3. Get SOL -> USDT balance
        // const SOL_USDT_MINT_ADDRESS = getSolTokenMintAddress(CurrencyEnum.USDT, cluster.name); // Solana USDT Mint 地址
        // const solUsdtAddress = await getAssociatedTokenAddress(
        //   new PublicKey(SOL_USDT_MINT_ADDRESS),
        //   solPublicKey
        // );
        // const solUsdtAccount = await getAccount(connection, solUsdtAddress);
        // if (solUsdtAccount) {
        //   data.solUsdtBalance = Number(solUsdtAccount.amount / BigInt(1e6));
        // }
      }

      // 为什么要用这方法？因为eth代理 sol地址的时候，需要用ethGetSPlTOkenAccount
      if (globalChainType && evmAddress && solAddress) {
        const resUsdc = await ethGetSPlTOkenAccount(solAddress);
        console.log("resUsdc:", resUsdc);
        if (
          resUsdc &&
          resUsdc.result &&
          resUsdc.result.value &&
          resUsdc.result.value.length > 0
        ) {
          const usdcAddressSpl = resUsdc.result.value.filter(
            (item: any) => item.account.data.parsed.info.owner === solAddress
          )[0].account.data.parsed.info.tokenAmount.uiAmount;
          console.log("usdcAddressSpl:", usdcAddressSpl);
          if (usdcAddressSpl) {
            data.solUsdcBalance = usdcAddressSpl;
          }
        }
      }

      if (isValidEvmAddress(evmAddress) && publicClient) {
        // 1. Get ETH balance
        try {
          const ethBalance = await publicClient.getBalance({
            address: evmAddress as `0x${string}`,
          });
          if (ethBalance) {
            data.ethBalance = Number(formatEther(ethBalance));
          }
        } catch (e) {
          console.log("get ETH Balance error:", e);
        }

        // 2. Get ETH -> SOL balance
        try {
          const wsolBalance = await publicClient.readContract({
            address: EVM_WSOL_CONTRACT as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          if (wsolBalance) {
            data.ethSolBalance = Number(formatUnits(wsolBalance, 9));
          }
        } catch (e) {
          console.log("get ETH SOL Balance error:", e);
        }

        // 3. Get ETH -> USDC balance
        try {
          const ethUsdcDecimals = 6;
          // const ethUsdcDecimals = await client.readContract({
          //   address: USDC_CONTRACT,
          //   abi: erc20Abi,
          //   functionName: 'decimals',
          //   args: [],
          // })
          // console.log('ethUsdcDecimals:', ethUsdcDecimals)
          const ethUsdcBalance = await publicClient.readContract({
            address: EVM_USDC_CONTRACT,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          if (ethUsdcBalance) {
            data.ethUsdcBalance = Number(
              formatUnits(ethUsdcBalance, ethUsdcDecimals)
            );
          }
        } catch (e) {
          console.log("get ETH USDC Balance error:", e);
        }

        // 4. Get ETH -> USDT balance
        try {
          const ethUsdtDecimals = 6;
          const ethUsdtBalance = await publicClient.readContract({
            address: EVM_USDT_CONTRACT,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });
          if (ethUsdtBalance) {
            data.ethUsdtBalance = Number(
              formatUnits(ethUsdtBalance, ethUsdtDecimals)
            );
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
  });
};

export const useTransferSol = ({
  solPublicKey,
}: {
  solPublicKey?: PublicKey;
}) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: [
      "transfer-sol",
      {
        endpoint: connection.rpcEndpoint,
        solPublicKey: solPublicKey?.toString(),
      },
    ],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = "";
      try {
        if (solPublicKey) {
          const { transaction, latestBlockhash } =
            await createSolanaTransaction({
              publicKey: solPublicKey,
              destination: input.destination,
              amount: input.amount,
              connection,
            });

          // Send transaction and await for signature
          signature = await wallet.sendTransaction(transaction, connection);

          // Send transaction and await for signature
          await connection.confirmTransaction(
            { signature, ...latestBlockhash },
            "confirmed"
          );

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
            onClick: () =>
              window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
      }
      return Promise.all([
        client.invalidateQueries({
          queryKey: [
            "get-balance",
            { endpoint: connection.rpcEndpoint, solPublicKey },
          ],
        }),
        client.invalidateQueries({
          queryKey: [
            "get-signatures",
            { endpoint: connection.rpcEndpoint, solPublicKey },
          ],
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
};

export const useTransferSolToken = ({
  solPublicKey,
}: {
  solPublicKey?: PublicKey;
}) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const wallet = useWallet();
  const client = useQueryClient();

  return useMutation({
    mutationKey: [
      "transfer-sol-token",
      {
        endpoint: connection.rpcEndpoint,
        solPublicKey: solPublicKey?.toString(),
      },
    ],
    mutationFn: async (input: {
      tokenMintPublicKey: PublicKey;
      destination: PublicKey;
      amount: number;
    }) => {
      let signature: TransactionSignature = "";
      try {
        if (solPublicKey) {
          console.log(
            "transfer sol token",
            solPublicKey.toString(),
            input.tokenMintPublicKey.toString(),
            input.destination.toString(),
            input.amount
          );

          const senderTokenAccount = await getAssociatedTokenAddress(
            input.tokenMintPublicKey,
            solPublicKey
          );
          console.log("senderTokenAccount", senderTokenAccount.toString());

          let recipientTokenAccount = await getAssociatedTokenAddress(
            input.tokenMintPublicKey,
            input.destination
          );
          console.log(
            "recipientTokenAccount",
            recipientTokenAccount.toString()
          );

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
            const _signature = await wallet.sendTransaction(
              _transaction,
              connection
            );
            await connection.confirmTransaction(
              { signature: _signature, ..._latestBlockhash },
              "confirmed"
            );
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
            await connection.confirmTransaction(
              { signature, ...latestBlockhash },
              "confirmed"
            );

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
            onClick: () =>
              window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
      }
      return Promise.all([
        client.invalidateQueries({
          queryKey: [
            "get-balance",
            { endpoint: connection.rpcEndpoint, solPublicKey },
          ],
        }),
        client.invalidateQueries({
          queryKey: [
            "get-signatures",
            { endpoint: connection.rpcEndpoint, solPublicKey },
          ],
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
};

export const useGetSignatures = ({ address }: { address: PublicKey }) => {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-signatures", { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address),
  });
};

export const useGetParsedTransactions = (
  signatures: string[],
  options?: { enabled: boolean }
) => {
  const { connection } = useConnection();

  return useQuery({
    queryKey: [
      "get-parsed-transactions",
      { endpoint: connection.rpcEndpoint, signatures },
    ],
    queryFn: () => connection.getParsedTransactions(signatures),
    ...options,
  });
};
