// import React from "react";
import { SolanaProvider } from "./solana-provider";
import { EvmProvider } from "./evm-provider";
import { ClusterProvider } from "./cluster-provider";
import { BolarityWalletProvider } from "./bolarity-wallet-provider";
import { WidgetsProvider } from "./widgets-provider";
import { ReactQueryProvider } from "./react-query-provider";

import { UseSolanaAccountBalanceProvider } from "./useSolanaAccountBalance";

export function BolarityProvider({ children }: { children: React.ReactNode }) {
  return (
    <EvmProvider>
      <ReactQueryProvider>
        <ClusterProvider>
          <SolanaProvider>
            <BolarityWalletProvider>
              <UseSolanaAccountBalanceProvider>
                <WidgetsProvider>{children}</WidgetsProvider>
              </UseSolanaAccountBalanceProvider>
            </BolarityWalletProvider>
          </SolanaProvider>
        </ClusterProvider>
      </ReactQueryProvider>
    </EvmProvider>
  );
}
