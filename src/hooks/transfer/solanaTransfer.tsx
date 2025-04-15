import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ellipsify } from "@/lib/utils";
import { useCluster } from "@/providers/cluster-provider";
import { parseUnits } from "viem";
import { useWidgetsProvider } from "@/providers/widgets-provider";

export function useTransferSol({ address }: { address: PublicKey }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const client = useQueryClient();
  const { getExplorerUrl } = useCluster();

  return useMutation({
    mutationKey: [
      "transfer-sol",
      { endpoint: connection.rpcEndpoint, address },
    ],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = "";

      try {
        const { transaction, latestBlockhash } = await createTransaction({
          publicKey: address,
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

        console.log(signature);
        return signature;
      } catch (error: unknown) {
        console.log("error", `Transaction failed! ${error}`, signature);
        // ErrorToast
        toast.error(`Transaction failed! ${error}`);

        return;
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        // transactionToast(signature);
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
            { endpoint: connection.rpcEndpoint, address },
          ],
        }),
        client.invalidateQueries({
          queryKey: [
            "get-signatures",
            { endpoint: connection.rpcEndpoint, address },
          ],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(`Transaction failed! ${error}`);
    },
  });
}

export async function createTransaction({
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
}> {
  // Get the latest blockhash to use in our transaction
  const latestBlockhash = await connection.getLatestBlockhash();

  // Create instructions to send, in this case a simple transfer
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      // lamports: amount * LAMPORTS_PER_SOL,
      lamports: parseUnits(amount.toString(), 9),
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

export const useTransferSolToken = ({
  solPublicKey,
}: {
  solPublicKey?: PublicKey;
}) => {
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const client = useQueryClient();
  const { sendTransaction } = useWallet();
  const { setIsOpen } = useWidgetsProvider();

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
      decimals: number;
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
          const receiverAccountInfo = await connection.getAccountInfo(
            recipientTokenAccount
          );
          console.log("receiverAccountInfo---", receiverAccountInfo);

          if (!receiverAccountInfo) {
            const _transaction = new Transaction().add(
              createAssociatedTokenAccountInstruction(
                solPublicKey,
                // input.destination,
                recipientTokenAccount,
                input.destination,
                input.tokenMintPublicKey
              )
            );
            // Send transaction to create account
            const _latestBlockhash = await connection.getLatestBlockhash();
            const _signature = await sendTransaction(_transaction, connection);
            await connection.confirmTransaction(
              { signature: _signature, ..._latestBlockhash },
              "confirmed"
            );
          }
          console.log(
            "parseUnits(input.amount.toString(), 9)---",
            parseUnits(input.amount.toString(), 9)
          );

          if (recipientTokenAccount) {
            const latestBlockhash = await connection.getLatestBlockhash();
            const tx = new Transaction().add(
              createTransferInstruction(
                senderTokenAccount,
                recipientTokenAccount,
                solPublicKey,
                // input.amount * 10 ** 6, // Convert to smallest unit with decimal places
                parseUnits(input.amount.toString(), input.decimals), // USDC精度为6
                [],
                TOKEN_PROGRAM_ID
              )
            );
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = solPublicKey;

            // signature = await connection.simulateTransaction(tx);

            signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(
              { signature, ...latestBlockhash },
              "confirmed"
            );

            return signature;
          }
        }
      } catch (error: unknown) {
        console.log("error", `Transaction failed! ${error}`, signature);
        setIsOpen(false);
        toast.error("Transaction Failed", {
          description: `${error}`,
          duration: 10000,
        });
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
