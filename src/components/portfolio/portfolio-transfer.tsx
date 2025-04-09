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

export function CampaignTransferClaim({
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
          Transfer Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Claim</DialogTitle>
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
                Solana Address
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
