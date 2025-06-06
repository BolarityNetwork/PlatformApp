import { CurrencyEnum, SupportChain } from "@/config";
import { atom } from "jotai";

export interface IWallet {
  chain: SupportChain | null;
  address: string;
  evmAddress: string;
  disconnect: () => void;
}

export const isConnectedAtom = atom(false);

export const walletAtom = atom<IWallet>({
  chain: null,
  address: "",
  evmAddress: "",
  disconnect: () => {},
});
export interface IDriftDataType {
  btc: number;
  usdc: number;
  sol: number;
}
export interface BalanceData {
  ethSolBalance: number;
  ethBalance: number;
  ethUsdtBalance: number;
  ethUsdcBalance: number;
}
const defaultBalanceData = {
  ethSolBalance: 0,
  ethBalance: 0,
  ethUsdtBalance: 0,
  ethUsdcBalance: 0,
};
export const accountBalanceDataAtom = atom<BalanceData>(defaultBalanceData);

export interface FeedInfo {
  logo: string;
  symbol: string;
  name: string;
  price: number;
  formattedPrice: string;
  network: string;
  change24h: number;
}

export type FeedsType = {
  [key in CurrencyEnum]: FeedInfo;
};

const defaultFeedsData: FeedsType = {
  [CurrencyEnum.ETHEREUM]: {
    logo: "/ethereum.svg",
    symbol: "ETH",
    name: "Ethereum",
    price: 0,
    formattedPrice: "0",
    network: "Ethereum",
    change24h: 0,
  },
  [CurrencyEnum.SOLANA]: {
    logo: "/solana.svg",
    symbol: "SOL",
    name: "Solana",
    price: 0,
    formattedPrice: "0",
    network: "Solana",
    change24h: 0,
  },
  [CurrencyEnum.USDC]: {
    logo: "/usdc.png",
    symbol: "USDC",
    name: "USD Coin",
    price: 1,
    formattedPrice: "0",
    network: "Solana",
    change24h: 0,
  },
  [CurrencyEnum.USDT]: {
    logo: "",
    symbol: "",
    name: "",
    price: 1,
    formattedPrice: "",
    network: "",
    change24h: 0,
  },
  [CurrencyEnum.BOLARITY]: {
    logo: "/bol.svg",
    symbol: "BOL",
    name: "Bolarity",
    price: 1,
    formattedPrice: "0",
    network: "Solana",
    change24h: 0,
  },
  [CurrencyEnum.BTC]: {
    logo: "/btc.png",
    symbol: "BTC",
    name: "Bitcoin",
    price: 1,
    formattedPrice: "0",
    network: "Ethereum",
    change24h: 0,
  },
};
export const feedsDataAtom = atom<FeedsType>(defaultFeedsData);
