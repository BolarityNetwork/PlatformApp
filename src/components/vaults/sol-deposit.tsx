import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import {
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  parseUnits,
  toBytes,
  toHex,
  bytesToHex,
} from "viem";
import { PublicKey } from "@solana/web3.js";
import { getExplorerLink, handleTransactionSuccess } from "@/lib/utils";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useDepositModal } from "./vaults-data";
import { AAVE_CONTRACT, EVM_USDT_CONTRACT } from "@/config";

import { SubmitButton } from "./vaults-ui";

const DEPOSIT_ABI = [
    "function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
  ],
  WITHDRAW_ABI = [
    "function withdraw(address asset,uint256 amount, address to)",
  ];

//aave  存款 提现 弹框
export const SolDeposit = ({
  open = false,
  onOpenChange,
  evmUsdtBalance,
  isDeposit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evmUsdtBalance: number;
  isDeposit: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { evmAddress, solAddress } = useBolarityWalletProvider();
  const { CheckApproveTransfer, onApprove, onSendTransaction } =
    useDepositModal();
  const onChange = (open: boolean) => {
    onOpenChange(open);
    reset();
  };
  const controllModal = (open: boolean) => {
    setIsLoading(open);
    onOpenChange(open);
    reset();
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  const onSubmit = async (data: { amount: number }) => {
    setIsLoading(true);
    console.log("desposit----allowanceData");
    // 判断是否需要授权
    if (!(await CheckApproveTransfer())) {
      console.log("desposit--check--allowanceData");

      const confirmApprove = await onApprove();
      console.log("desposit---confirmApprove", confirmApprove);
      if (confirmApprove) {
        const intervalTime = setInterval(async () => {
          if (await CheckApproveTransfer()) {
            clearInterval(intervalTime);
            toast.success("Approve Success");
            onSubmit_base(data);
          }
        }, 1000);
      } else {
        toast.error("Approve Failed");
        controllModal(false);
      }
    } else {
      onSubmit_base(data);
    }
  };

  const onSubmit_base = async (data: { amount: number }) => {
    console.log("Form---solana Data:", data);
    const { amount } = data;

    const title = isDeposit ? "Deposit " : "Withdraw ";

    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const amountInWei = parseUnits(amount.toString(), 6); // Convert USDT to wei

    const contractAddressPadded = pad(toHex(toBytes(AAVE_CONTRACT)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );

    // 解析 ABI
    const iface = parseAbi(isDeposit ? DEPOSIT_ABI : WITHDRAW_ABI),
      functionName = isDeposit ? "supply" : "withdraw",
      args = isDeposit
        ? [EVM_USDT_CONTRACT, amountInWei, evmAddress, 0]
        : [EVM_USDT_CONTRACT, amountInWei, evmAddress];
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName,
      args,
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );
    const signature = await onSendTransaction(solanaPublicKey, txPayload);
    if (signature) {
      setTimeout(() => {
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet"),
          title
        );
        // 关闭状态
        controllModal(false);
      }, 3000);
    } else {
      toast.error(title + " Failed.");
      controllModal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>{isDeposit ? "Deposit" : "Withdraw"} USDT</DialogTitle>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onReset={() => {
            console.log("onReset");
            controllModal(false);
          }}
        >
          <div className="grid gap-y-4 p-4">
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
                  {...register("amount", {
                    required: true,
                    min: 0,
                    max: evmUsdtBalance,
                    validate: (value: any) =>
                      (value > 0 && value <= evmUsdtBalance) ||
                      "Amount must be greater than 0 and within balance",
                  })}
                />
                <Label className="ml-2 text-gray-500 text-xl" htmlFor="amount">
                  USDT
                </Label>
              </div>
              <div className="flex justify-end gap-x-3 text-sm text-gray-500">
                <span>{"Balance: " + evmUsdtBalance + " " + "USDT"}</span>
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
              >
                Cancel
              </Button>

              <SubmitButton isLoading={isLoading} isDeposit={isDeposit} />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
