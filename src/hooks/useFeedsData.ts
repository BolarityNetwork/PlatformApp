import { CurrencyEnum } from "@/config";
import { useAtom } from "jotai";
import { useEffect, useCallback } from "react";
import { feedsDataAtom } from "./atoms";
import { useAllCoinPrices } from "@/hooks/useCoingecko";

export const useFeedsData = () => {
  const [feedsData, setFeedsData] = useAtom(feedsDataAtom);
  const { data, isLoading, error, refetch } = useAllCoinPrices();

  const updateFeedsData = useCallback(
    (currencyKey: CurrencyEnum, dataKey: string) => {
      if (data?.RAW?.[dataKey] && data?.DISPLAY?.[dataKey]) {
        setFeedsData((currentFeeds) => ({
          ...currentFeeds,
          [currencyKey]: {
            ...currentFeeds[currencyKey],
            price: data.RAW[dataKey].USD.PRICE,
            formattedPrice: data.DISPLAY[dataKey].USD.PRICE,
            change24h: data.RAW[dataKey].USD.CHANGEPCT24HOUR,
          },
        }));
      }
    },
    [data, setFeedsData]
  );

  useEffect(() => {
    if (data) {
      updateFeedsData(CurrencyEnum.ETHEREUM, "ETH");
      updateFeedsData(CurrencyEnum.SOLANA, "SOL");
      updateFeedsData(CurrencyEnum.USDC, "USDC");
      updateFeedsData(CurrencyEnum.USDT, "USDC"); // 若 USDT 对应 USDC 的数据
      updateFeedsData(CurrencyEnum.BTC, "BTC");
    }
  }, [data, updateFeedsData]);

  return { feedsData, isLoading, error, refetch };
};
