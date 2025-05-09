import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import { toHex } from "viem";
import { toast } from "sonner";

import {
  BOLARITY_EVM_CONTRACT,
  UNI_PROXY,
  DRIFT_ACCOUNT_ID,
  DRIFT_MARKET_INFO,
} from "@/config";

import { useEffect } from "react";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";
import LoadingButton from "./loadingButton";
import { Keypair } from "@solana/web3.js";
import { hexStringToUint8Array, sepoliaPayloadHead } from "@/lib/utils";

import { useVaultOrder } from "@/hooks/useVault";
import { BN } from "@coral-xyz/anchor";
import { DriftHooks } from "./drift-hooks";

const sub_account_id = DRIFT_ACCOUNT_ID;
const market_index = Number(DRIFT_MARKET_INFO.sol.market_index);

const deposit_coin = "SOL";
//aave  存款 提现 弹框
function EvmDriftModal({
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
  // 在组件顶部添加 state
  const [seed, setSeed] = useState(() =>
    Keypair.generate().publicKey.toBase58().slice(0, 32)
  );
  const [isLoading, setIsLoading] = useState(false);

  const model_title = isDeposit ? "Deposit" : "Withdraw";
  const { CheckDriftUserStats, DriftInitObj } = DriftHooks();

  // drift_program
  const onChange = (open: boolean) => {
    onOpenChange(open);
    reset();
  };
  const controllModal = (open: boolean) => {
    setIsLoading(open);
    onOpenChange(open);
    reset();
    setSeed(Keypair.generate().publicKey.toBase58().slice(0, 32));
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
    EthControll: createAccountAndInitEthControll,
    isLoading: CreateAccountAndInitEthLoading,
    setToastTitle: CreateAccountAndInitSetToastTitle,
  } = ethContractTransfer();
  const {
    EthControll,
    isLoading: isEthLoading,
    setToastTitle,
  } = ethContractTransfer();

  const {
    EthControll: approveEthControll,
    isLoading: approveIsEthLoading,
    setToastTitle: approveSetToastTitle,
  } = ethContractTransfer();

  useEffect(() => {
    console.log(
      "CreateAccountAndInitEthLoading",
      CreateAccountAndInitEthLoading
    );
    if (!CreateAccountAndInitEthLoading) {
      evm_deposit_sol_submit(getValues());
    }
  }, [CreateAccountAndInitEthLoading]);
  useEffect(() => {
    if (!isEthLoading) {
      controllModal(false);
    }
  }, [isEthLoading]);

  useEffect(() => {
    if (!approveIsEthLoading) {
      // 执行授权 要进行轮询，直到授权成功
      create_account_and_init(getValues());
    }
  }, [approveIsEthLoading]);

  // 添加到组件内部或提取到单独的工具函数
  const handleDriftTransaction = async (
    apiMutation: any,
    payload: any,
    ethController: any,
    title: string
  ) => {
    try {
      const { code, data: resData } = await apiMutation.mutateAsync(payload);

      if (code === 200) {
        const resHash = await ethController({
          abi: UNI_PROXY.abi,
          address: BOLARITY_EVM_CONTRACT,
          functionName: "sendMessage",
          args: [
            toHex(
              Buffer.concat([
                sepoliaPayloadHead,
                Buffer.from(hexStringToUint8Array(resData.payload)),
              ])
            ),
          ],
        });
        console.log(`${title} result:`, resHash);
        if (!resHash) {
          controllModal(false);
        }
        // return { success: true, hash: resHash };
      } else {
        toast.error(`${title} Failed.`);
        // return { success: false };
        controllModal(false);
      }
    } catch (error: any) {
      console.error(`${title} error:`, error);
      toast.error(`${title} Failed.`);

      controllModal(false);
    }
  };

  const create_account_and_init = async (data: { amount: number }) => {
    console.log("eth-----:", data);
    console.log("seed--create_account_and_init-", seed);
    setIsLoading(true);

    const title = "create account and init";

    const amount = new BN(data.amount * 10 ** 9);
    CreateAccountAndInitSetToastTitle(title);
    await handleDriftTransaction(
      create_account_and_initMutation,
      {
        ...DriftInitObj,
        seed: seed,
        amount: amount.toString(),
        // include_rent: true,
        include_rent: isDeposit,
      },
      createAccountAndInitEthControll,
      title
    );
  };
  const evm_deposit_sol_submit = async (data: { amount: number }) => {
    console.log("eth-----:", data);
    setIsLoading(true);
    console.log("seed--evm_deposit_sol_submit-", seed);
    setToastTitle(model_title);

    let amount = new BN(data.amount * 10 ** 9);

    await handleDriftTransaction(
      isDeposit
        ? deposit_sol_and_closeMutation
        : withdraw_sol_and_closeMutation,
      {
        ...DriftInitObj,
        seed: seed,
        amount: amount.toString(),
        sub_account_id: sub_account_id,
        market_index: market_index,
      },
      EthControll,
      model_title
    );
  };

  const {
    initializeUserStatsMutation,
    create_account_and_initMutation,
    deposit_sol_and_closeMutation,
    withdraw_sol_and_closeMutation,
  } = useVaultOrder();

  const submitForm = async (data: { amount: number }) => {
    console.log("value---111-", data);
    setIsLoading(true);
    try {
      // 检查用户状态
      const userExists = await CheckDriftUserStats();
      if (userExists) {
        await create_account_and_init(data);
      } else {
        await getApproveEthControll();
      }
    } catch (error) {
      console.error("Transaction error:", error);
    }
  };

  async function getApproveEthControll() {
    const title = "Main Account";
    toast.info(`You need ${title} to ${BOLARITY_EVM_CONTRACT}`);

    approveSetToastTitle(title);
    //   // 2. 发送交易
    await handleDriftTransaction(
      initializeUserStatsMutation,
      {
        ...DriftInitObj,
        sub_account_id: sub_account_id,
        name: title,
      },
      approveEthControll,
      title
    );
  }

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

export default EvmDriftModal;
