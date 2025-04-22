import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { publicClient } from "@/config/wagmi";
import { aaveABI } from "@/abis/AAveABI";

import { formatUnits } from "viem";

import {
  ETH_TO_STETH_STAKING,
  EVM_USDT_CONTRACT,
  LIDO_APR_URL,
  PROXY_LIDO_CONTRACT_ADDRESS,
} from "@/config";

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
}
export const DefaultReserveData: IReserveData = {
  usdt: {
    balance: 0,
    apy: "",
    daily: "",
  },
};

export const TableHeaderArr = [
  "",
  "Network",
  "Application",
  "Wallet",
  "Balance",
  "APY",
  "DAILY",
  "",
];
const address = "0x69529987fa4a075d0c00b0128fa848dc9ebbe9ce";
const pAddress = "0x012bac54348c0e635dcac9d5fb99f06f24136c9a";

export const useGetReserveData = ({ evmAddress }: { evmAddress: string }) => {
  console.log("evmAddress:", evmAddress);
  return useQuery({
    queryKey: ["getReserveData", evmAddress],
    // enabled: !!evmAddress,
    queryFn: async (): Promise<IReserveData> => {
      if (!evmAddress) {
        return Promise.reject("EVM address is empty, stopping request.");
      }

      let scaledATokenBalance: bigint = 0n;
      let liquidityIndex: bigint = 0n;
      let liquidityRate: bigint = 0n;
      let _reservesData: IReserveData = DefaultReserveData;

      try {
        const userReserveDataResp = await publicClient.readContract({
          address,
          abi: aaveABI,
          functionName: "getUserReservesData",
          args: [pAddress, evmAddress as `0x${string}`],
        });
        // console.log('userReserveDataResp:', userReserveDataResp)
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
      } catch (e) {
        console.log("getUserReservesData error:", e);
      }

      try {
        const reservesDataResp = await publicClient.readContract({
          address,
          abi: aaveABI,
          functionName: "getReservesData",
          args: [pAddress],
        });
        // console.log('userReserveDataResp----getReservesData:', reservesDataResp)
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
      } catch (e) {
        console.log("getReservesData error:", e);
      }
      try {
        // 计算USDT balance
        if (scaledATokenBalance > 0 && liquidityIndex) {
          const tenToThe27 = BigInt(10 ** 27);
          const _balance =
            (BigInt(scaledATokenBalance) * BigInt(liquidityIndex)) / tenToThe27;
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
            Math.pow(1 + depositAPR / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
          const dailyRate = Math.pow(1 + depositAPY, 1 / 365) - 1;

          _reservesData.usdt.apy = (depositAPY * 100).toFixed(2) + "%";
          _reservesData.usdt.daily = (dailyRate * 100).toFixed(2) + "%";
        }
      } catch (error) {
        console.log("calculate reserve data error:", error);
      }

      console.log("fetchReserveData:", _reservesData);

      return _reservesData;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};

export const useGetLindoReserveData = ({
  evmAddress,
}: {
  evmAddress: string;
}) => {
  return useQuery({
    queryKey: ["lidoGetStEthBalance", evmAddress],
    enabled: !!evmAddress,
    queryFn: async (): Promise<any> => {
      try {
        const userReserveDataResp: any = await publicClient.readContract({
          address: PROXY_LIDO_CONTRACT_ADDRESS as `0x${string}`,
          abi: ETH_TO_STETH_STAKING.abi,
          functionName: "getStEthBalance",
          args: [evmAddress as `0x${string}`],
        });
        console.log("getlidoDdata-----:", userReserveDataResp);

        if (
          userReserveDataResp &&
          userReserveDataResp instanceof Array &&
          userReserveDataResp.length > 0
        ) {
          return userReserveDataResp;
        }
        return [0, 0];
      } catch (e) {
        console.log("getlidoDdata----- error:", e);
      }
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};

// 获取Lido APY
export const useGetLidoApr = () => {
  return useQuery({
    queryKey: ["useGetLidoAprReq"],
    queryFn: () => fetch(LIDO_APR_URL).then((res) => res.json()),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
};

export const DEPOSIT_ABI = [
    "function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
  ],
  WITHDRAW_ABI = [
    "function withdraw(address asset,uint256 amount, address to)",
  ],
  USDT_APPROVE_ABI = ["function approve(address to, uint256 tokenId)"],
  LIDO_STAKE_ABI = ["function stake(uint256 lockTime) external payable"];
