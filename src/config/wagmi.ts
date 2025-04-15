import { createPublicClient, webSocket } from "viem";
import { createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const projectId = process.env["NEXT_PUBLIC_PROJECT_ID"];

if (!projectId) {
  throw new Error("Project ID is not defined");
}
const evmRpcUrl = process.env["NEXT_PUBLIC_EVM_RPC_WSS"];

const transport = webSocket(evmRpcUrl);
// 创建一个混合传输，WebSocket 用于订阅，HTTP 用于其他操作

export const wagmiConfig = createConfig({
  chains: [sepolia],
  ssr: true,
  connectors: [injected()],
  transports: {
    [sepolia.id]: transport,
  },
});

export const publicClient = createPublicClient({
  chain: sepolia,
  transport,
});
