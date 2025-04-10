import { createPublicClient } from "viem";
import { createConfig, webSocket } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// ✅ 修改点：用WebSocket版RPC
const evmRpcWssUrl = process.env["NEXT_PUBLIC_EVM_RPC_WSS"];

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: webSocket(evmRpcWssUrl!),
  },
});

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: webSocket(evmRpcWssUrl!),
});
