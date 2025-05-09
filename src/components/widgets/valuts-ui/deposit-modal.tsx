import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import { parseAbi, parseUnits } from "viem";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import {
  AAVE_CONTRACT,
  APPROVE_BASE_AMOUNT,
  EVM_USDT_CONTRACT,
} from "@/config";

import { ETH_DEPOSIT_ABI, ETH_WITHDRAW_ABI } from "@/abis/AAveABI";

import { useEffect } from "react";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";
import LoadingButton from "./loadingButton";
let APPROVE_ABI = ["function approve(address to, uint256 tokenId)"];

//todo aave usdt deposit withdraw modal
function DepositModal({
  open = false,
  onOpenChange,
  evmUsdtBalance,
  isDeposit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evmUsdtBalance: number;
  isDeposit: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { evmAddress, CheckUSDTApproveTransfer } = useBolarityWalletProvider();

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
    getValues,
  } = useForm();
  const {
    EthControll,
    isLoading: isEthLoading,
    setToastTitle,
  } = ethContractTransfer();
  useEffect(() => {
    if (!isEthLoading) {
      controllModal(false);
    }
  }, [isEthLoading]);
  const isEthSumbit = async (data: { amount: number }) => {
    console.log("eth-----:", data);
    setIsLoading(true);
    const { amount } = data;
    const amountInWei = parseUnits(amount.toString(), 6); // Convert USDT to wei
    const functionName = isDeposit ? "supply" : "withdraw",
      iface = isDeposit ? ETH_DEPOSIT_ABI : ETH_WITHDRAW_ABI,
      args = isDeposit
        ? [EVM_USDT_CONTRACT, amountInWei, evmAddress, 0]
        : [EVM_USDT_CONTRACT, amountInWei, evmAddress];

    const title = isDeposit ? "Deposit " : "Withdraw ";

    setToastTitle(title);
    //   // 2. 发送交易
    try {
      const resHash = await EthControll({
        abi: iface,
        address: AAVE_CONTRACT as `0x${string}`,
        functionName,
        args,
      });
      console.log("hash", resHash);
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error(title + " Failed.");
      controllModal(false);
    }
  };

  const {
    EthControll: approveEthControll,
    isLoading: approveIsEthLoading,
    setToastTitle: approveSetToastTitle,
  } = ethContractTransfer();

  const submitForm = async (data: { amount: number }) => {
    // console.log("value---111-", getValues());

    setIsLoading(true);
    if (await CheckUSDTApproveTransfer()) {
      isEthSumbit(data);
    } else {
      // SumbitCheckApprove(data);
      getApproveEthControll();
    }
  };

  useEffect(() => {
    if (!approveIsEthLoading) {
      // 执行授权 要进行轮询，直到授权成功
      const intervalTime = setInterval(async () => {
        if (await CheckUSDTApproveTransfer()) {
          // 提示授权成功

          clearInterval(intervalTime);
          // 停止定时器
          // 执行转账逻辑
          isEthSumbit(getValues());
        }
      }, 1000); // 每 500ms 检查一次
    }
  }, [approveIsEthLoading]);

  async function getApproveEthControll() {
    // console.log("value----", getValues("amount"));
    toast.info(`You need approved to ${AAVE_CONTRACT}`);

    const title = "Approve";
    approveSetToastTitle(title);
    //   // 2. 发送交易
    const resHash = await approveEthControll({
      address: EVM_USDT_CONTRACT,
      abi: parseAbi(APPROVE_ABI),
      functionName: "approve",
      args: [AAVE_CONTRACT, APPROVE_BASE_AMOUNT],
      // args: [AAVE_CONTRACT, 0n],
    });
    console.log("hash", resHash);
    if (!resHash) {
      toast.error(title + " Failed.");
      controllModal(false);
    }
  }

  // eth controll

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>{isDeposit ? "Deposit" : "Withdraw"} USDT</DialogTitle>
        <form
          onSubmit={handleSubmit(submitForm)}
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
                  autoComplete="off"
                  encType="application/x-www-form-urlencoded"
                  {...register("amount", {
                    required: "Please enter an amount",
                    validate: (value: string) => {
                      console.log("value:", value);
                      if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value)) {
                        return "Invalid amount format (max 18 decimals, no leading zeros)";
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
              <div className="text-red-500 text-xs">
                {errors.amount && errors.amount.message}
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
              {/* 提交 */}
              <LoadingButton isLoading={isLoading} isDeposit={isDeposit} />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DepositModal;
