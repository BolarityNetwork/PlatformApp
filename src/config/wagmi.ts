import { createPublicClient } from "viem";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];

if (!projectId) {
  throw new Error("Project ID is not defined");
}
const evmRpcUrl = process.env["NEXT_PUBLIC_EVM_RPC_URL"];
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(evmRpcUrl),
  },
});

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(evmRpcUrl),
});
