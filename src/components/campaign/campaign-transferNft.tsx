import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NFT_BASE_ABI, SupportChain } from "@/config";
import { FiAlertCircle } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import {
  cn,
  getExplorerLink,
  handleTransactionSuccess,
  solanaPayloadHead,
} from "@/lib/utils";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useWidgetsProvider } from "@/providers/widgets-provider";
import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  pad,
  toBytes,
  toHex,
} from "viem";
import { useWriteContract } from "wagmi";
import { useOnSendTransaction } from "@/hooks/useWormHole";
import { toast } from "sonner";
import LoadingSpinner from "../ui/loading-spinner";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CopyButton, QrCodeModalSingle } from "../widgets/account-ui";
import { useMemo } from "react";

export function CampaignTransferNft({
  contract,
  tokenID,
}: {
  contract: string;
  tokenID: number;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      address: "",
    },
  });
  const { evmAddress, solAddress, ChainType } = useBolarityWalletProvider();

  const onSubmit = (data: { address: string }) => {
    if (!contract) return toast.warning("Contract address is required");
    setIsLoading(true);
    if (ChainType === SupportChain.Solana) {
      sol_transferNFT(data.address);
    } else {
      eth_transferNFT(data.address);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const eth_transferNFT = async (recipient: string) => {
    try {
      const hash = await writeContractAsync({
        address: contract as `0x${string}`,
        abi: NFT_BASE_ABI.abi,
        functionName: "safeTransferFrom",
        args: [evmAddress, recipient, BigInt(tokenID)],
      });
      console.log("nft-转账成功--", hash);
      if (hash) {
        handleTransactionSuccess(
          hash,
          `https://sepolia.etherscan.io/tx/${hash}`,
          "Transfer NFT"
        );
        setIsLoading(false);
        setIsNFTOpen(false);
      }
    } catch (err) {
      console.error("转账失败:", err);
      setIsLoading(false);
    }
  };
  const { isNFTOpen, setIsNFTOpen } = useWidgetsProvider();
  const { onSendTransaction } = useOnSendTransaction();

  const sol_transferNFT = async (recipient: string) => {
    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBuffer()))]
    );
    // 使用 encodeFunctionData 编码函数调用数据
    const contractAddressPadded = pad(toHex(toBytes(contract)), {
      size: 32,
      dir: "left",
    });
    const nftContractToken = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    const paras = encodeFunctionData({
      abi: NFT_BASE_ABI.abi,
      functionName: "transferFrom",
      args: [evmAddress, recipient, BigInt(tokenID)],
    });
    console.log("paras", paras);
    const payLoadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [nftContractToken, BigInt(0), bytesToHex(toBytes(paras))]
    );
    const payload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [bytesToHex(solanaPayloadHead), userAddress, payLoadPart]
    );
    const signature = await onSendTransaction(solanaPublicKey, payload);
    console.log("signature", signature);
    if (signature) {
      setIsLoading(false);
      setIsNFTOpen(false);
      handleTransactionSuccess(
        signature,
        getExplorerLink("tx", signature, "devnet"),
        "Transfer NFT"
      );
      // 关闭状态
    } else {
      toast.error("Transfer Failed.");
    }
  };

  return (
    <Dialog open={isNFTOpen} onOpenChange={setIsNFTOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn("w-[30%] md:w-[48%] font-bold")}
          disabled={tokenID === 0}
        >
          Transfer NFT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer NFT</DialogTitle>
          <DialogDescription>Transfer NFT to another wallet</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            onReset={() => {
              console.log("onReset");
              reset();
              setIsNFTOpen(false);
            }}
          >
            <div className="flex flex-col gap-y-4 ">
              <Label htmlFor="address" className="">
                EVM Address
              </Label>
              <Input
                id="address"
                placeholder="Input destination address"
                className="py-6"
                {...register("address", {
                  required: true,
                  validate: (value: any) => {
                    return isAddress(value) || "Invalid EVM address";
                  },
                })}
              />
              {errors.address && (
                <span className="text-red-500 float-right">
                  {errors.address.message}
                </span>
              )}
            </div>
            <div className="flex justify-end items-center gap-x-3 text-sm  mt-4">
              <Button type="reset" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Transferring
                  </>
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
//  Modal
export function MintModal({
  txHash,
  id,
  imgUrl,
  description,
  evmAddress,
}: {
  txHash: string;
  id: string;
  imgUrl: string;
  description: string;
  evmAddress: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="absolute top-0 right-0 rotate-180"
          size="icon"
          variant="ghost"
          aria-label="Mint NFT"
        >
          <FiAlertCircle size={28} color="white" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="p-0">
        <AlertDialogHeader>
          <AlertDialogDescription>
            <div className="flex flex-col justify-center items-center h-48 bg-secondary relative overflow-hidden before:content-[''] before:animate-rotate before:absolute before:inset-0 before:bg-gradient-to-br before:from-[rgba(0,230,118,0.15)] before:to-[rgba(255,62,62,0.15)]">
              <Image src={imgUrl} width={200} height={200} alt="NFT" />

              <AlertDialogCancel
                className={cn(
                  "absolute top-0 right-0 bg-transparent border-none "
                )}
              >
                {/* Close button */}
                <IoCloseOutline size={48} color="white" />
              </AlertDialogCancel>
            </div>
            <div className="text-center mt-2">
              <div className="text-2xl font-bold mb-2">Vault Access</div>
              <div className="text-sm text-muted-foreground">#{id}</div>
            </div>
            <div className="text-center mt-2 px-4">
              <div className="text-lg text-primary font-bold mb-2">Project</div>
              <div className="text-sm text-muted-foreground  text-pretty">
                {description}
              </div>
            </div>
            <div className=" mt-2">
              <div className="text-center text-lg text-primary font-bold mb-2">
                Detail
              </div>
              <div className="grid grid-cols-2 gap-10 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Supply
                  </div>
                  <div id="detail-supply" className="font-bold text-white">
                    5,000
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Issue Price
                  </div>
                  <div id="detail-price" className="font-bold text-white">
                    free
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Network</div>
                  <div id="detail-network" className="font-bold text-white">
                    Ethereum
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Issue Date
                  </div>
                  <div id="detail-date" className="font-bold text-white">
                    2025-03-12
                  </div>
                </div>
              </div>
            </div>

            <div className="text-lg text-primary font-bold my-2 px-4 text-center">
              Contract
            </div>
            <div className="mx-6 bg-secondary rounded-xl overflow-hidden border border-[#333333] flex flex-col">
              <div className="flex items-center justify-between p-2">
                <div className="text-sm overflow-hidden text-ellipsis text-white indent-2">
                  {txHash ? txHash : ""}
                </div>
                <CopyButton
                  text={txHash || ""}
                  className="bg-transparent border-none text-[#999999] hover:text-white"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={cn("flex-row  justify-between px-6 pb-4")}
        >
          {/* Transfer button */}
          <CampaignTransferNft contract={txHash} tokenID={Number(id)} />
          <QrCodeModalSingle
            open={open}
            onOpenChange={setOpen}
            address={evmAddress || ""}
            title="Receive"
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// mint nft modal
export function MintNftModal({
  isStatus = false,
  txHash,
  symbol,
}: {
  txHash: string;
  isStatus?: boolean;
  symbol?: string;
}) {
  const getTitle = useMemo(() => {
    return isStatus ? "Mint NFT" : "Claim Tokens";
  }, [isStatus]);

  const getModalTitle = useMemo(() => {
    let title = isStatus ? `Mint ${symbol} NFT` : `Claim ${symbol} Tokens`;
    return title + " Successfully";
  }, [isStatus, symbol]);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="font-bold gap-2 w-[48%]" variant="secondary">
          {getTitle}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className={cn("bg-secondary ")}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn("text-5xl font-bold text-center")}>
            {isStatus ? "🚀" : "💎"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <div className="text-center mt-4 ">
              <div className="text-2xl text-primary font-bold mb-2">
                {getModalTitle}
              </div>
              <div className="text-sm text-muted-foreground  text-pretty">
                {isStatus
                  ? "Your transaction has been confirmed on the blockchain"
                  : "Your reward tokens have been sent to your wallet"}
              </div>
            </div>

            <div className=" rounded-xl m-6 bg-popover py-4">
              <div className="flex items-center justify-around">
                <div className="text-xs  text-white break-all">{txHash}</div>
                <CopyButton
                  text={txHash}
                  className="bg-transparent border-none text-[#999999] hover:text-white"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={cn("justify-center flex-row")}>
          <AlertDialogCancel className={cn("font-bold bg-primary w-[20%]")}>
            Close
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
