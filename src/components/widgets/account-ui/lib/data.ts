import { CurrencyEnum } from "@/config";

export const SetFromChainLIst = [
  {
    name: "SOL",
    text: "SOLANA",
    value: CurrencyEnum.SOLANA,
    iconUrl: "/solana.svg",
  },
  {
    name: "ETH",
    text: "ETHEREUM",
    value: CurrencyEnum.ETHEREUM,
    iconUrl: "/ethereum.svg",
  },
  {
    name: "USDT",
    text: "TETHER",
    value: CurrencyEnum.USDT,
    iconUrl: "/tether.png",
  },
  {
    name: "USDC",
    text: "USD COIN",
    value: CurrencyEnum.USDC,
    iconUrl: "/usdc.png",
  },
];

export type FromChainType = {
  name: string;
  value: CurrencyEnum;
  iconUrl: string;
  text: string;
};
