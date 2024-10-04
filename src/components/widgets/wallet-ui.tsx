"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useBolarity } from "@/hooks/useBolarity";
import { ellipsify } from "@/lib/utils";
import { useEffect, useState } from "react";
import { FaEthereum } from "react-icons/fa";
import { SiSolana } from "react-icons/si";
import { SolanaConnectModal } from "@/providers/solana-provider";
import { EvmConnectModal } from "@/providers/evm-provider";
import { SupportChain } from "@/config";
import { useWallet } from "@solana/wallet-adapter-react";
// import { useCluster } from "@/providers/cluster-provider";

export const WalletButton = () => {
  const { isConnected, wallet, connectWallet, disconnectWallet } =
    useBolarity();
  const { disconnect, publicKey, connected } = useWallet();
  const [openEvmModal, setOpenEvmModal] = useState(false);
  const [openSolanaModal, setOpenSolanaModal] = useState(false);
  const [address, setAddress] = useState<string>("");
  // const { cluster } = useCluster();

  useEffect(() => {
    // console.log("WalletButton isConnected:", isConnected);
    if (isConnected) {
      if (wallet.chain === SupportChain.Solana) {
        setAddress(wallet.address);
      } else if (wallet.chain === SupportChain.Ethereum) {
        setAddress(wallet.evmAddress);
      }
    }
  }, [isConnected, wallet]);
  
  const onSolanaConnected = (address: string, disconnect: () => void) => {
    setOpenSolanaModal(false);
  };

  useEffect(() => {
    if (connected) {
      if (publicKey) {
        connectWallet({
          chain: SupportChain.Solana,
          address: publicKey.toString(),
          disconnect,
        });
      }
    }
  }, [connected, publicKey, connectWallet, disconnect]);

  const onEvmConnected = (address: string, disconnect: () => void) => {
    console.log("onEvmConnected address:", address);
    setOpenEvmModal(false);
    connectWallet({
      chain: SupportChain.Ethereum,
      address,
      disconnect,
    });
  };

  return (
    <>
      {isConnected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="font-bold flex gap-2 w-32">
              <span>{address ? ellipsify(address) : "unknown"}</span>
              {/* <span className="capitalize">[{cluster.name}]</span> */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36">
            <DropdownMenuItem
              className="py-2 flex items-center gap-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                disconnectWallet();
              }}
            >
              <span className="font-bold">Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="font-bold">Connect Wallet</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuItem onClick={() => setOpenEvmModal(true)}>
                <div className="flex items-center gap-2 py-2 cursor-pointer">
                  <FaEthereum className="w-5 h-5" />
                  <span className="font-bold">Evm Wallet</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenSolanaModal(true)}>
                <div className="flex items-center gap-2 py-2 cursor-pointer">
                  <SiSolana className="w-5 h-5" />
                  <span className="font-bold">Solana Wallet</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      <SolanaConnectModal
        open={openSolanaModal}
        onOpenChange={(open) => {
          setOpenSolanaModal(open);
        }}
        onConnected={onSolanaConnected}
      />
      <EvmConnectModal
        open={openEvmModal}
        onOpenChange={(open) => {
          setOpenEvmModal(open);
        }}
        onConnected={onEvmConnected}
      />
    </>
  );
};
