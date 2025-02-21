"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

import { AccountInfo } from "../widgets/account-info";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefreshCcwIcon } from "lucide-react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { formatEther } from "viem";

import { FaEthereum } from "react-icons/fa";

import {
  TableHeaderArr,
  useGetLidoApr,
  useGetLindoReserveData,
} from "./vaults-data";
import { useGetBalance } from "@/hooks/useAccount";
import { useGetReserveData } from "./vaults-data";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useMemo, useState } from "react";

import { DepositModal, LidoDepositModal } from "./vaults-ui";
import { SolDeposit } from "./sol-deposit";
import { SupportChain } from "@/config";
import { useEffect } from "react";

const VaultsFeature = () => {
  // aave deposit modal
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  // aave withdraw modal
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // lido deposit modal
  const [lidoDepositModalOpen, setLidoDepositModalOpen] = useState(false);

  const { data: accountBalance, refetch: refetchAccountBalance } =
    useGetBalance();
  const { evmAddress, ChainType } = useBolarityWalletProvider();

  const { data: reservesData, refetch: refetchReserveData } = useGetReserveData(
    { evmAddress }
  );
  const { data: lidoData, refetch: refetchLindoData } = useGetLindoReserveData({
    evmAddress,
  });
  const { data: lidoAprData } = useGetLidoApr();

  const handleRefresh = async () => {
    await refetchAccountBalance();
    await refetchReserveData();
    await refetchLindoData();
  };

  useEffect(() => {
    if (ChainType) {
      handleRefresh();
      console.log("ChainType-vaults--刷新了");
    }
  }, [ChainType]);

  const getBalance = useMemo(() => {
    if (ChainType && evmAddress)
      return {
        // solanaUsdt: accountBalance?.solUsdtBalance,
        evmUsdt: accountBalance?.ethUsdtBalance,
        depositedUsdt: reservesData?.usdt.balance || 0,
        apyUsdt: reservesData?.usdt.apy || "-",
        dailyUsdt: reservesData?.usdt.daily || "-",
      };
    return {
      // solanaUsdt: 0,
      evmUsdt: 0,
      depositedUsdt: 0,
      apyUsdt: "-",
      dailyUsdt: "-",
    };
  }, [accountBalance, reservesData, ChainType]);

  const getLidoBalance = useMemo(() => {
    if (ChainType && evmAddress)
      return {
        apyUsdt: lidoAprData?.data?.apr ? lidoAprData?.data?.apr + "%" : "-",
        evmUsdt:
          (accountBalance?.ethBalance &&
            accountBalance?.ethBalance.toFixed(9)) ||
          0,
        depositedUsdt: lidoData
          ? Number(formatEther(lidoData[0] + lidoData[1], "wei")).toFixed(6)
          : 0,
        dailyUsdt: lidoAprData?.data?.apr
          ? (lidoAprData?.data?.apr / 365).toFixed(3) + "%"
          : "-",
      };
    return {
      apyUsdt: "-",
      evmUsdt: 0,
      depositedUsdt: 0,
      dailyUsdt: "-",
    };
  }, [lidoAprData, lidoData, accountBalance, ChainType]);
  return (
    <main className="container">
      <div className="padding-y flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div className="g-card">
          <AccountInfo />
        </div>
        <div className="g-card">
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-2xl xl:text-4xl font-bold"></h2>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={handleRefresh}
            >
              <RefreshCcwIcon className="h-5 w-5 text-primary" />
            </Button>
          </div>
          <Table className="mt-0 md:mt-4">
            <TableHeader>
              <TableRow>
                {TableHeaderArr.map((item, index) => (
                  <TableHead key={index} className="p-3">
                    {item}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="p-3 lg:w-[160px] xl:w-[240px]">
                  <div className="flex gap-2 items-center">
                    <Image
                      src="/tether.png"
                      alt="USDT"
                      width={24}
                      height={24}
                    />
                    <h4 className="xl:text-lg uppercase">USDT</h4>
                  </div>
                </TableCell>
                <TableCell className="p-3lg:w-[100px] xl:w-[160px]">
                  <FaEthereum size={24} />
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <Image src="/aave.png" alt="AAVE" width={24} height={24} />
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">
                    {getBalance.evmUsdt?.toFixed(2) || 0.0}
                  </h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">
                    {getBalance.depositedUsdt?.toFixed(2) || 0.0}
                  </h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">{getBalance.apyUsdt || "-"}</h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">{getBalance.dailyUsdt || "-"}</h5>
                </TableCell>
                <TableCell className="p-3 text-right lg:w-[100px] xl:w-[160px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        disabled={!ChainType}
                      >
                        <DotsHorizontalIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setDepositModalOpen(true)}
                      >
                        Deposit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setWithdrawModalOpen(true)}
                        disabled={Number(getBalance.depositedUsdt) === 0}
                      >
                        Withdraw
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              {/* lido */}
              <TableRow>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <div className="flex gap-2 items-center">
                    {/* <Image
                      src="/ethereum.svg"
                      alt="ETH"
                      width={24}
                      height={24}
                    /> */}
                    <FaEthereum size={24} />

                    <h4 className="xl:text-lg ">ETH</h4>
                  </div>
                </TableCell>
                <TableCell className="p-3lg:w-[100px] xl:w-[160px]">
                  <FaEthereum size={24} />
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <Image src="/lido.svg" alt="LIDO" width={24} height={24} />
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">{getLidoBalance?.evmUsdt}</h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">
                    {getLidoBalance.depositedUsdt}
                    <Badge variant="secondary">stETH</Badge>
                  </h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">{getLidoBalance.apyUsdt}</h5>
                </TableCell>
                <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
                  <h5 className="xl:text-lg">{getLidoBalance.dailyUsdt}</h5>
                </TableCell>
                <TableCell className="p-3 text-right lg:w-[100px] xl:w-[160px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        disabled={!ChainType}
                      >
                        <DotsHorizontalIcon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setLidoDepositModalOpen(true)}
                        disabled={getLidoBalance.evmUsdt === 0}
                      >
                        Stake
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      {/* 存款弹框 */}

      {ChainType == SupportChain.Ethereum && (
        <>
          <DepositModal
            open={depositModalOpen}
            onOpenChange={(open) => {
              setDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getBalance.evmUsdt}
            isDeposit={true}
          />
          {/* 提现弹框 */}
          <DepositModal
            open={withdrawModalOpen}
            onOpenChange={(open) => {
              setWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getBalance.depositedUsdt}
            isDeposit={false}
          />
        </>
      )}
      {/* solana 存款 */}
      {ChainType == SupportChain.Solana && (
        <>
          <SolDeposit
            open={depositModalOpen}
            onOpenChange={(open) => {
              setDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getBalance.evmUsdt}
            isDeposit={true}
          />
          {/* 提现弹框 */}
          <SolDeposit
            open={withdrawModalOpen}
            onOpenChange={(open) => {
              setWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getBalance.depositedUsdt}
            isDeposit={false}
          />
        </>
      )}
      {/* lido deposit modal */}
      <LidoDepositModal
        open={lidoDepositModalOpen}
        onOpenChange={(open) => {
          setLidoDepositModalOpen(open);
          if (!open) {
            handleRefresh();
          }
        }}
        evmUsdtBalance={getLidoBalance.evmUsdt}
      />
    </main>
  );
};

export default VaultsFeature;
