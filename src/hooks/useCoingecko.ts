import { CurrencyEnum } from "@/config";
import { fetchAllCoinPrice } from "@/lib/coingecko/apis";
import { IAllPrice } from "@/lib/coingecko/interfaces/AllPrice";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useQuery } from "@tanstack/react-query";

export const useAllCoinPrices = () => {
  const { ChainType } = useBolarityWalletProvider();

  const symbols = [
    CurrencyEnum.ETHEREUM,
    CurrencyEnum.SOLANA,
    CurrencyEnum.USDC,
    CurrencyEnum.USDT,
    CurrencyEnum.BTC,
  ].join(",");

  return useQuery<IAllPrice>({
    queryKey: ["AllCoinPrices", symbols],
    // queryFn: async () => {
    //   const coinPrice = await fetchAllCoinPrice(symbols)
    //   // console.log("fetched coin prices:", coinPrice);
    //   return coinPrice
    // },

    queryFn: async () => await fetchAllCoinPrice(symbols),
    enabled: !!ChainType,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};
