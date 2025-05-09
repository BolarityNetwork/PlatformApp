import { useMemo } from "react";
import { useGetBalance } from "@/hooks/useAccount";

import { useFeedsData } from "@/hooks/useFeedsData";
import LoadingSpinner from "@/components/ui/loading-spinner";

import { useSolanaAccountBalance } from "@/providers/useSolanaAccountBalance";

const AccountBalance = () => {
  const { isLoading, data: accountBalance } = useGetBalance();

  const { feedsData } = useFeedsData();
  const { solBalance, solBolBalance, solUsdcBalance } =
    useSolanaAccountBalance();
  console.log("ws-sol---balance", solBalance);
  const balanceAmount = useMemo(() => {
    let _balance = 0;
    if (!accountBalance) return _balance.toFixed(2);
    console.log("feedsData", feedsData);
    const {
      ethBalance = 0,
      ethSolBalance = 0,
      ethUsdcBalance = 0,
      ethUsdtBalance = 0,
    }: any = accountBalance;
    const total =
      solBalance * feedsData?.sol?.price +
      ethSolBalance * feedsData?.sol?.price +
      ethBalance * feedsData?.eth?.price +
      ethUsdcBalance * feedsData?.usdc?.price +
      ethUsdtBalance * feedsData?.usdt?.price +
      solBolBalance * feedsData?.bol?.price +
      solUsdcBalance * feedsData?.usdc?.price;

    console.log("total", total);
    return total.toFixed(2);
  }, [accountBalance, feedsData]);

  return (
    <h3 className="text-1xl font-bold tracking-tight sm:text-2xl cursor-pointer">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <span className="text-sm">$ </span>
          {balanceAmount}
        </>
      )}
    </h3>
  );
};

export default AccountBalance;
