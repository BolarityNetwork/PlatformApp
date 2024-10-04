import { useState, useEffect, useMemo } from 'react';
import { createPublicClient, http, pad, encodeFunctionData, decodeFunctionResult, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { PublicKey, PublicKeyInitData } from '@solana/web3.js';
import { hexStringToUint8Array, rightAlignBuffer } from '@/lib/utils';
import { deriveAddress } from '@certusone/wormhole-sdk/lib/cjs/solana';
import { ChainId } from '@certusone/wormhole-sdk';
import { useConnection } from '@solana/wallet-adapter-react';

// Initialize viem client
const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});
const UniProxy = require('../abis/UniProxy.json');

const deriveEthAddressKey = (
  programId: PublicKeyInitData,
  chain: ChainId,
  address: PublicKey,
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
}

export const useProxyAddress = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { connection } = useConnection();

  const fetchProxyAddress = async (solAddress: string, sourceChain: number = 1): Promise<string | undefined> => {
    // console.log("fetchProxyAddress: ", solAddress, sourceChain);
    const { abi } = UniProxy;
    try {
      // Contract address and ABI
      const contractAddress = '0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9';

      // Convert Solana address to bytes and pad it
      const userAddressSolana = new PublicKey(solAddress).toBytes();
      const userAddressPadded = pad(userAddressSolana, { size: 32 });

      // Prepare function data
      // const data = encodeFunctionData({
      //   UniProxy.abi,
      //   functionName: 'proxys',
      //   args: [sourceChain, userAddressPadded],
      // });

      // Read contract
      const result = await client.readContract({
        address: contractAddress,
        abi,
        functionName: 'proxys',
        args: [sourceChain, toHex(userAddressPadded)],
      }).catch((err) => {
        console.error('fetchProxyAddress error:', err);
      });
      if (result && result != "0x0000000000000000000000000000000000000000") {
        return result as string;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSolanaAddress = useMemo(() => {
    return async (evmAddress: string): Promise<PublicKey | undefined> => {
      const HELLO_WORLD_PID = new PublicKey("CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs");
      const realForeignEmitterChain = 10002;
      const ethAddress = rightAlignBuffer(Buffer.from(hexStringToUint8Array(evmAddress)));
      if (ethAddress) {
        const addressKey = deriveEthAddressKey(HELLO_WORLD_PID, realForeignEmitterChain, new PublicKey(ethAddress));
        try {
          const accountInfo = await connection.getAccountInfo(addressKey);
          if (accountInfo) {
            return addressKey;
          }
        } catch (err) {
          console.error("getAccountInfo: ", err);
        }
      }
    }
  }, [connection]);

  return { error, loading, fetchProxyAddress, fetchSolanaAddress };
};
