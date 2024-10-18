import { createPublicClient } from 'viem';
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors';

export const projectId = process.env['NEXT_PUBLIC_PROJECT_ID']

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
})

export const publicClient = createPublicClient({ 
  chain: sepolia,
  transport: http()
})