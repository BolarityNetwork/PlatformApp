"use client";

import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import {
  handleTransactionSuccess,
  hexStringToUint8Array,
  rightAlignBuffer,
  sepoliaPayloadHead,
  sha256,
  sliceBuffer,
  writeUInt16LE,
} from "@/lib/utils";

import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";

import { toHex } from "viem";
import {
  BOLARITY_EVM_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
  UNI_PROXY,
  WORMHOLE_EVM_CHAIN_ID,
} from "@/config";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { serialize } from "borsh";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useState } from "react";
const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useEffect } from "react";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";
import { AccountMeta, RawDataSchema } from "@/config/solala";

const ActiveSolanaAccountBtn = ({ evmAddress }: { evmAddress: string }) => {
  const [refreshing, setRefreshing] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { SolRefreshProxyAddress } = useBolarityWalletProvider();

  const { fetchProxySolanaAddress } = useFetchAddress();

  const handleActiveAccount = async () => {
    setRefreshing(true);
    const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);

    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const paras = sliceBuffer(sha256("active"), 0, 8);
    const encodedParams = Buffer.concat([paras]);

    const encodeMeta = serialize(AccountMeta, [
      { writeable: true, is_signer: false },
    ]);

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          return writeUInt16LE(WORMHOLE_EVM_CHAIN_ID);
        })(),
        ethAddress,
      ],
      HELLO_WORLD_PID
    );
    const RawData = {
      chain_id: WORMHOLE_EVM_CHAIN_ID,
      caller: ethAddress,
      programId: new PublicKey(programTest).toBuffer(),
      acc_count: 1,
      accounts: [
        {
          key: realForeignEmitter.toBuffer(),
          isWritable: true,
          isSigner: false,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };
    const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));

    writeContract(
      {
        address: BOLARITY_EVM_CONTRACT,
        abi: UNI_PROXY.abi,
        functionName: "sendMessage",
        args: [toHex(Buffer.concat([sepoliaPayloadHead, RawDataEncoded]))],
      },
      {
        onSuccess: (hash) => {
          console.log("hash--active--", hash);
        },
        onError: (error) => {
          setRefreshing(false);
          console.log("error--active--", error);
          toast.error(
            "Transaction failed: " + error.toString().substring(0, 100)
          );
        },
      }
    );
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  useEffect(() => {
    // if (isConfirming) {
    //   console.log("isConfirming", isConfirming);
    //   toast.success("Confirming...", {
    //     id: hash,
    //   });
    // }
    if (isConfirmed) {
      console.log("isConfirmed", isConfirmed);
      refreshSolAddress();
    }
  }, [hash, isConfirmed, isConfirming]);
  const refreshSolAddress = () => {
    toast.success("Confirming...");
    let attemptCount = 0;
    const maxAttempts = 60; // 1 minute timeout (60 seconds)

    const intervalId = setInterval(() => {
      attemptCount++;

      // Check if we've exceeded the timeout period
      if (attemptCount >= maxAttempts) {
        clearInterval(intervalId);
        setRefreshing(false);
        toast.error("Activation timed out after 1 minute");
        return;
      }

      fetchProxySolanaAddress(evmAddress).then((res) => {
        if (res) {
          clearInterval(intervalId);
          SolRefreshProxyAddress();
          setRefreshing(false);
          handleTransactionSuccess(
            hash as string,
            `https://sepolia.etherscan.io/tx/${hash}`
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

export default ActiveSolanaAccountBtn;
