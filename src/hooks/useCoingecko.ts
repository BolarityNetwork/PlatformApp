import { CurrencyEnum } from '@/config';
import { fetchAllCoinPrice } from '@/lib/coingecko/apis';
import { IAllPrice } from '@/lib/coingecko/interfaces/AllPrice';
import { useQuery } from '@tanstack/react-query';

export const useAllCoinPrices = () => {
  const symbols = [CurrencyEnum.ETHEREUM, CurrencyEnum.SOLANA, CurrencyEnum.USDC].join(',');

  return useQuery<IAllPrice>({
    queryKey: ['AllCoinPrices', symbols],
    queryFn: async () => {
      const coinPrice = await fetchAllCoinPrice(symbols)
      // console.log("fetched coin prices:", coinPrice);
      return coinPrice
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};

