import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { aaveABI } from "@/abis/AAveABI";

import { formatEther, formatUnits } from "viem";

import {
  ETH_TO_STETH_STAKING,
  EVM_AAVE_CONTRACT,
  EVM_AAVE_USDT_CONTRACT,
  EVM_USDT_CONTRACT,
  LIDO_APR_URL,
  PROXY_LIDO_CONTRACT_ADDRESS,
  DRIFT_MARKET_INFO,
} from "@/config";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useGetBalance } from "@/hooks/useAccount";
import { useMemo } from "react";
import { FormatNumberWithDecimals, fetchWithTimeout } from "@/lib/utils";
import { publicClient } from "@/config/wagmi";

export interface IBalance {
  solanaUsdt?: number;
  evmUsdt?: number;
  depositedUsdt?: number;
  apyUsdt?: string;
  dailyUsdt?: string;
}
export const DefaultBalance: IBalance = {
  solanaUsdt: 0,
  evmUsdt: 0,
  depositedUsdt: 0,
  apyUsdt: "",
  dailyUsdt: "",
};

export interface IReserveUSDTBalance {
  balance: number;
  apy: string;
  daily: string;
}
export interface IReserveData {
  usdt: IReserveUSDTBalance;
  lido: number;
}
export const DefaultReserveData: IReserveData = {
  usdt: {
    balance: 0,
    apy: "",
    daily: "",
  },
  lido: 0,
};

export interface IDriftDataType {
  btc: number;
  usdc: number;
  sol: number;
}

export const DefaultDriftData: IDriftDataType = {
  btc: 0,
  usdc: 0,
  sol: 0,
};

export const VaultHeader = [
    "",
    "NETWORK",
    "WALLET",
    "DEPOSITED",
    "APY",
    "DETAILS",
  ],
  Valuts_Strategy_title: string[] = ["Strategy Staking", "Deposited", "APY"],
  Valuts_title: string[] = ["Flexible Staking", "Deposited", "APY"];

const DriftApyUrl = (index: string) =>
  `https://data.api.drift.trade/rateHistory?marketIndex=${index}&type=deposit`;

