import {
  transferNativeSol,
  CHAIN_ID_ETH,
  getEmitterAddressSolana,
  parseSequenceFromLogSolana,
  tryNativeToHexString,
} from "@certusone/wormhole-sdk";
import { WORMHOLE_SOLANA_BRIDGE, WORMHOLE_SOLANA_TOKEN_BRIDGE } from "@/config";

import { isAddress } from "viem";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// 假设这是跨链桥的合约地址和ABI
export function useBridgeToEth() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["bridge-sol-to-eth"],
    mutationFn: async ({
      ethAddress,
      amount,
      chainId = CHAIN_ID_ETH,
    }: {
      ethAddress: string;
      amount: number;
      chainId?: number;
    }) => {
      if (!wallet.publicKey) throw new Error("钱包未连接");
      let signature: TransactionSignature = "";

      try {
        // 验证ETH地址格式
        if (!isAddress(ethAddress)) {
          throw new Error("无效的ETH地址");
        }

        // 将ETH地址转换为Wormhole期望的格式
        const recipientAddress = tryNativeToHexString(ethAddress, chainId);

        // 创建跨链桥交易
        const { transaction, latestBlockhash } = await createBridgeTransaction({
          publicKey: wallet.publicKey,
          ethDestination: recipientAddress,
          amount,
          connection,
          chainId,
        });

        // 发送交易
        signature = await wallet.sendTransaction(transaction, connection);

        // 确认交易
        const confirm = await connection.confirmTransaction(
          { signature, ...latestBlockhash },
          "confirmed"
        );
        console.log("confirm", confirm);
        // 获取序列号用于跟踪跨链状态
        const sequence = parseSequenceFromLogSolana(confirm.value);

        // 获取发送方地址
        const emitterAddress = await getEmitterAddressSolana(
          WORMHOLE_SOLANA_TOKEN_BRIDGE
        );

        toast.success("跨链转账发起成功！");
        return {
          signature,
          sequence,
          emitterAddress,
        };
      } catch (error: unknown) {
        console.error("跨链转账失败:", error);
        toast.error(`跨链转账失败: ${error}`);
        throw error;
      }
    },
    onSuccess: (data) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["get-balance"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["get-bridge-history"],
        }),
      ]);
    },
  });
}

async function createBridgeTransaction({
  publicKey,
  ethDestination,
  amount,
  connection,
  chainId,
}: {
  publicKey: PublicKey;
  ethDestination: string;
  amount: number;
  connection: Connection;
  chainId: number;
}) {
  const latestBlockhash = await connection.getLatestBlockhash();

  // 使用Wormhole SDK创建转账交易
  const transferResult = await transferNativeSol(
    connection,
    WORMHOLE_SOLANA_BRIDGE,
    WORMHOLE_SOLANA_TOKEN_BRIDGE,
    publicKey?.toBase58(),
    amount * LAMPORTS_PER_SOL,
    ethDestination,
    chainId
  );

  return {
    transaction: transferResult,
    latestBlockhash,
  };
}
