import { CurrencyEnum } from "@/config";

export const Eth_Set_From_Chain_LIst = [
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
  ],
  SetFromChainLIst = [
    ...Eth_Set_From_Chain_LIst,
    {
      name: "BOLARITY",
      text: "BOL",
      value: CurrencyEnum.BOLARITY,
      iconUrl: "/walletNo.svg",
    },
  ];

export type FromChainType = {
  name: string;
  value: CurrencyEnum;
  iconUrl: string;
  text: string;
};
