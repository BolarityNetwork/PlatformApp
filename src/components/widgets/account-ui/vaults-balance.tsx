import { useMemo } from "react";
import { useGetBalance } from "@/hooks/useAccount";

import { useFeedsData } from "@/hooks/useFeedsData";
import LoadingSpinner from "@/components/ui/loading-spinner";

import { useSolanaAccountBalance } from "@/providers/useSolanaAccountBalance";

interface IAmountType {
  depositedUsdt: number;
  depositedEth: number;
  depositedSol: number;
  depositedBtc: number;
  depositedUsdc: number;
}

export const VaultsBalance = ({
  isDeposited = 0,
  title,
  amountType = {
    depositedUsdt: 0,
    depositedEth: 0,
    depositedSol: 0,
    depositedBtc: 0,
    depositedUsdc: 0,
  },
}: {
  isDeposited?: number;
  title: string;
  amountType?: IAmountType;
}) => {
  const { isLoading, data: accountBalance } = useGetBalance();
  const { solBalance, solBtcBalance, solUsdcBalance } =
    useSolanaAccountBalance();

  const { feedsData } = useFeedsData();

  const balanceAmount = useMemo(() => {
    let _balance = 0;
    if (!accountBalance) return _balance.toFixed(2);
    const {
      ethBalance = 0,
      ethUsdcBalance = 0,
      ethUsdtBalance = 0,
    }: any = accountBalance;
    const total =
      solBalance * feedsData?.sol?.price +
      ethBalance * feedsData?.eth?.price +
      ethUsdcBalance * feedsData?.usdc?.price +
      ethUsdtBalance * feedsData?.usdt?.price +
      solBtcBalance * feedsData?.btc?.price +
      solUsdcBalance * feedsData?.usdc?.price;

    // console.log("total", total);
    return total.toFixed(2);
  }, [accountBalance, feedsData]);
  const depositedBalance = useMemo(() => {
    let _balance = 0;
    if (!accountBalance) return _balance.toFixed(2);
    const {
      depositedUsdt,
      depositedEth,
      depositedSol,
      depositedBtc,
      depositedUsdc,
    } = amountType;
    return (
      depositedUsdt * feedsData?.usdt?.price +
      depositedEth * feedsData?.eth?.price +
      depositedSol * feedsData?.sol?.price +
      depositedBtc * feedsData?.btc?.price +
      depositedUsdc * feedsData?.usdc?.price
    ).toFixed(2);
  }, [accountBalance, amountType, feedsData]);

  const total_balance = useMemo(() => {
    switch (isDeposited) {
      case 1:
        return depositedBalance;
      case 2:
        let _balance = parseFloat(balanceAmount) + parseFloat(depositedBalance);
        return _balance.toFixed(2);
      default:
        return balanceAmount;
    }
  }, [isDeposited, depositedBalance, balanceAmount]);
  return (
    <div>
      {(isDeposited == 1 && (
        <div className="text-xs uppercase mb-2">Portfolio</div>
      )) || <div className="text-xs uppercase mb-2">&nbsp;</div>}
      <div className="text-xs text-gray-400 uppercase mb-2">{title}</div>

      <h3 className="text-1xl font-bold tracking-tight sm:text-2xl cursor-pointer">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <span className="text-sm">$ </span>
            {total_balance}
          </>
        )}
      </h3>
    </div>
  );
};
