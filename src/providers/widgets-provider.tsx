"use client";
import { CurrencyEnum } from "@/config";
import React, { createContext, useContext, useState } from "react";
// import { UseLocalStorage } from "@/hooks/useIsomorphicLayoutEffect";
import { useLocalStorage } from "@solana/wallet-adapter-react";

interface WidgetsProviderContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initFromChain: CurrencyEnum | null;
  setInitFromChain: (chain: CurrencyEnum | null) => void;
  getUrl: string;
  setIconUrl: (params: string) => void;
  isNFTOpen: boolean;
  setIsNFTOpen: (open: boolean) => void;
}

const WidgetsProviderContext = createContext<WidgetsProviderContextType>({
  isOpen: false,
  setIsOpen: () => {},
  initFromChain: null,
  setInitFromChain: () => {},
  setIconUrl: () => {},
  getUrl: "",
  isNFTOpen: false,
  setIsNFTOpen: () => {},
});

export const useWidgetsProvider = () => useContext(WidgetsProviderContext);

export function WidgetsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNFTOpen, setIsNFTOpen] = useState(false);
  const [initFromChain, setInitFromChain] = useState(null);
  const [_, setIcon] = useLocalStorage("BOLARITY_WALLET_ICON", null);
  const [getUrl, setUrl] = useState("");

  function setIconUrl(params: string) {
    setUrl(params);
    setIcon(params);
  }

  return (
    <WidgetsProviderContext.Provider
      value={{
        isOpen,
        setIsOpen,
        initFromChain,
        setInitFromChain,
        getUrl,
        setIconUrl,
        isNFTOpen,
        setIsNFTOpen,
      }}
    >
      {children}
    </WidgetsProviderContext.Provider>
  );
}
