import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import { Loading } from "@/components/ui/loading";

import {
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  toBytes,
  toHex,
  bytesToHex,
  parseEther,
} from "viem";
import { PublicKey } from "@solana/web3.js";
import { solanaPayloadHead } from "@/lib/utils";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import {
  ETH_TO_STETH_STAKING,
  PROXY_LIDO_CONTRACT_ADDRESS,
  SupportChain,
} from "@/config";

import { useDappInitProgram } from "@/hooks/transfer/solMethod";
import { LIDO_STAKE_ABI } from "./vaults-data";
import { useEffect } from "react";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";

export const Valuts_RightCard = ({ arr }: { arr: string[] }) => (
  <div className="grid grid-cols-3 uppercase text-primary text-xs">
    {arr.map((item, index) => (
      <div key={index}>{item}</div>
    ))}
  </div>
);

//aave  存款 提现 弹框
export const LidoDepositModal = ({
  open = false,
  onOpenChange,
  evmUsdtBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evmUsdtBalance: number;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { ChainType, solAddress } = useBolarityWalletProvider();
  const { initialize } = useDappInitProgram();

  const {
    EthControll,
    isLoading: isEthLoading,
    setToastTitle,
  } = ethContractTransfer();

  const isEthSumbit = async (data: { amount: number }) => {
    console.log("eth----lido-:", data);
    setIsLoading(true);
    const { amount } = data,
      functionName = "stake",
      iface = ETH_TO_STETH_STAKING.abi;
    setToastTitle("Stake");
    // 2. 发送交易
    try {
      const buySharesTx = await EthControll({
        amount,
        address: PROXY_LIDO_CONTRACT_ADDRESS,
        abi: iface,
        functionName,
        args: [60],
      });

      console.log("property transaction hash:", buySharesTx);
    } catch (err: any) {
      console.log("Transaction Failed: " + err.message);
      controllModal(false);
    }
  };
  useEffect(() => {
    if (!isEthLoading) {
      controllModal(false);
    }
  }, [isEthLoading]);

  const controllModal = (open: boolean) => {
    console.log("controllModal:", open);
    reset();
    setIsLoading(open);
    onOpenChange(open);
  };

  const onSubmit = async (data: { amount: number }) => {
    console.log("Form Data:", data);
    const { amount } = data;

    setIsLoading(true);

    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );

    const amountInWei = parseEther(amount.toString()); // Convert ETH to wei

    const contractAddressPadded = pad(
      toHex(toBytes(PROXY_LIDO_CONTRACT_ADDRESS)),
      {
        size: 32,
        dir: "left",
      }
    );
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    console.log("contractAddress:", contractAddress);
    // 解析 ABI
    const iface = parseAbi(LIDO_STAKE_ABI),
      functionName = "stake";
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName,
      args: [60],
    });
    console.log("paras:", paras);
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, amountInWei, bytesToHex(toBytes(paras))]
    );

    const txPayload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
    );

    try {
      const signature = await initialize.mutateAsync({
        message: txPayload,
        solPublicKey: solanaPublicKey,
        title: functionName,
      });
      console.log("激活evm--", signature);
      if (signature) {
        controllModal(false);
      }
    } catch (e) {
      console.log("approve---", e);

      toast.error("Stake Failed.");
      controllModal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={controllModal}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Stake ETH</DialogTitle>
        <form
          onSubmit={handleSubmit(
            ChainType == SupportChain.Ethereum ? isEthSumbit : onSubmit
          )}
          onReset={() => {
            console.log("onReset");
            controllModal(false);
          }}
        >
          <div className="grid gap-y-4 md:p-4">
            <div className="flex flex-col gap-y-2 mt-2">
              <Label htmlFor="amount" className="text-gray-500">
                Amount
              </Label>
              <div className="flex-1  gap-x-1 flex justify-end items-center">
                <Input
                  id="amount"
                  placeholder="Input amount"
                  className="py-6"
                  type="number"
                  step="any"
                  autoComplete="off"
                  encType="application/x-www-form-urlencoded"
                  {...register("amount", {
                    required: true,
                    min: 0,
                    max: evmUsdtBalance,
                    validate: (value: any) =>
                      (value > 0 && value <= evmUsdtBalance) ||
                      "Amount must be greater than 0 and within balance",
                  })}
                />
                <Label
                  className="ml-2 text-gray-500 md:text-xl"
                  htmlFor="amount"
                >
                  ETH
                </Label>
              </div>
              <div className="flex justify-end gap-x-3 text-sm text-gray-500">
                <span>{"Balance: " + evmUsdtBalance + " " + "ETH"}</span>
                <span
                  className="text-primary cursor-pointer"
                  onClick={() => setValue("amount", evmUsdtBalance)}
                >
                  Max
                </span>
              </div>
              {/* 错误信息 */}
              <div>
                {errors.amount && (
                  <span className="text-red-500 float-right">
                    {errors.amount.type === "max" ||
                    errors.amount.type === "validate"
                      ? "Insufficient balance"
                      : "Please enter a valid amount"}
                  </span>
                )}
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end gap-x-3 text-sm text-gray-500">
              <Button
                type="reset"
                className="bg-gray-500 text-white px-4 py-2 rounded-md"
                onClick={() => controllModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loading className="w-4 h-4 mr-1" />
                    <span>Staking...</span>
                  </>
                ) : (
                  "Stake"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
