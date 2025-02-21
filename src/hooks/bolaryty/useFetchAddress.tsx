import { pad, toHex } from "viem";
import { PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { hexStringToUint8Array, rightAlignBuffer } from "@/lib/utils";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { ChainId } from "@certusone/wormhole-sdk";
import { useConnection } from "@solana/wallet-adapter-react";
import { publicClient } from "@/config/wagmi";
import {
  BOLARITY_EVM_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
  UNI_PROXY,
} from "@/config";

const deriveEthAddressKey = (
  programId: PublicKeyInitData,
  chain: ChainId,
  address: PublicKey
) => {
  return deriveAddress(
    [
      Buffer.from("pda"),
      (() => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(chain);
        return buf;
      })(),
      address.toBuffer(),
    ],
    programId
  );
};
export const useFetchAddress = () => {
  const { connection } = useConnection();

  const fetchProxyEvmAddress = async (
    solAddress: string,
    sourceChain: number = 1
  ): Promise<string | undefined> => {
    try {
      console.log("FetchEvmAddress starting...");
      // Convert Solana address to bytes and pad it
      const userAddressSolana = new PublicKey(solAddress).toBytes();
      const userAddressPadded = pad(userAddressSolana, { size: 32 });

      // Read contract
      const { abi } = UNI_PROXY;
      const result = await publicClient
        .readContract({
          address: BOLARITY_EVM_CONTRACT,
          abi,
          functionName: "proxys",
          args: [sourceChain, toHex(userAddressPadded)],
        })
        .catch((err) => {
          console.error("fetchProxyAddress failed:", err);
        });
      if (result && result != "0x0000000000000000000000000000000000000000") {
        console.log("FetchEvmAddress success.");
        return result as string;
      } else {
        console.log("FetchEvmAddress failed: not activated.");
      }
    } catch (err) {
      // setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
    }
  };

  const fetchProxySolanaAddress = async (evmAddress: string) => {
    console.log("FetchSolanaAddress starting..00000.");

    console.log("FetchSolanaAddress starting..connection.", connection);

    try {
      console.log("FetchSolanaAddress starting...");

      const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
      const realForeignEmitterChain = 10002;
      const ethAddress = rightAlignBuffer(
        Buffer.from(hexStringToUint8Array(evmAddress))
      );
      const addressKey = deriveEthAddressKey(
        HELLO_WORLD_PID,
        realForeignEmitterChain,
        new PublicKey(ethAddress)
      );
      const accountInfo = await connection.getAccountInfo(addressKey);
      console.log("FetchSolanaAddress success.---", accountInfo);
      if (accountInfo) {
        console.log("FetchSolanaAddress success.");
        return addressKey.toBase58();
      } else {
        console.log("FetchSolanaAddress failed: not activated.");
      }
    } catch (err) {
      console.error("FetchSolanaAddress failed: ", err);
    } finally {
    }
  };

  return {
    fetchProxyEvmAddress,
    fetchProxySolanaAddress,
  };
};
