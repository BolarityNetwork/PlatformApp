export enum SupportChain {
  Solana = "Solana",
  Ethereum = "Ethereum",
}

export enum CurrencyEnum {
  ETHEREUM = 'eth',
  SOLANA = 'sol',
  USDT = 'usdt',
  USDC = 'usdc',
}
export const BOLARITY_SOLANA_CONTRACT = process.env.NEXT_PUBLIC_BOLARITY_SOLANA_CONTRACT!
export const BOLARITY_EVM_CONTRACT = process.env.NEXT_PUBLIC_BOLARITY_EVM_CONTRACT! as `0x${string}`
export const TOKEN_BRIDGE_RELAYER_CONTRACT =  process.env.NEXT_PUBLIC_TOKEN_BRIDGE_RELAYER_CONTRACT! as `0x${string}`;

export const AAVE_CONTRACT = process.env.NEXT_PUBLIC_AAVE_CONTRACT! as `0x${string}`;

export const EVM_RPC_URl = process.env.NEXT_PUBLIC_EVM_RPC_URL!;
export const EVM_WSOL_CONTRACT = process.env.NEXT_PUBLIC_EVM_WSOL_CONTRACT! as `0x${string}`;
export const EVM_USDC_CONTRACT = process.env.NEXT_PUBLIC_EVM_USDC_CONTRACT! as `0x${string}`;
export const EVM_USDT_CONTRACT = process.env.NEXT_PUBLIC_EVM_USDT_CONTRACT! as `0x${string}`;

export const SOLANA_USDT_CONTRACT = process.env.NEXT_PUBLIC_SOLANA_USDT_CONTRACT!;
export const SOLANA_USDC_CONTRACT = process.env.NEXT_PUBLIC_SOLANA_USDC_CONTRACT!;

export const WORMHOLE_SOLANA_BRIDGE = process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_BRIDGE!;
export const WORMHOLE_SOLANA_TOKEN_BRIDGE = process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_TOKEN_BRIDGE!;
export const WORMHOLE_SOLANA_NFT_BRIDGE = process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_NFT_BRIDGE!;
export const WORMHOLE_EVM_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_WORMHOLE_EVM_CHAIN_ID!);
export const WORMHOLE_EVM_CHAIN_NAME = process.env.NEXT_PUBLIC_WORMHOLE_EVM_CHAIN_NAME!;

export const UNI_PROXY = require('../abis/UniProxy.json');
export const AAVE = require('../abis/AAVE.json');