import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { handleTransactionSuccess } from "@/lib/utils";
import { useState } from "react";
import { parseEther } from "viem";

const ethContractTransfer = () => {
  const { data: hash, error, writeContractAsync } = useWriteContract();
  const [title, setToastTitle] = useState("");
  const [isLoading, setEthLoading] = useState(true);
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    console.log("isConfirming", isConfirming);
    if (error) {
      toast.error("Transaction Failed");

      setEthLoading(true);
    }

    if (isConfirmed) {
      console.log("isConfirmed", isConfirmed);
      if (title) {
        handleTransactionSuccess(
          hash as string,
          `https://sepolia.etherscan.io/tx/${hash}`,
          title
        );
        setTimeout(() => {
          setToastTitle("");
        }, 1000);
      }
      setEthLoading(false);
    }
  }, [hash, isConfirmed, isConfirming, error]);

  const EthControll = async ({
    amount,
    address,
    abi,
    functionName,
    args,
  }: {
    amount?: number;
    address: string;
    abi: any;
    functionName: string;
    args: readonly unknown[];
  }) => {
    setEthLoading(true);
    try {
      const buySharesTx = await writeContractAsync({
        abi,
        address: address as `0x${string}`,
        functionName,
        args,
        value: amount ? parseEther(amount.toString()) : undefined, // Convert ETH to wei
      });

      console.log("property transaction hash:", buySharesTx);
      return buySharesTx;
    } catch (err: any) {
      console.log("Transaction Failed: " + err.message);
      // setEthLoading(false);
      return null;
    }
  };
  return { EthControll, isLoading, setToastTitle, title };
};

export default ethContractTransfer;
