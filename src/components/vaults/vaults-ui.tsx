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
  parseUnits,
  toBytes,
  toHex,
  bytesToHex,
  parseEther,
} from "viem";
import { PublicKey } from "@solana/web3.js";
import { getExplorerLink, handleTransactionSuccess } from "@/lib/utils";
import { toast } from "sonner";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useDepositModal } from "./vaults-data";
import {
  AAVE_CONTRACT,
  APPROVE_BASE_AMOUNT,
  ETH_TO_STETH_STAKING,
  EVM_USDT_CONTRACT,
  PROXY_LIDO_CONTRACT_ADDRESS,
  SupportChain,
} from "@/config";
import { useWriteContract } from "wagmi";

import { ETH_DEPOSIT_ABI, ETH_WITHDRAW_ABI } from "@/abis/AAveABI";

const LIDO_STAKE_ABI = ["function stake(uint256 lockTime) external payable"];

export const SubmitButton = ({
  isLoading,
  isDeposit,
}: {
  isLoading: boolean;
  isDeposit: boolean;
}) => (
  <Button
    type="submit"
    className="bg-primary text-white px-4 py-2 rounded-md"
    disabled={isLoading}
  >
    {isLoading ? (
      <>
        <Loading className="w-4 h-4 mr-1" />
        <span>{isDeposit ? "Deposit..." : "Withdraw..."}</span>
      </>
    ) : isDeposit ? (
      "Deposit"
    ) : (
      "Withdraw"
    )}
  </Button>
);

//aave  存款 提现 弹框
export const DepositModal = ({
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
  const { evmAddress } = useBolarityWalletProvider();
  const { CheckApproveTransfer } = useDepositModal();
  const onChange = (open: boolean) => {
    onOpenChange(open);
    reset();
  };
  const controllModal = (open: boolean) => {
    setIsLoading(open);
    onOpenChange(open);
    reset();
  };
  const { writeContractAsync } = useWriteContract();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

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

    //   // 2. 发送交易
    try {
      const resHash = await writeContractAsync({
        abi: iface,
        address: AAVE_CONTRACT as `0x${string}`,
        functionName,
        args,
      });

      if (resHash) {
        setTimeout(() => {
          // 提示授权成功
          handleTransactionSuccess(
            resHash as string,
            `https://sepolia.etherscan.io/tx/${resHash}`,
            title
          );
          // 关闭状态
          controllModal(false);
        }, 3000);
      } else {
        toast.error(title + " Failed.");
        controllModal(false);
      }
    } catch (e) {
      console.log("error--isEthSumbit:", e);
      toast.error(title + " Failed.");
      controllModal(false);
    }
  };

  // 执行授权
  const SumbitCheckApprove = async (data: { amount: number }) => {
    let ABI = ["function approve(address to, uint256 tokenId)"];
    try {
      const hash = await writeContractAsync({
        address: EVM_USDT_CONTRACT,
        abi: parseAbi(ABI),
        functionName: "approve",
        args: [AAVE_CONTRACT, APPROVE_BASE_AMOUNT],
        // args: [AAVE_CONTRACT, 0n],
      });
      console.log("hash:", hash);
      if (hash) {
        // 执行授权 要进行轮询，直到授权成功
        const intervalTime = setInterval(async () => {
          if (await CheckApproveTransfer()) {
            // 提示授权成功
            handleTransactionSuccess(
              hash as string,
              `https://sepolia.etherscan.io/tx/${hash}`,
              "Approve"
            );
            clearInterval(intervalTime);
            // 停止定时器
            // 执行转账逻辑
            isEthSumbit(data);
          }
        }, 1000); // 每 500ms 检查一次
      }
    } catch (error) {
      console.log("error--approve:", error);
      toast.error("Approve Failed.");
    }
  };

  const submitForm = async (data: { amount: number }) => {
    setIsLoading(true);
    if (await CheckApproveTransfer()) {
      isEthSumbit(data);
    } else {
      SumbitCheckApprove(data);
    }
  };

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
              {/* 提交 */}
              <SubmitButton isLoading={isLoading} isDeposit={isDeposit} />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

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
  const { onSendTransaction } = useDepositModal();
  const { writeContract } = useWriteContract();

  const isEthSumbit = async (data: { amount: number }) => {
    console.log("eth----lido-:", data);
    setIsLoading(true);
    const { amount } = data;
    const amountInWei = parseEther(amount.toString()); // Convert ETH to wei

    const functionName = "stake",
      iface = ETH_TO_STETH_STAKING.abi;
    // 2. 发送交易
    writeContract(
      {
        abi: iface,
        address: PROXY_LIDO_CONTRACT_ADDRESS,
        functionName,
        args: [60],
        value: amountInWei,
      },
      {
        onSuccess: (hash) => {
          console.log("hash--isEthSumbit--", hash);
          if (hash) {
            setTimeout(() => {
              handleTransactionSuccess(
                hash as string,
                `https://sepolia.etherscan.io/tx/${hash}`,
                "Staking"
              );
              // 关闭状态
              controllModal(false);
            }, 3000);
          } else {
            toast.error("Transaction Failed.");
            controllModal(false);
          }
        },
      }
    );
  };

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
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );
    const signature = await onSendTransaction(solanaPublicKey, txPayload);
    if (signature) {
      setTimeout(() => {
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet")
        );
        // 关闭状态
        controllModal(false);
      }, 3000);
    } else {
      toast.error("Transaction Failed.");
      controllModal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={controllModal}>
      <DialogContent className="sm:max-w-[425px]">
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
