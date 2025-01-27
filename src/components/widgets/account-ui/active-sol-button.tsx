"use client";

import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import {
  handleTransactionSuccess,
  hexStringToUint8Array,
  rightAlignBuffer,
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
} from "@/config";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { serialize } from "borsh";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useState } from "react";
const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useEffect } from "react";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";

const ActiveSolanaAccountBtn = ({ evmAddress }: { evmAddress: string }) => {
  const [refreshing, setRefreshing] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { SolRefreshProxyAddress } = useBolarityWalletProvider();

  const { fetchProxySolanaAddress } = useFetchAddress();

  const handleActiveAccount = async () => {
    setRefreshing(true);
    const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
    const realForeignEmitterChain = 10002;
    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const AccountMeta = {
      array: {
        type: { struct: { writeable: "bool", is_signer: "bool" } },
      },
    };
    const RawDataSchema = {
      struct: {
        chain_id: "u16",
        caller: { array: { type: "u8", len: 32 } },
        programId: { array: { type: "u8", len: 32 } },
        acc_count: "u8",
        accounts: {
          array: {
            type: {
              struct: {
                key: { array: { type: "u8", len: 32 } },
                isWritable: "bool",
                isSigner: "bool",
              },
            },
          },
        },
        paras: { array: { type: "u8" } },
        acc_meta: { array: { type: "u8" } },
      },
    };

    const paras = sliceBuffer(sha256("active"), 0, 8);
    const encodedParams = Buffer.concat([paras]);

    const encodeMeta = serialize(AccountMeta, [
      { writeable: true, is_signer: false },
    ]);

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          return writeUInt16LE(realForeignEmitterChain);
        })(),
        ethAddress,
      ],
      HELLO_WORLD_PID
    );
    const RawData = {
      chain_id: realForeignEmitterChain,
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
        args: [toHex(RawDataEncoded)],
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
    const intervalId = setInterval(() => {
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
