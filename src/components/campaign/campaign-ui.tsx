import { Button } from "@/components/ui/button";

import { functionSig, NFTItem, payloadSchema } from "./campaign-data";
import Image from "next/image";

import {
  cn,
  hexStringToUint8Array,
  idToBuf,
  rightAlignBuffer,
  sepoliaPayloadHead,
  solanaChainIdBuf,
  solanaPayloadHead,
} from "@/lib/utils";

import {
  BOLARITY_SOLANA_CONTRACT,
  CLAIM_TOKEN_CONTRACT,
  NFT_BASE_ABI,
  NFT_PROOF_CONTRACT,
  SupportChain,
  TOKEN_CLAIM_PROGRAM,
} from "@/config";
import { PublicKey } from "@solana/web3.js";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { publicClient } from "@/config/wagmi";

import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  toBytes,
  toHex,
} from "viem";
import { toast } from "sonner";

import { useEffect, useState } from "react";
import LoadingSpinner from "../ui/loading-spinner";

import { MintModal, MintNftModal } from "./campaign-transferNft";
import { useDappInitProgram } from "@/hooks/transfer/solMethod";
import { serialize } from "borsh";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  accountMetaList,
  encodeMeta,
  RawDataSchema,
  SEPOLIA_CHAIN_ID,
} from "@/config/solala";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";

const MAXATTEMPTS = 60; // 1分钟 = 60秒

