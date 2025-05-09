import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import LoadingButton from "./loadingButton";

import { useDriftClientProviderContext } from "@/providers/drift-client-provider";

import { PublicKey } from "@solana/web3.js";

import { getAssociatedTokenAddress } from "@solana/spl-token";
import { handleTransactionSuccess } from "@/lib/utils";
import { useCluster } from "@/providers/cluster-provider";

export const getTokenAddress = (
  mintAddress: string,
  userPubKey: string
): Promise<PublicKey> => {
  return getAssociatedTokenAddress(
    new PublicKey(mintAddress),
    new PublicKey(userPubKey)
  );
};
// const deposit_coin = "SOL";
//aave  存款 提现 弹框
function SolDriftModal({
  open = false,
  onOpenChange,
  evmUsdtBalance,
  isDeposit,
  marketIndex = 0,
  deposit_coin = "SOL",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evmUsdtBalance: number;
  isDeposit: boolean;
  marketIndex: number;
  deposit_coin: string;
}) {
  const { getExplorerUrl } = useCluster();

  // 在组件顶部添加 state

  const [isLoading, setIsLoading] = useState(false);

  const model_title = isDeposit ? "Deposit" : "Withdraw";

  const { driftClient, checkDriftUserStats, createDriftUserAccount } =
    useDriftClientProviderContext();

  // drift_program
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

  const deposit__submit = async (data: { amount: string }) => {
    console.log("eth-----:", data);

    // const marketIndex = 0; // USDC
    const amount = driftClient.convertToSpotPrecision(
      marketIndex,
      parseFloat(data.amount)
    ); // $100
    // const amount = driftClient.convertToSpotPrecision(marketIndex, 1); // $100
    const associatedTokenAccount = await driftClient.getAssociatedTokenAccount(
      marketIndex
    );

    if (isDeposit) {
      const txsig = await driftClient.deposit(
        amount,
        marketIndex,
        associatedTokenAccount
      );

      if (txsig) {
        handleTransactionSuccess(
          txsig,
          getExplorerUrl(`tx/${txsig}`),
          model_title + " " + deposit_coin
        );
        controllModal(false);
      }
    } else {
      const withdraw = await driftClient.withdraw(
        amount,
        marketIndex,
        associatedTokenAccount
      );

      if (withdraw) {
        handleTransactionSuccess(
          withdraw,
          getExplorerUrl(`tx/${withdraw}`),
          model_title + " " + deposit_coin
        );
        controllModal(false);
      }
    }
  };

  const submitForm = async (data: { amount: string }) => {
    console.log("value---111-", data);
    setIsLoading(true);
    try {
      const userAccountExists = await checkDriftUserStats();
      console.log("driftClient---userAccountExists---", userAccountExists);
      if (!userAccountExists) {
        const sig = await createDriftUserAccount();
        console.log("sig---", sig);
        if (sig) {
          handleTransactionSuccess(
            sig,
            getExplorerUrl(`tx/${sig}`),
            "Create Drift User Account"
          );
          await deposit__submit(data);
        }
      } else {
        await deposit__submit(data);
      }
    } catch (error) {
      console.log("error---", error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>{model_title + " " + deposit_coin}</DialogTitle>
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
                  {deposit_coin}
                </Label>
              </div>
              <div className="flex justify-end gap-x-3 text-sm text-gray-500">
                <span>{"Balance: " + evmUsdtBalance + " " + deposit_coin}</span>
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

export default SolDriftModal;
