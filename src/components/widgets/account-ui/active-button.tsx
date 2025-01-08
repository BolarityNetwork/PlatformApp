"use client";

import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import {
  getExplorerLink,
  getProvider,
  handleError,
  handleTransactionSuccess,
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
import { encodeAbiParameters, toHex } from "viem";

import { CONTRACTS } from "@certusone/wormhole-sdk";
import { Loading } from "@/components/ui/loading";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

const ActiveEvmAccountButton = ({ solAddress }: { solAddress: string }) => {
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();

  const { EvmRefreshProxyAddress } = useBolarityWalletProvider();

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
        [{ type: "bytes32" }, { type: "bytes" }],
        [sourceAddress, toHex(Buffer.from([0]))]
      );

      const provider = getProvider(
        { signTransaction, signAllTransactions, publicKey: solPublicKey },
        connection
      );

      const program = new anchor.Program(IDL!, provider);
      const NETWORK = "TESTNET";
      const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
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

      handleTransactionSuccess(
        signature,
        getExplorerLink("tx", signature, "devnet")
      );

      // 需要刷新evm钱包地址
      EvmRefreshProxyAddress();
    } catch (error) {
      handleError(error, "Failed to activate account");
      setRefreshing(false);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleActiveAccount}
      disabled={refreshing}
    >
      {refreshing ? (
        <Loading className="h-4 w-4 mr-1" />
      ) : (
        <AtSign className="h-4 w-4 mr-1" />
      )}
      Activate
    </Button>
  );
};

export default ActiveEvmAccountButton;
