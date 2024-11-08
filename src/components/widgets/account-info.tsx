"use client";

import Image from "next/image";
import { SupportChain } from "@/config";
import { useBolarity } from "@/hooks/useBolarity";
import { ellipsify } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AccountBalance, ActiveEvmAccountButton, ActiveSolanaAccountBtn, ReceiveModal, SendSolModal, SendEthModal } from "./account-ui";
import { Separator } from "../ui/separator";

export const AccountInfo = () => {
  const { isConnected, wallet } = useBolarity();
  const [address, setAddress] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [activeSolanaAccount, setActiveSolanaAccount] = useState(false);
  const [activeEvmAccount, setActiveEvmAccount] = useState(false);

  useMemo(() => {
    if (isConnected) {
      if (wallet.address) {
        setAddress(wallet.address);
      }
      if (wallet.evmAddress) {
        setEvmAddress(wallet.evmAddress);
      }
      switch (wallet.chain) {
        case SupportChain.Solana:
          if (!wallet.evmAddress) {
            setActiveEvmAccount(true);
          } else {
            setActiveEvmAccount(false);
          }
          break;        
        case SupportChain.Ethereum:
          if (!wallet.address) {
            setActiveSolanaAccount(true);
          } else {
            setActiveSolanaAccount(false);
          }
      }
    } else {
      setAddress("");
      setEvmAddress("");
      setActiveSolanaAccount(false);
      setActiveEvmAccount(false);
    }
  }, [isConnected, wallet.chain, wallet.address, wallet.evmAddress]);

  const onCopy = async (text: string) => {
    if (!text || !navigator) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy");
    }
  };

  const WalletLogo = () => {
    return (
      <div
        className={`rounded-full w-[64px] h-[64px] bg-[#ab9ff2] flex items-center justify-center ${
          !isConnected ? "opacity-60" : ""
        }`}
      >
        <Image
          src={
            wallet?.chain === SupportChain.Ethereum
              ? "/ethereum.svg"
              : "/phantom.svg"
          }
          alt="phantom"
          width={40}
          height={40}
        />
      </div>
    );
  };

  return (
    <div className="h-auto lg:h-16 flex flex-col lg:flex-row items-center gap-y-4 gap-x-4 md:gap-x-6 xl:gap-x-12">
      <div className="flex flex-row gap-x-4 items-center">
        <WalletLogo />
        <div className="flex flex-col items-center lg:items-start gap-y-2">
          <p className="text-sm text-muted-foreground">Total portfolio value</p>
          <AccountBalance />
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Solana address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {address ? ellipsify(address) : "-"}
          </p>
          {address && (
            <CopyIcon
              onClick={() => onCopy(address)}
              className="text-muted-foreground cursor-pointer hover:text-foreground"
            />
          )}
          {/* <DashboardIcon className="text-muted-foreground cursor-pointer hover:text-foreground" /> */}
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Evm address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {evmAddress ? ellipsify(evmAddress) : "-"}
          </p>
          {evmAddress && (
            <CopyIcon
              onClick={() => onCopy(evmAddress)}
              className="text-muted-foreground cursor-pointer hover:text-foreground"
            />
          )}
          {/* <DashboardIcon className="text-muted-foreground cursor-pointer hover:text-foreground" /> */}
        </div>
      </div>

      <div className="flex-1 flex justify-between lg:justify-end gap-x-4">
        {activeEvmAccount && <ActiveEvmAccountButton />}

        {activeSolanaAccount && <ActiveSolanaAccountBtn />}

        {address && <ReceiveModal address={address} />}

        {isConnected && wallet.chain === SupportChain.Solana && (
          <SendSolModal />
        )}
        {isConnected && wallet.chain === SupportChain.Ethereum && (
          <SendEthModal />
        )}
      </div>
    </div>
  );
};