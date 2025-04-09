"use client";

import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

import {
  getExplorerLink,
  getProvider,
  handleError,
  handleTransactionSuccess,
  hexStringToUint8Array,
  solanaPayloadHead,
  writeBigUint64LE,
} from "@/lib/utils";
import * as anchor from "@coral-xyz/anchor";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { encodeAbiParameters, toHex } from "viem";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";
import { WORMHOLE_CONTRACTS } from "@/config/solala";

const ActiveEvmAccountButton = ({ solAddress }: { solAddress: string }) => {
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();

  const { EvmRefreshProxyAddress } = useBolarityWalletProvider();
  const { fetchProxyEvmAddress } = useFetchAddress();

  const { connection } = useConnection();
  const [refreshing, setRefreshing] = useState(false);

  const solPublicKey = new PublicKey(solAddress);

  const handleActiveAccount = async () => {
    setRefreshing(true);
    try {
      const contractAddress = solPublicKey.toBytes();
      const sourceAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(contractAddress))]
      );
      const payload = encodeAbiParameters(
        [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
        [toHex(solanaPayloadHead), sourceAddress, toHex(Buffer.from([0]))]
      );

      const provider = getProvider(
        { signTransaction, signAllTransactions, publicKey: solPublicKey },
        connection
      );

      const program = new anchor.Program(IDL!, provider);
      const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
      const HELLO_WORLD_PID = program.programId;
      const realConfig = deriveAddress(
        [Buffer.from("config")],
        HELLO_WORLD_PID
      );

      const message2 = await getProgramSequenceTracker(
        connection,
        program.programId,
        CORE_BRIDGE_PID
      ).then((tracker: any) =>
        deriveAddress(
          [Buffer.from("sent"), writeBigUint64LE(tracker.sequence + BigInt(1))],
          HELLO_WORLD_PID
        )
      );

      if (!message2) {
        throw new Error("Failed to get program sequence tracker");
      }

      const wormholeAccounts2 = getPostMessageCpiAccounts(
        program.programId,
        CORE_BRIDGE_PID,
        solPublicKey,
        message2
      );

      const message = hexStringToUint8Array(payload);
      const params = {
        config: realConfig,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts2,
      };
      const ix1 = program.methods.sendMessage(Buffer.from(message));
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = solPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx3, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      // 需要刷新evm钱包地址
      refreshEvmAddress(signature);
    } catch (error) {
      handleError(error, "Failed to activate account");
      setRefreshing(false);
    } finally {
      // setRefreshing(false);
    }
  };

  const refreshEvmAddress = (signature: string) => {
    let attemptCount = 0;
    const maxAttempts = 60; // 1 minute timeout (60 seconds)

    const intervalId = setInterval(() => {
      attemptCount++;

      // Check if we've exceeded the timeout period
      if (attemptCount >= maxAttempts) {
        clearInterval(intervalId);
        setRefreshing(false);
        handleError(
          new Error("Timeout: Failed to activate account after 1 minute"),
          "Activation timed out"
        );
        return;
      }

      fetchProxyEvmAddress(solAddress).then((res) => {
        console.log("res", res);
        if (res) {
          clearInterval(intervalId);
          EvmRefreshProxyAddress();
          setRefreshing(false);

          handleTransactionSuccess(
            signature,
            getExplorerLink("tx", signature, "devnet")
          );
        }
      });
    }, 1000);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleActiveAccount}
      disabled={refreshing}
    >
      {refreshing ? <LoadingSpinner /> : <AtSign className="h-4 w-4 mr-1" />}
      Activate
    </Button>
  );
};

export default ActiveEvmAccountButton;
