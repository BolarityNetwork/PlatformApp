import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

import {
  getProvider,
  hexStringToUint8Array,
  writeBigUint64LE,
} from "@/lib/utils";

import * as anchor from "@coral-xyz/anchor";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";

import { WORMHOLE_CONTRACTS } from "@/config/solala";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

// mint nft
export const useOnSendTransaction = () => {
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const onSendTransaction = async (
    solanaPublicKey: PublicKey,
    txPayload: any
  ) => {
    const provider = getProvider(
      {
        signTransaction,
        signAllTransactions,
        publicKey: solanaPublicKey,
      },
      connection
    );
    const program = new anchor.Program(IDL!, provider);

    const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
    const HELLO_WORLD_PID = program.programId;

    const realConfig = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);

    const message2 = await getProgramSequenceTracker(
      connection,
      program.programId,
      CORE_BRIDGE_PID
    )
      .then((tracker) =>
        deriveAddress(
          [
            Buffer.from("sent"),
            (() => writeBigUint64LE(tracker.sequence + BigInt(1)))(),
          ],
          HELLO_WORLD_PID
        )
      )
      .catch((err) => {
        toast.error("Failed to get program sequence tracker");
        console.log("err:", err);
      });

    if (!message2) {
      return;
    }

    const wormholeAccounts2 = getPostMessageCpiAccounts(
      program.programId,
      CORE_BRIDGE_PID,
      solanaPublicKey,
      message2
    );
    console.log("wormholeAccounts2:", wormholeAccounts2);

    const message = hexStringToUint8Array(txPayload);
    try {
      const params = {
        config: realConfig,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts2,
      };

      const ix1 = program.methods.sendMessage(Buffer.from(message));
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = solanaPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx3, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      // Send transaction and await for signature
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      return signature;
      // appreove usdt success.
    } catch (error: any) {
      console.log("error:", error);
      // toast.error('Transaction failed: ' + error.toString().substring(0, 100))
    }
  };

  // 创建代币关联账户
  const createAssociatedTokenAccount = async ({
    payer,
    associatedTokenAddress,
    owner,
    mint,
  }: {
    payer: PublicKey;
    associatedTokenAddress: PublicKey;
    owner: PublicKey;
    mint: PublicKey;
  }): Promise<boolean> => {
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAddress,
        owner,
        mint
      )
    );

    try {
      const latestBlockhash = await connection.getLatestBlockhash();
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(
        { signature: signature, ...latestBlockhash },
        "confirmed"
      );

      return true;
    } catch (error: any) {
      toast.error(`Create Associated Token Account Failed`, {
        description: `${error}`,
        duration: 10000,
      });
      return false;
    }
  };

  return {
    onSendTransaction,
    createAssociatedTokenAccount,
  };
};
