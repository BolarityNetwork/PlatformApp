import { SolanaProvider } from "./solana-provider";
import { EvmProvider } from "./evm-provider";
import { ClusterProvider } from "./cluster-provider";

export function BolarityProvider({ children }: { children: React.ReactNode }) {
  return (
    <EvmProvider>
      <ClusterProvider>
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </ClusterProvider>
    </EvmProvider>
  );
}
