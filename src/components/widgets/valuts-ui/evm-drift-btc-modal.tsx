import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";

import { toHex } from "viem";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import {
  BOLARITY_EVM_CONTRACT,
  UNI_PROXY,
  DRIFT_ACCOUNT_ID,
  DRIFT_MARKET_INFO,
  DRIFT_BTC_MINT,
  DRIFT_USDC_MINT,
} from "@/config";

import ethContractTransfer from "@/hooks/transfer/ethTransfer";
import LoadingButton from "./loadingButton";
import { Keypair, PublicKey } from "@solana/web3.js";
import { hexStringToUint8Array, sepoliaPayloadHead } from "@/lib/utils";

import { useVaultOrder } from "@/hooks/useVault";
import { BN } from "@coral-xyz/anchor";

import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import { DriftHooks } from "./drift-hooks";

const sub_account_id = DRIFT_ACCOUNT_ID;

const usdc_market_index = DRIFT_MARKET_INFO.usdc.market_index; // usdc
const btc_market_index = DRIFT_MARKET_INFO.btc.market_index; // btc
const BTC_MINT = new PublicKey(DRIFT_BTC_MINT); // btc mint
const USDC_MINT = new PublicKey(DRIFT_USDC_MINT); // btc mint
function EvmDriftBtcModal({
  //aave  存款 提现 弹框
  deposit_coin = "BTC",
  open = false,
  onOpenChange,
  evmUsdtBalance,
  isDeposit,
}: {
  deposit_coin: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evmUsdtBalance: number;
  isDeposit: boolean;
}) {
  // 在组件顶部添加 state

  const { CheckDriftUserStats, DriftInitObj } = DriftHooks();
  const [isLoading, setIsLoading] = useState(false);
  const { solAddress } = useBolarityWalletProvider();

  const model_title = isDeposit ? "Deposit" : "Withdraw";

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
    getValues,
  } = useForm();

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
    if (!isEthLoading) {
      controllModal(false);
    }
  }, [isEthLoading]);

  useEffect(() => {
    if (!approveIsEthLoading) {
      // 执行ata后
      evm_deposit_sol_submit(getValues());
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

  const usdcTokenAta = useMemo(() => {
    return solAddress
      ? getAssociatedTokenAddressSync(
          USDC_MINT, // usdc mint
          new PublicKey(solAddress),
          true
        )
      : null;
  }, [solAddress]);
  const btcTokenAta = useMemo(() => {
    return solAddress
      ? getAssociatedTokenAddressSync(
          BTC_MINT, // usdc mint
          new PublicKey(solAddress),
          true
        )
      : null;
  }, [solAddress]);

  const evm_deposit_sol_submit = async (data: { amount: number }) => {
    console.log("eth-----:", data);
    setIsLoading(true);

    setToastTitle(model_title);

    let amount = new BN(data.amount * 10 ** 6);

    const seed1 = Keypair.generate().publicKey.toBase58().slice(0, 32);
    console.log("seed1---", seed1);
    const market_index =
      deposit_coin === "BTC" ? btc_market_index : usdc_market_index;
    console.log("market_index---", market_index);
    await handleDriftTransaction(
      isDeposit
        ? deposit_spl_and_closeMutation
        : withdraw_spl_and_closeMutation,
      {
        ...DriftInitObj,
        seed: seed1,
        amount: amount.toString(),
        sub_account_id,
        market_index: Number(market_index),
        associated_token_account:
          deposit_coin === "BTC"
            ? btcTokenAta.toBase58()
            : usdcTokenAta.toBase58(),
      },
      EthControll,
      model_title
    );
  };

  const {
    initializeUserStatsMutation,
    deposit_spl_and_closeMutation,
    withdraw_spl_and_closeMutation,
  } = useVaultOrder();

  const submitForm = async (data: { amount: number }) => {
    console.log("value---111-", data);
    setIsLoading(true);
    try {
      // 检查用户状态
      const userExists = await CheckDriftUserStats();
      console.log("userExists---", userExists);

      if (userExists) {
        await evm_deposit_sol_submit(data);
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
        sub_account_id,
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

export default EvmDriftBtcModal;
