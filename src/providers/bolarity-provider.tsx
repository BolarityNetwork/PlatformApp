// import React from "react";
import { SolanaProvider } from "./solana-provider";
import { EvmProvider } from "./evm-provider";
import { ClusterProvider } from "./cluster-provider";
import { BolarityWalletProvider } from "./bolarity-wallet-provider";
import { WidgetsProvider } from "./widgets-provider";
export function BolarityProvider({ children }: { children: React.ReactNode }) {
  return (
    <EvmProvider>
      <ClusterProvider>
        <SolanaProvider>
          <BolarityWalletProvider>
            <WidgetsProvider>{children}</WidgetsProvider>
          </BolarityWalletProvider>
        </SolanaProvider>
      </ClusterProvider>
    </EvmProvider>
  );
}