// NFT Card component extracted for better organization
export const NFTCard = ({ nft, index }: { nft: NFTItem; index: number }) => {
  const { evmAddress, solAddress, ChainType } = useBolarityWalletProvider();

  const {
    initialize,
    getproofRecord,
    claim_token_initialize,
    nft_initialize,
    NFT_PID,
  } = useDappInitProgram();

  const [tokenID, setTokenID] = useState(0);
  // mint loading
  const [mintStatus, setMintStatus] = useState(false);
  // claim loading
  const [claimLoadingStatus, setClaimLoadingStatus] = useState(false);
  const [claimStatus, setClaimStatus] = useState(false);

  useEffect(() => {
    if (!evmAddress || !nft.contract) return;
    CheckMintStatus(false);
  }, [evmAddress]);
  useEffect(() => {
    if (!tokenID) return;
    check_proof_record_status();
  }, [tokenID]);

  const sendProof = async (tokenID: number, contract: string) => {
    const solanaPublicKey = new PublicKey(solAddress);
    const NFT_PROGRAM_ID = new PublicKey(NFT_PID);
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
      NFT_PROGRAM_ID
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
      programId: NFT_PROGRAM_ID.toBuffer(),
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
      // 先执行第一个请求
      const tx1 = await nft_initialize.mutateAsync({
        solPublicKey: solanaPublicKey,
        title: "createProofRecord",
        tokenID,
        evmAddress: evmAddressBuf,
        nftContract: contractBuf,
      });

      console.log("First transaction complete:", tx1);

      // 暂停2秒
      console.log("Waiting 2 seconds before sending second transaction...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 执行第二个请求
      const tx2 = await initialize.mutateAsync({
        message: payload,
        solPublicKey: solanaPublicKey,
        title: "ProofRecord",
      });

      console.log("Second transaction complete:", tx2);

      const result = [tx1, tx2];
      console.log("Both transactions completed:", result);

      if (!result) {
        throw new Error("Transaction failed: no signatures returned");
      }

      // 返回两个交易签名，保持原来的属性名称以保持兼容性
      return { signature1: tx1, signature2: tx2 };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  };

  // 读取nft 2种方法，1.根据合约查询nft,2.根据钱包地址查询nft
  // 初始化时，建议用方法2
  const CheckMintStatus = async (isReturn = true) => {
    try {
      const allowanceStatus: any = await publicClient.readContract({
        address: nft.contract as `0x${string}`,
        abi: NFT_BASE_ABI.abi,
        functionName: "getOwnedTokens",
        args: [evmAddress],
      });
      console.log("mint---eStatus", allowanceStatus);
      if (isReturn) return allowanceStatus;
      if (allowanceStatus?.length) {
        setTokenID(Number(allowanceStatus[allowanceStatus.length - 1]));
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
    }
  };

  // 检查nft mint状态 轮询
  const setintervalCheckMintStatus = () => {
    // 设置最大尝试次数 (60秒 / 1秒间隔 = 60次尝试)
    let attempts = 0;

    const intervalTime = setInterval(async () => {
      console.log("mintStatus---CheckMintStatus", attempts);
      attempts++;

      // 检查是否超时
      if (attempts >= MAXATTEMPTS) {
        clearInterval(intervalTime);
        toast.error("Mint timeout after 1 minute,Please try again");
        setMintStatus(false);
        return;
      }

      // 检查铸造状态
      const mintStatus: any = await CheckMintStatus();
      console.log("mintStatus---CheckMintStatus", mintStatus);
      // if (mintStatus.length > 0) {
      if (mintStatus?.length) {
        clearInterval(intervalTime);
        toast.success("Mint Success");
        setMintStatus(false);
        // setTokenID(Number(mintStatus[0]));
        setTokenID(Number(mintStatus[0]));
      }
    }, 1000);
  };

  // sol mint nft
  const sol_MintNftInit = async () => {
    setMintStatus(true);
    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBuffer()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(nft.contract)), {
      size: 32,
      dir: "left",
    });
    const nftContractToken = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );

    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: NFT_BASE_ABI.abi,
      functionName: "mint",
      args: [],
    });
    console.log("paras", paras);
    const payLoadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [nftContractToken, BigInt(0), bytesToHex(toBytes(paras))]
    );
    console.log("payLoadPart", payLoadPart);
    console.log("solanaPayloadHead", bytesToHex(solanaPayloadHead));

    const payload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [bytesToHex(solanaPayloadHead), userAddress, payLoadPart]
    );

    try {
      const signature = await initialize.mutateAsync({
        message: payload,
        solPublicKey: solanaPublicKey,
      });
      console.log("mint--", signature);
      if (signature) {
        setintervalCheckMintStatus();
      }
    } catch (e: unknown) {
      console.log("approve---", e);
      toast.error("Mint Failed.");
      setMintStatus(false);
    }
  };

  const claimTokenFunc = async () => {
    try {
      console.log("claimTokenFunc", tokenID);
      const signature1 = await claim_token_initialize.mutateAsync({
        solAddress,
        title: "Claim Token", // 添加默认值为 "Transaction" 的 title 参数
        tokenID,
        nftContract: nft.contract,
        tokenClaimGrogram: TOKEN_CLAIM_PROGRAM,
        mintAddress: CLAIM_TOKEN_CONTRACT,
      });
      console.log("claim_token", signature1);
      if (signature1) {
        check_proof_record_status();
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error("Claim Token.");
      setMintStatus(false);
      setClaimLoadingStatus(false);
    }
  };
  /**
   * @description claim按钮流程
   * 1.检查mint status
   * 2.执行proof 有2次弹框
   * 3.proof完成后检查状态，initialized为ture（查询时间大概30s内）
   * 4.执行claim token方法
   * 5.检查是否有ata，若没就执行创建（1次弹框），有就跳过
   * 6.执行claimTokens方法（1次弹框）
   * 7.第6步完成后，再check_proof_record，data?.claimed为true
   */

  const sol_sendProofFunc = async () => {
    setClaimLoadingStatus(true);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    try {
      console.log("sendProofFunc", tokenID);

      const getToken = await CheckMintStatus();
      console.log("getToken---", getToken);
      if (!getToken?.length) {
        toast.error("Claim Failed.Please try again.");
        setClaimLoadingStatus(false);
        return;
      }
      console.log("sendProofFunc", getToken);

      const { signature1, signature2 } = await sendProof(
        Number(getToken[getToken.length - 1]),
        nft.contract
      );
      console.log("signature1----1----", signature1);
      console.log("signature1----1---2-", signature2);

      if (signature1 && signature2) {
        // 第二部成功后先判断 proof状态
        // 不能马上差，建议间隔几s
        setTimeout(() => {
          comfirm_claim(tokenID);
        }, 5000);
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error("Mint Failed.");
      setMintStatus(false);
      setClaimLoadingStatus(false);
    }
  };
  /**
   *@description Solana发到evm，记录到spy即可，0.4秒
   *Relayer 查询到需求，发送proof 生成命令到evm智能合约执行proof 生成，预计最多12秒，最短1秒
   *proof被发送到spy，Relayer递交至Solana 合约，处理时间约0.4秒，
   *查询预计延迟，0.4秒
   *合计时间，2.2-13.2秒
   * */
  const comfirm_claim = (id: number) => {
    toast("Claim Bolarity", {
      description: (
        <div className="flex flex-col gap-2">
          <p>
            The proof has been successfully generated, click “Continue“ to
            process the Bolarity Test Token Claim.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                toast.dismiss();
                setClaimLoadingStatus(false);
                setMintStatus(false);
                console.log("Cancel!");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.dismiss();
                setTimeout(() => {
                  checkProofStatus(id);
                }, 1000);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      ),
      duration: Infinity,
      position: "bottom-right",
    });
  };

  // 检查nft sproof状态 轮询，如果有就执行claim token，超过1分钟则提示失败
  const checkProofStatus = async (id: number) => {
    // 创建轮询定时器
    let attemptCount = 0;

    const toastId = toast.loading(
      "Checking the initialization status; please wait a moment.",
      // "Checking status of the initialized,waiting a moment",
      {
        position: "top-right",
        duration: Infinity, // 设置为无限时长，手动控制关闭
      }
    );

    const intervalTime = setInterval(async () => {
      attemptCount++;

      // 超过1分钟（60次尝试）则提示失败
      if (attemptCount >= MAXATTEMPTS) {
        toast.dismiss(toastId);
        clearInterval(intervalTime);
        setClaimLoadingStatus(false);

        // toast.error("操作超时！请检查网络连接后重试。", {
        toast.error("Claim Token Failed.", {
          position: "top-right",
          duration: 5000,
        });
        console.error("NFT验证超时，已超过1分钟未成功");
      }
      // 查询 proof record
      const data = await getproofRecord.mutateAsync({
        tokenID: id,
        evmAddress,
        nftContract: nft.contract,
      });

      console.log("Proof record check result:", data);
      console.log(
        "setintervalCheckClaimStatus",
        data,
        `尝试次数: ${attemptCount}/${MAXATTEMPTS}`
      );

      if (data?.initialized) {
        toast.dismiss(toastId);
        clearInterval(intervalTime);
        claimTokenFunc();
        return;
      }
    }, 1000);
  };

  const check_proof_record_status = async () => {
    if (!tokenID) return;
    console.log("tokenID", tokenID);

    try {
      const data = await getproofRecord.mutateAsync({
        tokenID,
        evmAddress,
        nftContract: nft.contract,
      });
      console.log("check_proof_record_status", data);
      if (data?.claimed) {
        setClaimStatus(true);
        setClaimLoadingStatus(false);
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      setClaimLoadingStatus(false);
    }
  };

  const {
    EthControll,
    isLoading: isEthLoading,
    setToastTitle,
  } = ethContractTransfer();
  useEffect(() => {
    if (!isEthLoading) {
      setintervalCheckMintStatus();
    }
  }, [isEthLoading]);

  // ETH mint nft
  const eth_mintNftInit = async () => {
    try {
      setMintStatus(true);

      setToastTitle("Mint NFT");
      const resHash = await EthControll({
        abi: NFT_BASE_ABI.abi,
        address: nft.contract as `0x${string}`,
        functionName: "mint",
        args: [],
      });

      console.log("resHash", resHash);
    } catch (e) {
      console.log("error--isEthSumbit:", e);
    }
  };

  return (
    <div className="bg-background rounded-xl overflow-hidden border border-ring transition-transform duration-200 ease-in-out flex flex-col hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col justify-center items-center h-48 bg-secondary relative overflow-hidden before:content-[''] before:animate-rotate before:absolute before:inset-0 before:bg-gradient-to-br before:from-[rgba(0,230,118,0.15)] before:to-[rgba(255,62,62,0.15)]">
        <Image src={nft.imgUrl} width={200} height={200} alt="NFT" />
        <MintModal
          txHash={nft.contract}
          id={tokenID}
          imgUrl={nft.imgUrl}
          description={nft.description}
          evmAddress={evmAddress}
        />
      </div>
      <div className="px-4 py-7 flex flex-col flex-grow">
        <div className="text-lg font-bold mb-2">{nft.name}</div>
        <div className="mb-4 leading-normal text-sm text-gray-500">
          {nft.description.length > 100
            ? nft.description.slice(0, 100) + "......"
            : nft.description}
        </div>
        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-base">Ξ</span>
            <span className="text-base font-bold">
              {/* {nft.price} {nft.currency} */}#00{index + 1}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {/* <span className="text-xs">#{nft.id}</span> */}
          </div>
        </div>
      </div>
      <div className="action-buttons flex justify-between p-4 border-t">
        {(tokenID && (
          <MintNftModal
            symbol={nft.symbol}
            isStatus={true}
            txHash={evmAddress}
          />
        )) || (
          <Button
            variant="default"
            className={cn("font-bold gap-2 w-[48%]")}
            disabled={mintStatus}
            onClick={() => {
              if (!nft.contract)
                return toast.warning(`${nft.name} NFT comming soon`);

              if (ChainType === SupportChain.Solana) {
                sol_MintNftInit();
              } else {
                eth_mintNftInit();
              }
            }}
          >
            {mintStatus ? (
              <>
                <LoadingSpinner />
                Minting
              </>
            ) : (
              "Mint NFT"
            )}
          </Button>
        )}

        {(claimStatus && (
          <MintNftModal symbol={nft.symbol} txHash={solAddress} />
        )) ||
          (tokenID && (
            <Button
              className="font-bold gap-2 w-[48%]"
              variant="default"
              disabled={claimLoadingStatus}
              onClick={() => {
                if (!nft.contract)
                  return toast.warning(`${nft.name} NFT comming soon`);

                if (ChainType === SupportChain.Solana) {
                  sol_sendProofFunc();
                } else {
                  toast.warning("Please login with SVM account");
                }
              }}
            >
              {claimLoadingStatus ? (
                <>
                  <LoadingSpinner />
                  Verifying
                </>
              ) : (
                "Claim Token"
              )}
            </Button>
          )) || (
            <Button
              className="font-bold gap-2 w-[48%]"
              variant="secondary"
              disabled={true}
            >
              Claim Token
            </Button>
          )}
      </div>
    </div>
  );
};
