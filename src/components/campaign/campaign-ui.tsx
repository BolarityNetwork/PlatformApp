import { Button } from "@/components/ui/button";

import { NFTItem } from "./campaign-data";
import Image from "next/image";

import {
  cn,
  getExplorerLink,
  handleTransactionSuccess,
  solanaPayloadHead,
} from "@/lib/utils";

import { NFT_BASE_ABI, SupportChain } from "@/config";
import { PublicKey } from "@solana/web3.js";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { publicClient } from "@/config/wagmi";

import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  toBytes,
  toHex,
} from "viem";
import { toast } from "sonner";
import { useWriteContract } from "wagmi";
import { useOnSendTransaction } from "@/hooks/useWormHole";
import { campaignProofNft } from "./campaign-proofNft";

import { useState } from "react";
import LoadingSpinner from "../ui/loading-spinner";
import { useEffect } from "react";
import { campaignUseWormHole } from "./campaign-useWormHole";
import { MintModal, MintNftModal } from "./campaign-transferNft";

// const tokenID = 11; // tokenid,need modify

// NFT Card component extracted for better organization
export const NFTCard = ({ nft, index }: { nft: NFTItem; index: number }) => {
  const { evmAddress, solAddress, ChainType } = useBolarityWalletProvider();
  const { onSendTransaction } = useOnSendTransaction();
  const { sendProof } = campaignProofNft();
  const { check_proof_record, claim_token } = campaignUseWormHole();

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
      if (allowanceStatus?.length > 0) {
        setTokenID(Number(allowanceStatus[allowanceStatus.length - 1]));
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
    }
  };

  // 检查nft mint状态 轮询
  const setintervalCheckMintStatus = ({
    signature,
    isEVM = false,
  }: {
    signature: string;
    isEVM?: boolean;
  }) => {
    setTimeout(() => {
      handleTransactionSuccess(
        signature,
        isEVM
          ? `https://sepolia.etherscan.io/tx/${signature}`
          : getExplorerLink("tx", signature, "devnet"),
        "Mint"
      );
      const intervalTime = setInterval(async () => {
        const mintStatus: any = await CheckMintStatus();
        if (mintStatus.length > 0) {
          clearInterval(intervalTime);
          toast.success("Mint Success");
          setMintStatus(false);
          // setTokenID(Number(mintStatus[0]));
          setTokenID(Number(mintStatus[0]));
        }
      }, 1000);
    }, 3000);
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

    console.log("payload---1---", payload);

    const signature = await onSendTransaction(solanaPublicKey, payload);
    if (signature) {
      setintervalCheckMintStatus({
        signature,
      });
      // 关闭状态
    } else {
      toast.error("Mint Failed.");
      setMintStatus(false);
    }
  };

  const claimTokenFunc = async () => {
    try {
      console.log("claimTokenFunc", tokenID);
      const signature1 = await claim_token(tokenID, nft.contract);
      console.log("claim_token", signature1);
      if (signature1) {
        // toast.success("Proof Sent Successfully");
        handleTransactionSuccess(
          signature1,
          getExplorerLink("tx", signature1, "devnet"),
          "Claim Token"
        );
        check_proof_record_status();
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error("Mint Failed.");
      setMintStatus(false);
    }
  };

  const sol_sendProofFunc = async () => {
    setClaimLoadingStatus(true);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    try {
      console.log("sendProofFunc", tokenID);

      const getToken = await CheckMintStatus();
      if (!getToken) {
        toast.error("Mint Failed.");
        // setMintStatus(false);
        return;
      }
      console.log("sendProofFunc", getToken);
      console.log("sendProofFunc", getToken[getToken.length - 1]);

      const { signature1, signature2 } = await sendProof(
        Number(getToken[getToken.length - 1]),
        nft.contract
      );
      if (signature1) {
        // toast.success("Proof Sent Successfully");
        handleTransactionSuccess(
          signature1,
          getExplorerLink("tx", signature1, "devnet"),
          "Proof"
        );
      }
      if (signature2) {
        // toast.success("Proof Sent Successfully");
        handleTransactionSuccess(
          signature2,
          getExplorerLink("tx", signature2, "devnet"),
          "Proof"
        );
        // 第二部成功后先判断 proof状态
        setintervalCheckClaimStatus({
          id: tokenID,
        });
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error("Mint Failed.");
      setMintStatus(false);
      setClaimLoadingStatus(false);
    }
  };

  // 检查nft sproof状态 轮询，如果有就执行claim token，超过1分钟则提示失败
  const setintervalCheckClaimStatus = ({
    id,
    isEVM = false,
  }: {
    id: number;
    isEVM?: boolean;
  }) => {
    let attemptCount = 0;
    const maxAttempts = 60; // 1分钟 = 60秒

    const intervalTime = setInterval(async () => {
      attemptCount++;
      const data: any = await check_proof_record(id, nft.contract);
      console.log(
        "setintervalCheckClaimStatus",
        data,
        `尝试次数: ${attemptCount}/${maxAttempts}`
      );

      if (data?.initialized) {
        clearInterval(intervalTime);
        claimTokenFunc();
        return;
      }

      // 超过1分钟（60次尝试）则提示失败
      if (attemptCount >= maxAttempts) {
        clearInterval(intervalTime);
        setClaimLoadingStatus(false);

        // toast.error("操作超时！请检查网络连接后重试。", {
        toast.error("Claim Token Failed.", {
          position: "top-right",
          duration: 5000,
        });
        console.error("NFT验证超时，已超过1分钟未成功");
      }
    }, 1000);

    // 返回interval ID以便在组件卸载时清除
    return intervalTime;
  };
  const check_proof_record_status = async () => {
    if (!tokenID) return;
    console.log("tokenID", tokenID);
    console.log("check_proof_record_status---tokenID", tokenID);
    try {
      const data: any = await check_proof_record(tokenID, nft.contract);
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
  const { writeContractAsync } = useWriteContract();

  // ETH mint nft
  const eth_mintNftInit = async () => {
    try {
      setMintStatus(true);

      const resHash = await writeContractAsync({
        abi: NFT_BASE_ABI.abi,
        address: nft.contract as `0x${string}`,
        functionName: "mint",
        args: [],
      });

      if (resHash) {
        setintervalCheckMintStatus({
          signature: resHash,
          isEVM: true,
        });
      } else {
        toast.error("Mint Failed.");
        setMintStatus(false);
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error("Mint Failed.");
      setMintStatus(false);
    }
  };

  return (
    <div className="bg-[#0c0a09] rounded-xl overflow-hidden border border-[#333333] transition-transform duration-200 ease-in-out flex flex-col hover:-translate-y-1 hover:shadow-lg">
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
      <div className="action-buttons flex justify-between p-4 border-t border-[#333333]">
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
