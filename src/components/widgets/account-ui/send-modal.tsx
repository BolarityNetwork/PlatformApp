"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import TransferForm from "./transferForm/index";
import { useWidgetsProvider } from "@/providers/widgets-provider";
const SendModal = ({
  accountBalance,
  ChainType,
  solAddress,
  evmAddress,
}: {
  accountBalance?: any;
  ChainType?: any;
  solAddress?: any;
  evmAddress?: any;
}) => {
  const { setIsOpen, isOpen } = useWidgetsProvider();
  const onChange = (eopen: boolean) => {
    console.log("eopen", eopen);
    setIsOpen(eopen);
  };
  console.log("form-----ChainType", ChainType);

  return (
    <AlertDialog open={isOpen} onOpenChange={onChange}>
      <AlertDialogContent className="sm:max-w-m px-4 md:px-8">
        <AlertDialogTitle className="text-lg md:text-2xl font-semibold">
          Transfer
        </AlertDialogTitle>
        {ChainType && (
          <TransferForm
            accountBalance={accountBalance}
            solPublicKey={solAddress}
            chainType={ChainType}
            evmAddress={evmAddress}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
export default SendModal;
