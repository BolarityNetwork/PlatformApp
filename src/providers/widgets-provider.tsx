"use client";
import { CurrencyEnum } from "@/config";
import React, { createContext, useContext, useState } from "react";


interface WidgetsProviderContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;

    initFromChain: CurrencyEnum | null;
    setInitFromChain: (chain: CurrencyEnum | null) => void;
}

const WidgetsProviderContext =
    createContext<WidgetsProviderContextType>({
        isOpen: false,
        setIsOpen: () => { },

        initFromChain: null,
        setInitFromChain: () => { },
    });

export const useWidgetsProvider = () =>
    useContext(WidgetsProviderContext);

export function WidgetsProvider({
    children,
}: {
    children: React.ReactNode;
}) {


    const [isOpen, setIsOpen] = useState(false)
    const [initFromChain, setInitFromChain] = useState(null)

    return (
        <WidgetsProviderContext.Provider
            value={{
                isOpen,
                setIsOpen,

                initFromChain,
                setInitFromChain
            }}
        >
            {children}
        </WidgetsProviderContext.Provider>
    );
}
