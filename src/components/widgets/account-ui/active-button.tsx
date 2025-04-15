"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";

import { Button } from "@/components/ui/button";
import { AtSign } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

import {
  getExplorerLink,
  handleError,
  handleTransactionSuccess,
  solanaPayloadHead,
} from "@/lib/utils";

import { encodeAbiParameters, toHex } from "viem";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useFetchAddress } from "@/hooks/bolaryty/useFetchAddress";

import { useDappInitProgram } from "@/hooks/transfer/solMethod";

const ActiveEvmAccountButton = ({ solAddress }: { solAddress: string }) => {
  const { EvmRefreshProxyAddress } = useBolarityWalletProvider();
  const { fetchProxyEvmAddress } = useFetchAddress();

  const [refreshing, setRefreshing] = useState(false);

  const solPublicKey = new PublicKey(solAddress);

  const { initialize } = useDappInitProgram();
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

      const res = await initialize.mutateAsync({
        message: payload,
        solPublicKey,
      });
      console.log("激活evm--", res);

      // 需要刷新evm钱包地址
      if (res) {
        refreshEvmAddress(res);
      }
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
