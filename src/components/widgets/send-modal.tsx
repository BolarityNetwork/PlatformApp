"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBolarity } from "@/hooks/useBolarity";
import { useAccountBalance } from "@/hooks/useAccount";
import { isValidEvmAddress, isValidPublicKey } from "@/lib/utils";

export const SendModal = ({
  open = false,
  onOpenChange,
  withButton = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const { isConnected, wallet } = useBolarity();
  const [isOpen, setIsOpen] = useState(open);
  const [amount, setAmount] = useState("");
  const [fromChain, setFromChain] = useState("eth");
  const [toChain, setToChain] = useState("sol");
  const [destination, setDestination] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const [currentBalance, setCurrentBalance] = useState("0.00");
  const [gasFee, setGasFee] = useState("0.00");
  const [transactionFee, setTransactionFee] = useState("0.00");
  const [loadingFee, setLoadingFee] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    accountBalance,
  } = useAccountBalance({
    solAddress: wallet.address,
    evmAddress: wallet.evmAddress,
  });

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (
      destination.length >= 32 &&
      parseFloat(amount) > 0 &&
      isConnected  
    ) {
      if ((toChain === "sol" && isValidPublicKey(destination)) || (toChain === "eth" && isValidEvmAddress(destination))) {
        setIsSendDisabled(false);        
      }
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount, isConnected, toChain]);

  useMemo(() => {
    if (!accountBalance) {
      setCurrentBalance("0.00");
    } else {
      if (fromChain === "sol") {
        setCurrentBalance(accountBalance.solBalance.toFixed(4));
      } else if (fromChain === "eth") {
        setCurrentBalance(accountBalance.ethBalance.toFixed(4));
      } else if (fromChain === "usdt") {
        setCurrentBalance((accountBalance.solUsdtBalance + accountBalance.ethUsdtBalance).toFixed(2));
      } else if (fromChain === "usdc") {
        setCurrentBalance((accountBalance.solUsdcBalance + accountBalance.ethUsdcBalance).toFixed(2));
      } else {
        setCurrentBalance("0.00");
      }
    }
  }, [fromChain, accountBalance])

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const handleSend = async () => {  
    console.log("handleSend", amount, fromChain, toChain, destination, wallet.chain);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <HandCoins className="h-5 w-5 pr-1" />
            Send
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="sm:max-w-m px-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-semibold">Transfer</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <div className="flex flex-col gap-y-4 mt-2">
          <div className="flex flex-col gap-y-2">
            <Label className=" text-gray-500">You&apos;re sending</Label>
            <div className="rounded-lg border border-gray-700 p-2 flex items-center justify-between">
              <Select value={fromChain} onValueChange={setFromChain}>
                <SelectTrigger className="flex-1 py-6 border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/solana.svg"
                          alt="SOL"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">SOL</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="eth">
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/ethereum.svg"
                          alt="ETH"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">ETH</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="usdt">
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/tether.png"
                          alt="USDT"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">USDT</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="usdc">
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/usdc.png"
                          alt="USDC"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">USDC</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 border-l border-gray-500 gap-x-1 flex justify-end items-center">
                <Input
                  id="amount"
                  placeholder="0.0"
                  className="text-md text-right pr-1 border-0 focus:border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="text-gray-500 text-md">{fromChain.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex justify-end gap-x-3 text-sm text-gray-500">
              <span>Balance: {currentBalance} {fromChain.toUpperCase()}</span>
              <span className="text-primary cursor-pointer" onClick={() => setAmount(currentBalance)}>Max</span>
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label className=" text-gray-500">To</Label>
            <Select value={toChain} onValueChange={setToChain}>
              <SelectTrigger className="w-full py-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sol">
                  <div className="flex gap-x-3 items-center">
                    <div className="hidden xl:block p-2 rounded-full bg-secondary">
                      <Image
                        src="/solana.svg"
                        alt="sol"
                        width={16}
                        height={16}
                      />
                    </div>
                    <span className="text-lg">SOL</span>
                  </div>
                </SelectItem>
                <SelectItem value="eth">
                  <div className="flex gap-x-3 items-center">
                    <div className="hidden xl:block p-2 rounded-full bg-secondary">
                      <Image
                        src="/ethereum.svg"
                        alt="sol"
                        width={16}
                        height={16}
                      />
                    </div>
                    <span className="text-lg">ETH</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            id="address"
            placeholder="Input destination address"
            className="py-6"
            value={destination}
            onChange={(e) => setDestination(e.target.value.trim())}
          />

          <div className="my-2 flex flex-col gap-y-2">
            <div className="flex justify-between items-center">
              <span>Total fee</span>
              <span className="text-gray-500">0.01 ETH</span>
            </div>
            <div className="bg-secondary p-4 rounded-lg flex flex-col gap-y-2">
              <div className="flex justify-between items-center">
                <span>Transaction Fee:</span>
                <div className=" text-sm flex flex-col items-end">
                  <span className="text-md">0.01 ETH</span>
                  <span className="text-gray-500">= $0.42</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Gas Fee:</span>
                <div className=" text-sm flex flex-col items-end">
                  <span className="text-md">0.01 ETH</span>
                  <span className="text-gray-500">= $0.42</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AlertDialogFooter className="w-full justify-between xl:gap-x-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled || sending}
                  className="w-full"
                  size="lg"
                >
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
