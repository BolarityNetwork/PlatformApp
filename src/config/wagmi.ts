import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors';

export const projectId = process.env['NEXT_PUBLIC_PROJECT_ID']

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
