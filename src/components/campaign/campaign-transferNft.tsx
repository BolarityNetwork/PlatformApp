import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NFT_BASE_ABI, SupportChain } from "@/config";
import { FiAlertCircle } from "react-icons/fi";
import { IoCloseOutline } from "react-icons/io5";
import { cn, solanaPayloadHead } from "@/lib/utils";
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
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useDappInitProgram } from "@/hooks/transfer/solMethod";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";

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
  const { initialize } = useDappInitProgram();
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

  const {
    EthControll,
    isLoading: isEthLoading,
    setToastTitle,
  } = ethContractTransfer();

  const eth_transferNFT = async (recipient: string) => {
    setToastTitle("Transfer NFT");
    try {
      const res = await EthControll({
        address: contract as `0x${string}`,
        abi: NFT_BASE_ABI.abi,
        functionName: "safeTransferFrom",
        args: [evmAddress, recipient, BigInt(tokenID)],
      });
      console.log("nft-转账成功--", res);
    } catch (err) {
      console.error("转账失败:", err);
    }
  };
  useEffect(() => {
    if (!isEthLoading) {
      controllModal(false);
    }
  }, [isEthLoading]);
  function controllModal(open: boolean) {
    setIsLoading(open);
    setIsNFTOpen(open);
  }

  const { isNFTOpen, setIsNFTOpen } = useWidgetsProvider();

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

    try {
      const signature = await initialize.mutateAsync({
        message: payload,
        solPublicKey: solanaPublicKey,
        title: "Transform NFT",
      });
      console.log("mint--", signature);
      if (signature) {
        resetFunc();
      }
    } catch (e: unknown) {
      console.log("approve---", e);
      toast.error("Mint Failed.");
      resetFunc();
    }
  };

  const resetFunc = () => {
    reset();
    setIsLoading(false);
    setIsNFTOpen(false);
  };
  const onChange = (open: boolean) => {
    setIsNFTOpen(open);
    reset();
  };
  return (
    <Dialog open={isNFTOpen} onOpenChange={onChange}>
      <DialogTrigger asChild>
        <Button
          className={cn("w-[30%] md:w-[48%] font-bold")}
          disabled={tokenID === 0}
        >
          Transfer NFT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogTitle>Transfer NFT</DialogTitle>
          <DialogDescription>Transfer NFT to another wallet</DialogDescription>
        </div>
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
                autoComplete="off"
                encType="application/x-www-form-urlencoded"
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
              <Button type="reset" variant="outline" onClick={resetFunc}>
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 只在客户端挂载后处理主题
  useEffect(() => {
    setMounted(true);
  }, []);

  const bgStyleTheme = mounted && resolvedTheme === "dark";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="absolute top-0 right-0 rotate-180"
          size="icon"
          variant="ghost"
          aria-label="Mint NFT"
        >
          <FiAlertCircle size={48} color={bgStyleTheme ? "white" : "black"} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="p-0 overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="hidden" />
          <AlertDialogDescription className="!mt-0">
            <div className="flex flex-col justify-center items-center h-48 bg-secondary relative overflow-hidden before:content-[''] before:animate-rotate before:absolute before:inset-0 before:bg-gradient-to-br before:from-[rgba(0,230,118,0.15)] before:to-[rgba(255,62,62,0.15)]">
              <Image src={imgUrl} width={200} height={200} alt="NFT" />

              <AlertDialogCancel
                className={cn(
                  "absolute top-0 right-0 bg-transparent border-none "
                )}
              >
                {/* Close button */}
                <IoCloseOutline
                  size={88}
                  color={bgStyleTheme ? "white" : "black"}
                />
              </AlertDialogCancel>
            </div>
            <div className="text-center mt-1">
              <div className="text-2xl font-bold mb-1">Vault Access</div>
              <div className="text-sm text-muted-foreground">#{id}</div>
            </div>
            <div className="text-center  px-4">
              <div className="text-lg text-primary font-bold mb-2">Project</div>
              <div className="text-sm text-muted-foreground  text-pretty">
                {description}
              </div>
            </div>
            <div className=" mt-2">
              <div className="text-center text-lg text-primary font-bold mb-2">
                Detail
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Supply
                  </div>
                  <div id="detail-supply" className="font-bold text-foreground">
                    5,000
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Issue Price
                  </div>
                  <div id="detail-price" className="font-bold text-foreground">
                    free
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Network</div>
                  <div
                    id="detail-network"
                    className="font-bold text-foreground"
                  >
                    Ethereum
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Issue Date
                  </div>
                  <div id="detail-date" className="font-bold text-foreground">
                    2025-03-12
                  </div>
                </div>
              </div>
            </div>

            <div className="text-lg text-primary font-bold my-2 px-4 text-center">
              Contract
            </div>
            <div className="mx-6 bg-secondary rounded-xl overflow-hidden border border-ring flex flex-col">
              <div className="flex items-center justify-between p-2">
                <div className="text-sm overflow-hidden text-ellipsis indent-2 text-foreground font-bold">
                  {txHash ? txHash : ""}
                </div>
                <CopyButton
                  text={txHash || ""}
                  className="bg-transparent border-none text-foreground hover:text-primary"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* <AlertDialogFooter> */}
        <div className={cn("flex-row flex  justify-between px-6 pb-4")}>
          {/* Transfer button */}
          <CampaignTransferNft contract={txHash} tokenID={Number(id)} />
          <QrCodeModalSingle
            open={open}
            onOpenChange={setOpen}
            address={evmAddress || ""}
            title="Receive"
          />
        </div>
        {/* </AlertDialogFooter> */}
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
      <AlertDialogContent
        className={cn("bg-secondary sm:max-w-md md:max-w-lg")}
      >
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

            <div className="mx-6 my-2 bg-secondary rounded-xl overflow-hidden border border-ring flex flex-col">
              <div className="flex items-center justify-between p-2">
                <div className="text-xs overflow-hidden text-ellipsis indent-2 text-foreground font-bold">
                  {txHash ? txHash : ""}
                </div>
                <CopyButton
                  text={txHash || ""}
                  className="bg-transparent border-none text-foreground hover:text-primary"
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
