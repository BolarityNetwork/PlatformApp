import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

import {
  getProvider,
  hexStringToUint8Array,
  writeBigUint64LE,
  solanaChainIdBuf,
  idToBuf,
} from "@/lib/utils";

import * as anchor from "@coral-xyz/anchor";
import { IDL, NFT_VERIFICATION_IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { CLAIM_TOKEN_CONTRACT, TOKEN_CLAIM_PROGRAM } from "@/config";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { WORMHOLE_CONTRACTS } from "@/config/solala";
import { useOnSendTransaction } from "@/hooks/useWormHole";

export const campaignUseWormHole = () => {
  const {
    signTransaction,
    signAllTransactions,
    sendTransaction,
    publicKey: solPublicKey,
  } = useWallet();
  const { connection } = useConnection();
  const { evmAddress, solAddress } = useBolarityWalletProvider();
  const { createAssociatedTokenAccount } = useOnSendTransaction();

  const provider = getProvider(
    {
      signTransaction,
      signAllTransactions,
      publicKey: solPublicKey,
    },
    connection
  );

  const program = new anchor.Program(IDL!, provider);
  const HELLO_WORLD_PID = program.programId;
  const nftVerificationProgram = new anchor.Program(
    NFT_VERIFICATION_IDL!,
    provider
  );
  const NFT_VERIFICATION_PID = nftVerificationProgram.programId;

  const check_proof_record = async (tokenID: number, nftContract: string) => {
    console.log("-check_proof_record----tokenID----", tokenID);
    console.log("-check_proof_record----nftContract----", nftContract);
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
    const proofRecordPda = deriveAddress(
      [
        Buffer.from("proof"),
        payloadBuf.slice(20, 40),
        payloadBuf.slice(40, 48),
      ],
      NFT_VERIFICATION_PID
    );

    try {
      const accountInfo = await provider.connection.getAccountInfo(
        proofRecordPda
      );
      if (!accountInfo) {
        console.error("Account does not exist:", proofRecordPda.toBase58());
        throw new Error("Account does not exist or has no data");
      }
      const data = await nftVerificationProgram.account.proofRecord.fetch(
        proofRecordPda
      );
      console.log("data:", data);
      return data;
    } catch (error) {
      console.error("Failed to fetch proof record:", error);
    }
  };

  const onSendTransaction = async (
    solanaPublicKey: PublicKey,
    txPayload: any,
    tokenID: number,
    nftContract: string
  ) => {
    const idBuf = idToBuf(tokenID);
    const proxyAddressBuf = Buffer.from(hexStringToUint8Array(evmAddress)); // your proxy evm address

    const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
    const chainIdBuf = Buffer.alloc(2);
    chainIdBuf.writeUInt16LE(10002);
    const payloadBuf = Buffer.concat([
      proxyAddressBuf,
      Buffer.from(hexStringToUint8Array(nftContract)), // nft contract
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
      NFT_VERIFICATION_PID
    );
    const [statePda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      NFT_VERIFICATION_PID
    );

    const realConfig2 = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);

    // Split the payload into two parts and add metadata
    const message = hexStringToUint8Array(txPayload);

    try {
      // 导入SystemProgram ID
      const SystemProgram = anchor.web3.SystemProgram.programId;

      const params = {
        payer: solanaPublicKey, // 添加付款人账户
        state: statePda,
        proofRecord: proofRecordPda,
        systemProgram: SystemProgram, // 添加系统程序账户
      };

      // First transaction
      const ix1 = nftVerificationProgram.methods.createProofRecord(payloadBuf);
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = solanaPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log("Sending first part of split transaction...");
      const signature1 = await sendTransaction(tx3, connection);
      const latestBlockhash1 = await connection.getLatestBlockhash();

      // Confirm first transaction
      console.log("Confirming first transaction...");
      await connection.confirmTransaction(
        { signature: signature1, ...latestBlockhash1 },
        "confirmed"
      );

      console.log("First transaction confirmed! Signature:", signature1);

      // 为第二次交易生成新的消息地址和序列号
      console.log("Generating new message address for second transaction...");
      const message3 = await getProgramSequenceTracker(
        connection,
        HELLO_WORLD_PID,
        CORE_BRIDGE_PID
      )
        .then((tracker) =>
          deriveAddress(
            [
              Buffer.from("sent"),
              (() => writeBigUint64LE(tracker.sequence + BigInt(1)))(),
            ],
            HELLO_WORLD_PID
          )
        )
        .catch((err) => {
          toast.error(
            "Failed to get program sequence tracker for second transaction"
          );
          console.log("err getting sequence for second transaction:", err);
          throw err;
        });

      if (!message3) {
        throw new Error(
          "Failed to generate message address for second transaction"
        );
      }

      console.log(
        "New message address for second transaction:",
        message3.toString()
      );

      // 为第二次交易获取新的账户列表
      const wormholeAccounts3 = getPostMessageCpiAccounts(
        program.programId,
        CORE_BRIDGE_PID,
        solanaPublicKey,
        message3
      );

      // 构建第二次交易的参数
      const params2 = {
        config: realConfig2,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts3,
      };

      // Second transaction with new message address
      const ix4 = program.methods.sendMessage(Buffer.from(message));
      const ix5 = ix4.accountsStrict(params2);
      const ix6 = await ix5.instruction();
      const tx4 = new Transaction().add(ix6);
      tx4.feePayer = solanaPublicKey;
      tx4.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Add a short delay before sending the second transaction
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay

      console.log("Sending second part of split transaction...");
      const signature2 = await sendTransaction(tx4, connection);
      const latestBlockhash2 = await connection.getLatestBlockhash();

      // Confirm second transaction
      console.log("Confirming second transaction...");
      await connection.confirmTransaction(
        { signature: signature2, ...latestBlockhash2 },
        "confirmed"
      );
      console.log("Second transaction confirmed! Signature:", signature2);

      return { signature1, signature2 };
    } catch (error: any) {
      console.error("Transaction failed:", error);
      toast.error(`Transaction failed: ${error.message}`);
      throw error; // Rethrow to let calling code handle the error
    }
  };

  const claim_token = async (tokenID: number, nftContract: string) => {
    const idBuf = idToBuf(tokenID);
    const mint = new PublicKey(CLAIM_TOKEN_CONTRACT);
    const fromPubkey = new PublicKey(solAddress);
    const payloadBuf = Buffer.concat([
      Buffer.alloc(20),
      Buffer.from(hexStringToUint8Array(nftContract)), // nft contract
      idBuf,
      Buffer.alloc(32),
    ]);

    const [statePda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      NFT_VERIFICATION_PID
    );

    const [proofRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        payloadBuf.slice(20, 40),
        payloadBuf.slice(40, 48),
      ],
      NFT_VERIFICATION_PID
    );

    const token_vault_ata = await getAssociatedTokenAddress(
      mint,
      statePda,
      true
    );

    const receiver_ata = await getAssociatedTokenAddress(
      mint,
      fromPubkey,
      false
    );

    const receiverAccountInfo = await connection.getAccountInfo(receiver_ata);
    console.log("receiverAccountInfo:", receiverAccountInfo);

    // 如果接收方没有关联账户,则创建一个
    if (!receiverAccountInfo) {
      console.log("创建中");
      const created = await createAssociatedTokenAccount({
        payer: fromPubkey,
        associatedTokenAddress: receiver_ata,
        owner: fromPubkey,
        mint,
      });
      if (!created) {
        toast.error("创建接收方账户失败");
        return false;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay

    const tokenProgram = new PublicKey(TOKEN_CLAIM_PROGRAM);
    try {
      //  claim token合约到参数
      const params = {
        receiver: fromPubkey,
        state: statePda,
        tokenVault: token_vault_ata,
        proofRecord: proofRecordPda,
        receiverTokenAccount: receiver_ata,
        tokenProgram,
      };

      // First transaction
      const ix1 = nftVerificationProgram.methods.claimTokens();
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = fromPubkey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      console.log("Sending first part of split transaction...");
      const signature1 = await sendTransaction(tx3, connection);
      const latestBlockhash1 = await connection.getLatestBlockhash();

      // Confirm first transaction
      console.log("Confirming first transaction...");
      await connection.confirmTransaction(
        { signature: signature1, ...latestBlockhash1 },
        "confirmed"
      );

      console.log("First transaction confirmed! Signature:", signature1);

      return signature1;
    } catch (error: any) {
      console.error("Transaction failed:", error);
      console.log("Transaction failed:", error.message);
      toast.error(`Transaction failed: ${error.message}`);
      throw error; // Rethrow to let calling code handle the error
    }
  };

  return {
    onSendTransaction,
    check_proof_record,
    claim_token,
  };
};
