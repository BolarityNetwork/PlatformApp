import { hexStringToUint8Array, rightAlignBuffer } from "@/lib/utils";

import { serialize } from "borsh";
import {
  NFT_PROOF_CONTRACT,
  NFT_VERIFICATION_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
} from "@/config";
import { PublicKey } from "@solana/web3.js";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  RawDataSchema,
  SEPOLIA_CHAIN_ID,
  accountMetaList,
  encodeMeta,
} from "@/config/solala";
import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  toBytes,
  toHex,
} from "viem";
import { campaignUseWormHole } from "./campaign-useWormHole";
import {
  idToBuf,
  solanaPayloadHead,
  sepoliaPayloadHead,
  solanaChainIdBuf,
} from "@/lib/utils";

import { functionSig, payloadSchema } from "./campaign-data";

// NFT Card component extracted for better organization
export const campaignProofNft = () => {
  // 获取当前sol钱包地址+proxy eth address
  const { evmAddress, solAddress } = useBolarityWalletProvider();
  const { onSendTransaction } = campaignUseWormHole();
  const sendProof = async (tokenID: number, contract: string) => {
    const solanaPublicKey = new PublicKey(solAddress);
    const evmAddressBuf = Buffer.from(hexStringToUint8Array(evmAddress));
    const contractBuf = Buffer.from(hexStringToUint8Array(contract));
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBuffer()))]
    );
    // 20+20+8+32
    const payloadBuf = Buffer.concat([
      evmAddressBuf,
      contractBuf,
      idToBuf(tokenID),
      Buffer.alloc(32),
    ]);
    console.log("sendProof----payloadBuf", payloadBuf);
    const [proofRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        payloadBuf.slice(20, 40),
        payloadBuf.slice(40, 48),
      ],
      new PublicKey(NFT_VERIFICATION_CONTRACT)
    );

    const paraEncode = serialize(payloadSchema, { payload: payloadBuf });
    let encodedParams = Buffer.concat([functionSig, paraEncode]);
    const ethAddress = rightAlignBuffer(evmAddressBuf);

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          const buf = Buffer.alloc(2);
          buf.writeUInt16LE(SEPOLIA_CHAIN_ID);
          return buf;
        })(),
        ethAddress,
      ],
      new PublicKey(BOLARITY_SOLANA_CONTRACT)
    );

    let RawData = {
      chain_id: SEPOLIA_CHAIN_ID,
      caller: new PublicKey(ethAddress).toBuffer(),
      programId: new PublicKey(NFT_VERIFICATION_CONTRACT).toBuffer(),
      acc_count: 2,
      accounts: [
        {
          key: realForeignEmitter.toBuffer(),
          isWritable: accountMetaList[0].writeable,
          isSigner: accountMetaList[0].is_signer,
        },
        {
          key: proofRecordPda.toBuffer(),
          isWritable: accountMetaList[1].writeable,
          isSigner: accountMetaList[1].is_signer,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };

    let RawDataEncoded = serialize(RawDataSchema, RawData);
    console.log("RawDataEncoded", RawDataEncoded);
    console.log("RawDataEncoded", toHex(RawDataEncoded));
    let payloadSend = encodeAbiParameters(
      [{ type: "bytes" }],
      [
        bytesToHex(
          Buffer.concat([sepoliaPayloadHead, Buffer.from(RawDataEncoded)])
        ),
      ]
    );

    const nftContractToken = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.concat([solanaChainIdBuf, idToBuf(tokenID), contractBuf]))]
    );

    const contract_address = pad(toHex(toBytes(NFT_PROOF_CONTRACT)), {
      size: 32,
      dir: "left",
    });
    const newContractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contract_address]
    );
    //NFT contract address
    console.log("contract_address", contract_address);
    let ABI = [
      "function sendProof(bytes32 nftContractToken, bytes calldata payload)",
    ];

    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: parseAbi(ABI),
      functionName: "sendProof",
      args: [nftContractToken, payloadSend],
    });

    const payLoadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [newContractAddress, BigInt(0), paras]
    );

    const payload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [bytesToHex(solanaPayloadHead), userAddress, payLoadPart]
    );

    console.log("payload", payload);

    try {
      // Using the split transaction functionality implemented in useWormHole.ts
      const result = await onSendTransaction(
        solanaPublicKey,
        payload,
        tokenID,
        contract
      );

      if (!result) {
        throw new Error("Transaction failed: no signatures returned");
      }

      const { signature1, signature2 } = result;

      console.log("First transaction signature:", signature1);
      console.log("Second transaction signature:", signature2);

      // Return both signatures for any additional processing
      return { signature1, signature2 };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
    // ----------------------------------
  };

  return { sendProof };
};
