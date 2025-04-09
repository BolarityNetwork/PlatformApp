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
import {
  getExplorerLink,
  handleTransactionSuccess,
  solanaPayloadHead,
} from "@/lib/utils";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useDepositModal } from "./vaults-data";
import { AAVE_CONTRACT, EVM_USDT_CONTRACT } from "@/config";

import { SubmitButton } from "./vaults-ui";
import { useOnSendTransaction } from "@/hooks/useWormHole";

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
  const { CheckApproveTransfer, onApprove } = useDepositModal();
  const { onSendTransaction } = useOnSendTransaction();

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

  /**
   * 处理操作失败情况，显示错误信息并关闭模态框
   * @param message 要显示的错误消息
   */
  const handleError = (message: string) => {
    toast.error(message);
    controllModal(false);
  };

  /**
   * 等待代币授权确认，设置超时机制
   * @param maxAttempts 最大尝试次数
   * @param intervalMs 每次尝试间隔（毫秒）
   * @returns 返回一个Promise，解析为授权状态的布尔值
   */
  const waitForApprovalConfirmation = async (
    maxAttempts = 30,
    intervalMs = 1000
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isApproved = await CheckApproveTransfer();
      if (isApproved) return true;

      // 等待下次尝试
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    // 超时返回失败
    return false;
  };

  /**
   * 处理表单提交
   */
  const onSubmit = async (data: { amount: number }) => {
    try {
      setIsLoading(true);

      // 检查是否已授权
      if (!(await CheckApproveTransfer())) {
        // 需要授权
        if (!(await onApprove())) {
          // 授权请求失败
          return handleError("Approve failed");
        }

        // 等待授权确认
        if (!(await waitForApprovalConfirmation())) {
          // 授权确认超时
          return handleError("Approve timeout");
        }

        toast.success("Approve success");
      }

      // 授权完成或无需授权，执行基础提交逻辑
      await onSubmit_base(data);
    } catch (error) {
      console.error("存款错误:", error);
      handleError("Deposit failed");
    }
  };

  const onSubmit_base = async (data: { amount: number }) => {
    console.log("Form---solana Data:", data);
    const { amount } = data;

    const title = isDeposit ? "Deposit " : "Withdraw ";
    console.log("Form---solana title:", title);

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
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
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
