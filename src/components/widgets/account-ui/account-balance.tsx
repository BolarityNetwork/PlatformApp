import { useMemo } from "react";
import { useGetBalance } from "@/hooks/useAccount";

import { useFeedsData } from "@/hooks/useFeedsData";
import LoadingSpinner from "@/components/ui/loading-spinner";

const AccountBalance = () => {
  const { isLoading, data: accountBalance } = useGetBalance();

  const { feedsData } = useFeedsData();

  const balanceAmount = useMemo(() => {
    let _balance = 0;
    if (!accountBalance) return _balance.toFixed(2);
    if (feedsData?.sol) {
      const { solBalance, solUsdcBalance, solUsdtBalance }: any =
        accountBalance;
      _balance += solBalance * feedsData.sol.price;
      _balance += solUsdcBalance;
      _balance += solUsdtBalance;
    }

    if (feedsData?.eth) {
      const { ethBalance, ethUsdcBalance, ethUsdtBalance }: any =
        accountBalance;
      _balance += ethBalance * feedsData.eth.price;
      _balance += ethUsdcBalance;
      _balance += ethUsdtBalance;
    }
    return _balance.toFixed(2);
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
