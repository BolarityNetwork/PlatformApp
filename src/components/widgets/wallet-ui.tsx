"use client";
import { useMemo, useState } from "react";
import { FaEthereum } from "react-icons/fa";
import { SiSolana } from "react-icons/si";

import { cn, ellipsify } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SolanaConnectModal } from "@/providers/solana-provider";
import { EvmConnectModal } from "@/providers/evm-provider";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDisconnect as useDisconnectEvm } from "wagmi";
import { SupportChain } from "@/config";

const WalletButton = () => {
  const { disconnect: disconnectSolana } = useWallet();

  const { disconnectAsync } = useDisconnectEvm();

  const [openEvmModal, setOpenEvmModal] = useState(false);
  const [openSolanaModal, setOpenSolanaModal] = useState(false);

  const {
    ChainType,
    solAddress,
    evmAddress,
    setSolAddress,
    setEvmAddress,
    setChainType,
  } = useBolarityWalletProvider();



  const handleEvmConnected = (address: string) => {
    console.log("handleEvmConnected:", address);
    setOpenEvmModal(false);
  };

  const DisconnectWallet = () => {
    console.log("DisconnectWallet", ChainType);
    switch (ChainType) {
      // 刷新 evm 代理地址
      case SupportChain.Solana:
        disconnectSolana();
      // 刷新 solana 代理地址
      case SupportChain.Ethereum:
        handleDisconnect();
      default:
        break;
    }

    setSolAddress("");
    setEvmAddress("");
    setChainType(null);
    // setTimeout(() => {

    //   window.localStorage.clear();
    //   window.location.reload();
    // }, 500);
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAsync();
      console.log("Wallet disconnected successfully.");
      // toast.success("Wallet disconnected successfully.");
    } catch (error: any) {
      console.error("Failed to disconnect wallet:", error);
      // toast.error("Failed to disconnect wallet: " + error.message);
    }
  };
  const addressInfo = useMemo(() => {
    switch (ChainType) {
      case SupportChain.Solana:
        return ellipsify(solAddress);
      case SupportChain.Ethereum:
        return ellipsify(evmAddress);
      default:
        return "Connect Wallet";
    }
  }, [solAddress, evmAddress, ChainType]);
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="font-bold flex gap-2 w-32">{addressInfo}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={cn((ChainType && "w-36") || "w-40")}>
          {(ChainType && (
            <DropdownMenuItem
              className="py-2 flex items-center gap-2 cursor-pointer font-bold"
              onClick={DisconnectWallet}
            >
              Disconnect
            </DropdownMenuItem>
          )) || (
              <>
                <DropdownMenuItem onClick={() => setOpenEvmModal(true)}>
                  <div className="flex items-center gap-2 py-2 cursor-pointer">
                    <FaEthereum className="w-5 h-5" />
                    <span className="font-bold">EVM Wallet</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenSolanaModal(true)}>
                  <div className="flex items-center gap-2 py-2 cursor-pointer">
                    <SiSolana className="w-5 h-5" />
                    <span className="font-bold">Solana Wallet</span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SolanaConnectModal
        open={openSolanaModal}
        onOpenChange={setOpenSolanaModal}
        onConnected={() => setOpenSolanaModal(false)}
      />
      <EvmConnectModal
        open={openEvmModal}
        onOpenChange={setOpenEvmModal}
        onConnected={handleEvmConnected}
      />
    </div>
  );
};

export default WalletButton;
