import { useState, useMemo } from "react";
import { pad, toHex } from "viem";
import { PublicKey } from "@solana/web3.js";
import {
  hexStringToUint8Array,
  rightAlignBuffer,
  deriveEthAddressKey,
} from "@/lib/utils";
import { useConnection } from "@solana/wallet-adapter-react";
import { publicClient } from "@/config/wagmi";
import {
  BOLARITY_EVM_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
  UNI_PROXY,
} from "@/config";
import { SEPOLIA_CHAIN_ID } from "@/config/solala";

let isSending = false;

export const useProxyAddress = () => {
  const [error, setError] = useState(null as string | null);
  const { connection } = useConnection();

  const handleError = (err: unknown, fallbackMessage = "An error occurred") => {
    const errorMessage = err instanceof Error ? err.message : fallbackMessage;
    console.error(errorMessage);
    setError(errorMessage);
  };

  const fetchProxyEvmAddress = useMemo(() => {
    return async (
      solAddress: string,
      sourceChain = 1
    ): Promise<string | undefined> => {
      if (!solAddress || isSending) return;

      isSending = true;
      try {
        console.log("Fetching EVM Address...");

        // Prepare Solana address as padded bytes
        const userAddressSolana = new PublicKey(solAddress).toBytes();
        const userAddressPadded = pad(userAddressSolana, { size: 32 });

        // Call EVM contract
        const { abi } = UNI_PROXY;
        const result = await publicClient.readContract({
          address: BOLARITY_EVM_CONTRACT,
          abi,
          functionName: "proxys",
          args: [sourceChain, toHex(userAddressPadded)],
        });

        if (result && result !== "0x0000000000000000000000000000000000000000") {
          console.log("EVM Address fetched successfully.");
          return result as string;
        } else {
          console.log("EVM Address not activated.");
        }
      } catch (err) {
        handleError(err, "Failed to fetch EVM Address.");
      } finally {
        isSending = false;
      }
    };
  }, []);

  const fetchProxySolanaAddress = useMemo(() => {
    return async (evmAddress: string): Promise<string | undefined> => {
      if (!evmAddress || isSending) return;

      isSending = true;
      try {
        console.log("Fetching Solana Address...");

        // Prepare Solana PDA
        const programId = new PublicKey(BOLARITY_SOLANA_CONTRACT);
        const ethAddress = rightAlignBuffer(
          Buffer.from(hexStringToUint8Array(evmAddress))
        );
        const addressKey = deriveEthAddressKey(
          programId,
          SEPOLIA_CHAIN_ID,
          new PublicKey(ethAddress)
        );

        // Check account info
        const accountInfo = await connection.getAccountInfo(addressKey);
        if (accountInfo) {
          console.log("Solana Address fetched successfully.");
          return addressKey.toBase58();
        } else {
          console.log("Solana Address not activated.");
        }
      } catch (err) {
        handleError(err, "Failed to fetch Solana Address.");
      } finally {
        isSending = false;
      }
    };
  }, [connection]);

  return {
    error,
    fetchProxyEvmAddress,
    fetchProxySolanaAddress,
  };
};
