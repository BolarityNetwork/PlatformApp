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
import { solanaPayloadHead } from "@/lib/utils";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

import {
  AAVE_CONTRACT,
  APPROVE_BASE_AMOUNT,
  EVM_USDT_CONTRACT,
} from "@/config";

import { SubmitButton } from "./vaults-ui";
import { useDappInitProgram } from "@/hooks/transfer/solMethod";
import { DEPOSIT_ABI, USDT_APPROVE_ABI, WITHDRAW_ABI } from "./vaults-data";

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
  const { evmAddress, solAddress, CheckUSDTApproveTransfer } =
    useBolarityWalletProvider();

  const { initialize } = useDappInitProgram();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  const onChange = (open: boolean) => {
    onOpenChange(open);
    reset();
  };
  const controllModal = (open: boolean) => {
    setIsLoading(open);
    onOpenChange(open);
    reset();
  };

  const onApprove = async () => {
    toast.info(`You need approved to ${AAVE_CONTRACT}`);

    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(EVM_USDT_CONTRACT)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    // 解析 ABI
    const iface = parseAbi(USDT_APPROVE_ABI);
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "approve",
      args: [AAVE_CONTRACT, APPROVE_BASE_AMOUNT],
    });
    console.log("deposit--approve--paras:", paras);

    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    console.log("deposit--approve--payloadPart:", payloadPart);

    // 6. Encode the final payload
    const txPayload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
    );
    console.log("deposit--approve--txPayload:", txPayload);

    try {
      const signature = await initialize.mutateAsync({
        message: txPayload,
        solPublicKey: solanaPublicKey,
        title: "Approve",
      });
      console.log("激活evm--", signature);
      return signature;
    } catch (e: unknown) {
      console.log("approve---", e);
    }
  };

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
      const isApproved = await CheckUSDTApproveTransfer();
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
      if (!(await CheckUSDTApproveTransfer())) {
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

    try {
      const signature = await initialize.mutateAsync({
        message: txPayload,
        solPublicKey: solanaPublicKey,
        title,
      });
      console.log("激活evm--", signature);
      if (signature) {
        // 关闭状态
        controllModal(false);
      }
    } catch (e) {
      console.log("approve---", e);
      toast.error(title + " Failed.");
      controllModal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{isDeposit ? "Deposit" : "Withdraw"} USDT</DialogTitle>
        <form
          onSubmit={handleSubmit(onSubmit)}
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
                  autoComplete="off"
                  enctype="application/x-www-form-urlencoded"
                  step="any"
                  {...register("amount", {
                    required: "Please enter an amount",
                    // min: 0,
                    // max: evmUsdtBalance,
                    validate: (value: string) => {
                      console.log("value:", value);
                      if (!/^(0|[1-6]\d*)(\.\d{1,6})?$/.test(value)) {
                        return "Invalid amount format (max 6 decimals, no leading zeros)";
                      }
                      const parsed = parseFloat(value);
                      if (isNaN(parsed) || parsed <= 0)
                        return "Please enter a valid amount";
                      if (parsed > evmUsdtBalance)
                        return "Insufficient balance";
                      return true;
                    },
                  })}
                />
                <Label
                  className="ml-2 text-gray-500 md:text-xl"
                  htmlFor="amount"
                >
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
              <div className="text-red-500 text-xs">
                {errors.amount && errors.amount.message}
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end gap-x-3 text-sm text-gray-500">
              <Button
                type="reset"
                className="bg-gray-500 text-white px-4 py-2 rounded-md"
                onClick={() => onChange(false)}
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
