import { CurrencyEnum, SupportChain } from '@/config';
import { atom } from 'jotai';

export interface IWallet {
  chain: SupportChain | null;
  address: string;
  evmAddress: string;
  disconnect: () => void;
}

export const isConnectedAtom = atom(false);

export const walletAtom = atom<IWallet>({
  chain: null,
  address: '',
  evmAddress: '',
  disconnect: () => {},
});


export interface BalanceData {
  solBalance: number,
  solUsdtBalance: number,
  solUsdcBalance: number,
  ethBalance: number,
  ethUsdtBalance: number,
  ethUsdcBalance: number,
}
const defaultBalanceData = {
  solBalance: 0,
  solUsdtBalance: 0,
  solUsdcBalance: 0,
  ethBalance: 0,
  ethUsdtBalance: 0,
  ethUsdcBalance: 0,
}
export const accountBalanceDataAtom = atom<BalanceData>(defaultBalanceData)

export interface FeedInfo {
  logo: string;
  symbol: string;
  name: string;
  price: number;
  formattedPrice: string;
  network: string;
  change24h: number;
};

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
};
export const feedsDataAtom = atom<FeedsType>(defaultFeedsData)