export const useGetReserveData = () => {
  const { evmAddress } = useBolarityWalletProvider();

  return useQuery({
    queryKey: ["getVaultReserveData", evmAddress],
    enabled: !!evmAddress,
    queryFn: async (): Promise<IReserveData> => {
      // 并行执行所有请求
      const promises = [];

      let scaledATokenBalance: bigint = 0n;
      let liquidityIndex: bigint = 0n;
      let liquidityRate: bigint = 0n;
      let _reservesData: IReserveData = DefaultReserveData;

      promises.push(
        fetchWithTimeout(
          publicClient
            .readContract({
              address: EVM_AAVE_CONTRACT,
              abi: aaveABI,
              functionName: "getUserReservesData",
              args: [EVM_AAVE_USDT_CONTRACT, evmAddress as `0x${string}`],
            })
            .then((userReserveDataResp) => {
              if (
                userReserveDataResp &&
                userReserveDataResp instanceof Array &&
                userReserveDataResp.length > 0
              ) {
                for (const item of userReserveDataResp[0]) {
                  // console.log("userReserveData item:", item);
                  if (
                    item.underlyingAsset.toLocaleLowerCase() ==
                    EVM_USDT_CONTRACT.toLocaleLowerCase()
                  ) {
                    scaledATokenBalance = item.scaledATokenBalance;
                    break;
                  }
                }
              }
            })
        )
      );

      promises.push(
        fetchWithTimeout(
          publicClient
            .readContract({
              address: EVM_AAVE_CONTRACT,
              abi: aaveABI,
              functionName: "getReservesData",
              args: [EVM_AAVE_USDT_CONTRACT],
            })
            .then((reservesDataResp) => {
              if (
                reservesDataResp &&
                reservesDataResp instanceof Array &&
                reservesDataResp.length > 0
              ) {
                for (const item of reservesDataResp[0]) {
                  if (
                    item.underlyingAsset.toLocaleLowerCase() ==
                    EVM_USDT_CONTRACT.toLocaleLowerCase()
                  ) {
                    liquidityIndex = item.liquidityIndex;
                    liquidityRate = item.liquidityRate;
                    break;
                  }
                }
              }

              // 计算USDT balance
              if (scaledATokenBalance > 0 && liquidityIndex) {
                const tenToThe27 = BigInt(10 ** 27);
                const _balance =
                  (BigInt(scaledATokenBalance) * BigInt(liquidityIndex)) /
                  tenToThe27;
                const balance = formatUnits(_balance, 6);
                _reservesData.usdt.balance = Number(balance);
              } else {
                _reservesData.usdt.balance = 0;
              }

              // 计算APY
              if (liquidityRate) {
                const RAY = 10n ** 27n; // 10 to the power 27 as bigint
                const SECONDS_PER_YEAR = 31_536_000;

                // Calculate depositAPR as a bigint
                const depositAPR = Number(liquidityRate) / Number(RAY);

                // Calculate APY using Math.pow with floating-point precision
                const depositAPY =
                  Math.pow(
                    1 + depositAPR / SECONDS_PER_YEAR,
                    SECONDS_PER_YEAR
                  ) - 1;
                const dailyRate = Math.pow(1 + depositAPY, 1 / 365) - 1;

                _reservesData.usdt.apy = (depositAPY * 100).toFixed(2) || "0";
                _reservesData.usdt.daily = (dailyRate * 100).toFixed(2) || "0";
              }
            })
        )
      );

      promises.push(
        fetchWithTimeout(
          publicClient
            .readContract({
              address: PROXY_LIDO_CONTRACT_ADDRESS as `0x${string}`,
              abi: ETH_TO_STETH_STAKING.abi,
              functionName: "getStEthBalance",
              args: [evmAddress as `0x${string}`],
            })
            .then((res) => {
              if (res && res instanceof Array && res.length > 0) {
                _reservesData.lido = Number(
                  formatEther(res.reduce((a, b) => a + b, 0n))
                );
              }
            })
        )
      );

      console.log("fetchReserveData:", _reservesData);
      await Promise.all(promises);

      return _reservesData;
    },
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};

// 创建市场索引数组
const markets = [
  { key: "sol", index: DRIFT_MARKET_INFO.sol.market_index },
  { key: "btc", index: DRIFT_MARKET_INFO.btc.market_index },
  { key: "usdc", index: DRIFT_MARKET_INFO.usdc.market_index },
];

// 创建一个通用的获取APY数据函数
const fetchMarketApy = async (marketIndex: string): Promise<number> => {
  try {
    const response = await fetchWithTimeout(
      fetch(DriftApyUrl(marketIndex)).then((res) => res.json())
    );

    if (response.data?.length) {
      // 获取最新的APY数据并转换为百分比
      return Number(
        (Number(response.data[response.data.length - 1][1]) * 100).toFixed(2)
      );
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching APY for market ${marketIndex}:`, error);
    return 0;
  }
};
const queryObj = {
  placeholderData: keepPreviousData,
  refetchInterval: 60 * 1000,
  refetchOnWindowFocus: false,
};
export const useGetDriftApyRequest = () => {
  const { solAddress } = useBolarityWalletProvider();

  return useQuery({
    queryKey: ["getDriftApyRequest", solAddress],
    enabled: !!solAddress,
    queryFn: async (): Promise<IDriftDataType> => {
      let _reservesData: IDriftDataType = DefaultDriftData;

      // 并行获取所有市场的APY数据
      const results = await Promise.all(
        markets.map((market) =>
          fetchMarketApy(market.index).then((apy) => ({ key: market.key, apy }))
        )
      );

      // 将结果填充到返回对象中
      results.forEach((result) => {
        _reservesData[result.key as keyof IDriftDataType] = result.apy;
      });

      console.log("fetchDriftApyRequest:", _reservesData);
      return _reservesData;
    },
    ...queryObj,
  });
};

export const useGetLindoReserveData = () => {
  const { evmAddress, ChainType, solAddress } = useBolarityWalletProvider();
  const { data: accountBalance } = useGetBalance();

  // 获取Lido APY
  const { data } = useQuery({
    queryKey: ["useGetLidoAprReq"],
    queryFn: () => fetch(LIDO_APR_URL).then((res) => res.json()),
    ...queryObj,
    enabled: !!evmAddress,
  });

  // 获取drift APY
  const { data: driftSolApy } = useGetDriftApyRequest();
  // console.log("driftSolApy", driftSolApy);

  const { data: reserveData } = useGetReserveData();

  // lido eth info
  const getLidoBalance = useMemo(() => {
    if (ChainType && evmAddress)
      return {
        apyEth: data?.data?.apr ? data?.data?.apr : "0",
        balance: FormatNumberWithDecimals(
          accountBalance?.ethBalance || 0,
          4,
          6
        ),
        depositedEth: reserveData?.lido || 0,
      };
    return {
      apyEth: 0,
      balance: 0,
      depositedEth: 0,
    };
  }, [reserveData, accountBalance, ChainType, evmAddress]);

  const getAAVEBalance = useMemo(() => {
    if (ChainType && solAddress && evmAddress)
      return {
        evmUsdt: accountBalance?.ethUsdtBalance,
        depositedUsdt: reserveData?.usdt.balance,
        apyUsdt: reserveData?.usdt.apy,
        dailyUsdt: reserveData?.usdt.daily,
      };

    return {
      evmUsdt: 0,
      depositedUsdt: 0,
      apyUsdt: 0,
      dailyUsdt: 0,
    };
  }, [
    accountBalance?.ethUsdtBalance,
    ChainType,
    evmAddress,
    solAddress,
    reserveData,
  ]);

  return {
    getLidoBalance,
    getAAVEBalance,

    driftSolApy,
  };
};

export const DEPOSIT_ABI = [
    "function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
  ],
  WITHDRAW_ABI = [
    "function withdraw(address asset,uint256 amount, address to)",
  ],
  USDT_APPROVE_ABI = ["function approve(address to, uint256 tokenId)"],
  LIDO_STAKE_ABI = ["function stake(uint256 lockTime) external payable"];
