export enum SupportChain {
  Solana = "Solana",
  Ethereum = "Ethereum",
}

export enum CurrencyEnum {
  ETHEREUM = "eth",
  SOLANA = "sol",
  USDT = "usdt",
  USDC = "usdc",
  BOLARITY = "bol",
  BTC = "btc",
}
// 虫洞的solana合约
export const BOLARITY_SOLANA_CONTRACT =
  process.env.NEXT_PUBLIC_BOLARITY_SOLANA_CONTRACT!;
// export const EVM_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOLARITY_EVM_CONTRACT! as `0x${string}`;

// bolarity 的eth 合约
export const BOLARITY_EVM_CONTRACT = process.env
  .NEXT_PUBLIC_BOLARITY_EVM_CONTRACT! as `0x${string}`;
export const TOKEN_BRIDGE_RELAYER_CONTRACT = process.env
  .NEXT_PUBLIC_TOKEN_BRIDGE_RELAYER_CONTRACT! as `0x${string}`;

export const AAVE_CONTRACT = process.env
  .NEXT_PUBLIC_AAVE_CONTRACT! as `0x${string}`;

export const EVM_RPC_URl = process.env.NEXT_PUBLIC_EVM_RPC_URL!;
export const EVM_WSOL_CONTRACT = process.env
  .NEXT_PUBLIC_EVM_WSOL_CONTRACT! as `0x${string}`;
export const EVM_USDC_CONTRACT = process.env
  .NEXT_PUBLIC_EVM_USDC_CONTRACT! as `0x${string}`;
export const EVM_USDT_CONTRACT = process.env
  .NEXT_PUBLIC_EVM_USDT_CONTRACT! as `0x${string}`;

export const SOLANA_USDT_CONTRACT =
  process.env.NEXT_PUBLIC_SOLANA_USDT_CONTRACT!;
export const SOLANA_USDC_CONTRACT =
  process.env.NEXT_PUBLIC_SOLANA_USDC_CONTRACT!;

export const WORMHOLE_SOLANA_BRIDGE =
  process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_BRIDGE!;
export const WORMHOLE_SOLANA_TOKEN_BRIDGE =
  process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_TOKEN_BRIDGE!;
export const WORMHOLE_SOLANA_NFT_BRIDGE =
  process.env.NEXT_PUBLIC_WORMHOLE_SOLANA_NFT_BRIDGE!;

// 虫洞的eth合约 id
export const WORMHOLE_EVM_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_WORMHOLE_EVM_CHAIN_ID!
);
export const WORMHOLE_EVM_CHAIN_NAME =
  process.env.NEXT_PUBLIC_WORMHOLE_EVM_CHAIN_NAME!;

export const UNI_PROXY = require("../abis/UniProxy.json");
export const TOKEN_BRIDGE_RELAYER = require("../abis/TokenBridgeRelayer.json");
// export const AAVE = require('../abis/AAVE.json');

// lido api url
export const LIDO_APR_URL = process.env.NEXT_PUBLIC_LIDO_APR_URL!;

export const PROXY_LIDO_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_PROXY_LIDO_CONTRACT_ADDRESS! as `0x${string}`;
export const ETH_TO_STETH_STAKING = require("../abis/EthToStethStaking.json");

// 授权的最大值
export const APPROVE_BASE_AMOUNT = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

export const ETH_CONTROLLED_SOL_TOKEN =
  process.env.NEXT_PUBLIC_WORMHOLE_EVM_CONTROLLED_TOKEN_BRIDGE!;

// sol rpc url
export const SOLANA_RPC_URL = `${process.env.NEXT_PUBLIC_RPC_URL}`;

// nft

export const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT!;
export const NFT_PROOF_CONTRACT = process.env.NEXT_PUBLIC_NFT_PROOF_CONTRACT!;
export const NFT_VERIFICATION_CONTRACT =
  process.env.NEXT_PUBLIC_NFT_VERIFICATION_CONTRACT!;

// claim token
export const CLAIM_TOKEN_CONTRACT = process.env.NEXT_PUBLIC_TOKEN_CONTRACT!;
// token claim program ID
export const TOKEN_CLAIM_PROGRAM = process.env.NEXT_PUBLIC_TOKEN_CLAIM_PROGRAM!;

// nft abi

export const NFT_BASE_ABI = require("../abis/NFT.json");

// aave 2025-04-24 edit
export const EVM_AAVE_CONTRACT = process.env
    .NEXT_PUBLIC_EVM_AAVE_CONTRACT! as `0x${string}`,
  EVM_AAVE_USDT_CONTRACT = process.env
    .NEXT_PUBLIC_EVM_AAVE_USDT_CONTRACT! as `0x${string}`;

// 2025-04-27 create
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
export const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID!;

// 2025-04-30 create
export const SOL_BTC_TOKEN = process.env.NEXT_PUBLIC_SOL_BTC_TOKEN!;

// drift Sol market
// index=1
// marketpda=…

// drift USDC market
// index=2
// marketpda=…
// 2025-05-06 create drift
export const DRIFT_MARKET_INFO = {
    sol: {
      market_index: process.env.NEXT_PUBLIC_DRIFT_SOL_MARKET_INDEX!,
      market_pda: process.env.NEXT_PUBLIC_DRIFT_SOL_MARKET_PDA!,
    },
    usdc: {
      market_index: process.env.NEXT_PUBLIC_DRIFT_USDC_MARKET_INDEX!,
      market_pda: process.env.NEXT_PUBLIC_DRIFT_USDC_MARKET_PDA!,
    },
    btc: {
      market_index: process.env.NEXT_PUBLIC_DRIFT_BTC_MARKET_INDEX!,
      market_pda: process.env.NEXT_PUBLIC_DRIFT_BTC_MARKET_PDA!,
    },
  },
  DRIFT_ACCOUNT_ID = Number(process.env.NEXT_PUBLIC_DRIFT_ACCOUNT_ID!),
  DRIFT_BTC_MINT = process.env.NEXT_PUBLIC_DRIFT_BTC_MINT!;
