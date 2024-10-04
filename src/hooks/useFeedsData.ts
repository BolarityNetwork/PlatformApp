import { CurrencyEnum } from "@/config";
import { useAllCoinPrices } from "@/hooks/useCoingecko";
import { useAtom } from "jotai";
import {
  useEffect,
  useMemo,
} from "react";
import { feedsDataAtom } from "./atoms";

export const useFeedsData = () => {
  const [feedsData, setFeedsData] = useAtom(feedsDataAtom);
  const { data, isLoading, error, refetch } = useAllCoinPrices();

  useEffect(() => {
    if (data) {
      setFeedsData((currentFeeds) => {
        const updateFeeds = {
          ...currentFeeds,
          [CurrencyEnum.ETHEREUM]: {
            ...currentFeeds[CurrencyEnum.ETHEREUM],
            price: data.RAW.ETH.USD.PRICE,
            formattedPrice: data.DISPLAY.ETH.USD.PRICE,
            change24h: data.RAW.ETH.USD.CHANGEPCT24HOUR,
          },
          [CurrencyEnum.SOLANA]: {
            ...currentFeeds[CurrencyEnum.SOLANA],
            price: data.RAW.SOL.USD.PRICE,
            formattedPrice: data.DISPLAY.SOL.USD.PRICE,
            change24h: data.RAW.SOL.USD.CHANGEPCT24HOUR,
          },
          [CurrencyEnum.USDT]: {
            ...currentFeeds[CurrencyEnum.USDT],
            price: data.RAW.USDC.USD.PRICE,
            formattedPrice: data.DISPLAY.USDC.USD.PRICE,
            change24h: data.RAW.USDC.USD.CHANGEPCT24HOUR,
          },
          [CurrencyEnum.USDC]: {
            ...currentFeeds[CurrencyEnum.USDC],
            price: data.RAW.USDC.USD.PRICE,
            formattedPrice: data.DISPLAY.USDC.USD.PRICE,
            change24h: data.RAW.USDC.USD.CHANGEPCT24HOUR,
          },
        };
        return updateFeeds;
      });
    }
  }, [data, setFeedsData]);

  return useMemo(() => ({ feedsData, isLoading, error, refetch }), [error, feedsData, isLoading, refetch]);;
}
