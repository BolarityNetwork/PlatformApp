"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey, Transaction } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAnchorProvider } from "@/providers/solana-provider";
import { useCluster } from "@/providers/cluster-provider";
import {
  getDappInitNFTProgram,
  getDappInitNFTProgramId,
  getDappInitProgram,
  getDappInitProgramId,
} from "@/anchor/setup";
import { toast } from "sonner";

import { useMemo } from "react";
import {
  ellipsify,
  hexStringToUint8Array,
  idToBuf,
  solanaChainIdBuf,
  writeBigUint64LE,
} from "@/lib/utils";
import { WORMHOLE_CONTRACTS } from "@/config/solala";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { web3 } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

export function useDappInitProgram() {
  const { connection } = useConnection();
  const { cluster, getExplorerUrl } = useCluster();
  const { sendTransaction } = useWallet();

  const provider = useAnchorProvider();
  const HELLO_WORLD_PID = useMemo(
    () => getDappInitProgramId(cluster.network as Cluster),
    [cluster]
  );
  const NFT_PID = useMemo(
    () => getDappInitNFTProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = useMemo(
    () => getDappInitProgram(provider, HELLO_WORLD_PID),
    [provider, HELLO_WORLD_PID]
  );
  const nft_program = useMemo(
    () => getDappInitNFTProgram(provider, NFT_PID),
    [provider, NFT_PID]
  );
  const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);

  // 这个函数计算 ProofRecord 的 PDA 地址
  const calculateProofRecordPda = (
    tokenID: number,
    evmAddress: string,
    nftContract: string
  ) => {
    const idBuf = idToBuf(tokenID);
    const proxyAddressBuf = Buffer.from(hexStringToUint8Array(evmAddress)); // your proxy evm address

    const payloadBuf = Buffer.concat([
      proxyAddressBuf,
      Buffer.from(hexStringToUint8Array(nftContract)), // nft contract
      idBuf,
      Buffer.alloc(32),
      HELLO_WORLD_PID.toBuffer(),
      solanaChainIdBuf,
    ]);

    return deriveAddress(
      [
        Buffer.from("proof"),
        payloadBuf.slice(20, 40),
        payloadBuf.slice(40, 48),
      ],
      NFT_PID
    );
  };

  // 手动查询 ProofRecord 的函数 (使用 mutation 风格)
  // 返回一个 mutation 对象，可以手动调用
  const getproofRecord = useMutation({
    mutationKey: ["bolarity", "proof_record_fetch", { cluster }],
    mutationFn: async ({
      tokenID,
      evmAddress,
      nftContract,
    }: {
      tokenID: number;
      evmAddress: string;
      nftContract: string;
    }) => {
      // 计算 PDA 地址
      const proofRecordPda = calculateProofRecordPda(
        tokenID,
        evmAddress,
        nftContract
      );
      console.log(
        "Using proofRecordPda for mutation:",
        proofRecordPda.toString()
      );
      try {
        const result = await nft_program.account.proofRecord.fetch(
          proofRecordPda
        );
        console.log("Mutation fetch result:", result);
        return result;
      } catch (error) {
        console.error("Error in mutation fetch:", error);
        throw error;
      }
    },
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(NFT_PID),
  });

  const initialize = useMutation({
    mutationKey: ["balority", "send-message", { cluster }],
    mutationFn: async ({
      message,
      solPublicKey,
      title = "Transaction", // 添加默认值为 "Transaction" 的 title 参数
    }: {
      message: string;
      solPublicKey: PublicKey;
      title?: string; // 可选参数
    }) => {
      const realConfig = deriveAddress(
        [Buffer.from("config")],
        HELLO_WORLD_PID
      );

      const message2 = await getProgramSequenceTracker(
        connection,
        HELLO_WORLD_PID,
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
      //   const _latestBlockhash = await connection.getLatestBlockhash();

      const wormholeAccounts2 = getPostMessageCpiAccounts(
        // program.programId,
        HELLO_WORLD_PID,
        CORE_BRIDGE_PID,
        solPublicKey,
        message2
      );
      const params = {
        config: realConfig,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts2,
      };
      console.log("message---", message);
      const payload = Buffer.from(hexStringToUint8Array(message));
      console.log("payload---", payload);

      //   return program.methods.sendMessage(payload).accountsStrict(params).rpc();
      return program.methods.sendMessage(payload).accountsStrict(params).rpc();
    },

    onSuccess: (signature, variables) => {
      console.log("variables.title---", variables);
      console.log("Transaction signature:", signature);
      if (signature) {
        // 使用传入的 title 参数作为 toast 标题
        toast.success(`${variables.title || "Transaction"} Success`, {
          description: ellipsify(signature),
          action: {
            label: "Explorer Link",
            onClick: () =>
              window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
        // accounts.refetch();
      }
      return signature;
    },
    onError: (error) => {
      console.error("Initialize error:", error);
    },
  });
  const nft_initialize = useMutation({
    mutationKey: ["balority", "create-proof-record", { cluster }],
    mutationFn: async ({
      solPublicKey,
      title = "Transaction", // 添加默认值为 "Transaction" 的 title 参数
      tokenID,
      nftContract,
      evmAddress,
    }: {
      solPublicKey: PublicKey;
      title?: string; // 可选参数
      tokenID: number;
      nftContract: Buffer;
      //   evmAddress: string;
      evmAddress: Buffer;
    }) => {
      console.log("createProofRecord---nft--", NFT_PID);
      console.log("createProofRecord----nft =-programs--", nft_program);
      const idBuf = idToBuf(tokenID);

      const chainIdBuf = Buffer.alloc(2);
      chainIdBuf.writeUInt16LE(10002);

      const payloadBuf = Buffer.concat([
        evmAddress,
        nftContract,
        idBuf,
        Buffer.alloc(32),
        HELLO_WORLD_PID.toBuffer(),
        chainIdBuf,
      ]);

      const proofRecordPda = deriveAddress(
        [
          Buffer.from("proof"),
          payloadBuf.slice(20, 40),
          payloadBuf.slice(40, 48),
        ],
        NFT_PID
      );
      const [statePda, _bump] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        NFT_PID
      );

      // 导入SystemProgram ID
      const SystemProgram = web3.SystemProgram.programId;
      const params = {
        payer: solPublicKey, // 添加付款人账户
        state: statePda,
        proofRecord: proofRecordPda,
        systemProgram: SystemProgram, // 添加系统程序账户
      };

      return nft_program.methods
        .createProofRecord(payloadBuf)
        .accountsStrict(params)
        .rpc();
    },

    onSuccess: (signature, variables) => {
      console.log("variables.title---", variables);
      console.log("Transaction signature:", signature);
      if (signature) {
        // 使用传入的 title 参数作为 toast 标题
        toast.success(`${variables.title || "Transaction"} Success`, {
          description: ellipsify(signature),
          action: {
            label: "Explorer Link",
            onClick: () =>
              window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
        // accounts.refetch();
      }
      return signature;
    },
    onError: (error) => {
      console.error("Initialize error:", error);
    },
  });
  const claim_token_initialize = useMutation({
    mutationKey: ["balority", "claim-tokens", { cluster }],
    mutationFn: async ({
      solAddress,
      title = "Transaction", // 添加默认值为 "Transaction" 的 title 参数
      tokenID,
      nftContract,
      tokenClaimGrogram,
      mintAddress,
    }: {
      solAddress: string;
      mintAddress: string;
      //   solPublicKey: PublicKey;
      title?: string; // 可选参数
      tokenID: number;
      nftContract: string;
      tokenClaimGrogram: string;
    }) => {
      const idBuf = idToBuf(tokenID);
      const tokenProgram = new PublicKey(tokenClaimGrogram);
      const mint = new PublicKey(mintAddress);
      const solPublicKey = new PublicKey(solAddress);

      const payloadBuf = Buffer.concat([
        Buffer.alloc(20),
        Buffer.from(hexStringToUint8Array(nftContract)), // nft contract
        idBuf,
        Buffer.alloc(32),
      ]);
      const [statePda, _bump] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        NFT_PID
      );

      const [proofRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proof"),
          payloadBuf.slice(20, 40),
          payloadBuf.slice(40, 48),
        ],
        NFT_PID
      );

      const token_vault_ata = await getAssociatedTokenAddress(
        mint,
        statePda,
        true
      );

      const receiver_ata = await getAssociatedTokenAddress(
        mint,
        solPublicKey,
        false
      );

      const receiverAccountInfo = await connection.getAccountInfo(receiver_ata);
      console.log("receiverAccountInfo---", receiverAccountInfo);
      const _latestBlockhash = await connection.getLatestBlockhash();

      if (!receiverAccountInfo) {
        const _transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            solPublicKey,
            receiver_ata,
            solPublicKey,
            mint
          )
        );
        // Send transaction to create account
        // const _latestBlockhash = await connection.getLatestBlockhash();
        const _signature = await sendTransaction(_transaction, connection);
        await connection.confirmTransaction(
          { signature: _signature, ..._latestBlockhash },
          "confirmed"
        );

        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
      }
      const params = {
        receiver: solPublicKey, // 添加收款人账户
        state: statePda,
        tokenVault: token_vault_ata,
        proofRecord: proofRecordPda,
        receiverTokenAccount: receiver_ata,
        tokenProgram,
      };

      return nft_program.methods.claimTokens().accountsStrict(params).rpc();
    },

    onSuccess: (signature, variables) => {
      if (signature) {
        // 使用传入的 title 参数作为 toast 标题
        toast.success(`${variables.title || "Transaction"} Success`, {
          description: ellipsify(signature),
          action: {
            label: "Explorer Link",
            onClick: () =>
              window.open(getExplorerUrl(`tx/${signature}`), "_blank"),
          },
          duration: 10000,
        });
        // accounts.refetch();
      }
      return signature;
    },
    onError: (error) => {
      console.error("Initialize error:", error);
    },
  });

  return {
    NFT_PID,
    nft_program,
    program,
    HELLO_WORLD_PID,
    getproofRecord,
    getProgramAccount,
    initialize,
    nft_initialize,
    claim_token_initialize,
  };
}
