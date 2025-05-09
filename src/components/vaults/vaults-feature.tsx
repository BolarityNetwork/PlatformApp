"use client";

import { IoArrowForwardSharp } from "react-icons/io5";
import { HiOutlineBars3 } from "react-icons/hi2";

import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaEthereum } from "react-icons/fa";
import { DRIFT_MARKET_INFO, SupportChain } from "@/config";

import { SiSolana } from "react-icons/si";

import { Button } from "@/components/ui/button";
import Image from "next/image";

import {
  useGetLindoReserveData,
  VaultHeader,
  Valuts_Strategy_title,
  Valuts_title,
} from "./vaults-data";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useState, Suspense, startTransition, useRef } from "react";

import { cn, FormatNumberWithDecimals } from "@/lib/utils";
import { LidoDepositModal, Valuts_RightCard } from "./vaults-ui";
import {
  DepositModal,
  SolDepositModal,
  EvmDriftModal,
  EvmDriftBtcModal,
  SolDriftModal,
} from "../widgets/valuts-ui";

// 注意：wallet 组件只能 client-side 使用

import { useEffect } from "react";
import { Input } from "../ui/input";
import { VaultsBalance } from "../widgets/account-ui/vaults-balance";

import { useSolanaAccountBalance } from "@/providers/useSolanaAccountBalance";

const bg_cell_colo = "bg-primary/15 hover:bg-primary/30";

const market_sol_index = Number(DRIFT_MARKET_INFO.sol.market_index);
const market_btc_index = Number(DRIFT_MARKET_INFO.btc.market_index);
const market_usdc_index = Number(DRIFT_MARKET_INFO.usdc.market_index);

const VaultsFeature = () => {
  const [selectIndex, setSelectIndex] = useState(0);
  // aave deposit modal
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  // sol drift deposit modal
  const [evmDriftModalOpen, setEvmDriftModalOpen] = useState(false);
  // evm btc deposit modal
  const [evmDriftBtcModalOpen, setEvmDriftBtcModalOpen] = useState(false);
  // evm btc withdraw modal
  const [evmDriftBtcWithdrawModalOpen, setEvmDriftBtcWithdrawModalOpen] =
    useState(false);
  // evm withdraw modal
  const [evmDriftWithdrawModalOpen, setEvmDriftWithdrawModalOpen] =
    useState(false);
  // evm usdc deposit modal
  const [evmDriftUsdcDepositModalOpen, setEvmDriftUsdcDepositModalOpen] =
    useState(false);
  // evm usdc withdraw m  odal
  const [evmDriftUsdcWithdrawModalOpen, setEvmDriftUsdcWithdrawModalOpen] =
    useState(false);
  // --------------------------
  // sol drift deposit modal
  const [solDriftDepositModalOpen, setSolDriftDepositModalOpen] =
    useState(false);
  // sol drift withdraw modal
  const [solDriftWithdrawModalOpen, setSolDriftWithdrawModalOpen] =
    useState(false);
  // sol drift usdc deposit modal
  const [solDriftDepositUsdcModalOpen, setSolDriftDepositUsdcModalOpen] =
    useState(false);
  // sol drift usdc withdraw modal
  const [solDriftWithdrawUsdcModalOpen, setSolDriftWithdrawUsdcModalOpen] =
    useState(false);
  // sol drift btc deposit modal
  const [solDriftDepositBtcModalOpen, setSolDriftDepositBtcModalOpen] =
    useState(false);
  // sol drift btc withdraw modal
  const [solDriftWithdrawBtcModalOpen, setSolDriftWithdrawBtcModalOpen] =
    useState(false);

  // aave withdraw modal
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // lido deposit modal
  const [lidoDepositModalOpen, setLidoDepositModalOpen] = useState(false);
  const { ChainType, evmAddress } = useBolarityWalletProvider();
  const { solBalance, driftBalance, solUsdcBalance, solBtcBalance } =
    useSolanaAccountBalance();

  const { getLidoBalance, getAAVEBalance, driftSolApy } =
    useGetLindoReserveData();

  const handleRefresh = () => {};

  // 解构统计数据，防止TS报错

  const TableHeaderArr = [
    {
      name: "USDT",
      icon: "/tether.png",
      apy: getAAVEBalance.apyUsdt,
      network: <FaEthereum size={24} />,
      app: "/aave.png",
      wallet: getAAVEBalance.evmUsdt,
      deposited: getAAVEBalance.depositedUsdt,
    },
    {
      name: "ETH",
      icon: "/ethereum.svg",
      network: <FaEthereum size={24} />,
      app: "/lido.svg",
      wallet: getLidoBalance.balance,
      deposited: getLidoBalance.depositedEth,
      apy: getLidoBalance.apyEth,
    },
    {
      name: "USDC",
      icon: "/usdc.png",
      apy: driftSolApy?.usdc || 0,
      network: <SiSolana size={24} />,

      app: "/aave.png",
      wallet: solUsdcBalance,
      deposited: driftBalance?.usdc || 0,
    },
    {
      name: "BTC",
      icon: "/bitcoin.svg",
      apy: driftSolApy?.btc || 0,
      network: <SiSolana size={24} />,

      app: "/aave.png",
      wallet: solBtcBalance,
      deposited: driftBalance?.btc || 0,
    },

    {
      name: "SOL",
      icon: "/solana.svg",
      apy: driftSolApy?.sol || 0,
      network: <SiSolana size={24} />,
      app: "/lido.svg",
      wallet: FormatNumberWithDecimals(solBalance, 4, 6),
      deposited: driftBalance?.sol || 0,
    },
  ];

  const [selectedAsset, setSelectedAsset] = useState({
    apy: 0,
    deposited: 0,
    name: "",
  });
  useEffect(() => {
    if (!ChainType && !evmAddress) {
      setSelectedAsset({
        apy: 0,
        deposited: 0,
        name: "USDT",
      });
    }
  }, [ChainType, evmAddress]);
  const rightCardRef = useRef<HTMLDivElement>(null);

  const amountType = {
    depositedUsdt: getAAVEBalance.depositedUsdt || 0,
    depositedEth: getLidoBalance.depositedEth || 0,
    depositedSol: driftBalance?.sol || 0,
    depositedBtc: driftBalance?.btc || 0,
    depositedUsdc: driftBalance?.usdc || 0,
  };

  return (
    <main className="container ">
      {/* <DriftClientProvider /> */}
      <div className="md:grid md:grid-row-3  gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div />
        {/* Portfolio Summary */}
        <div className="my-4 md:my-0 flex flex-col md:flex-row sticky  top-20 z-50 md:justify-between g-card">
          <div className="grid grid-cols-4 md:gap-10">
            <VaultsBalance
              title="Deposited"
              isDeposited={1}
              amountType={amountType}
            />
            <VaultsBalance title="Wallet balance" />

            <VaultsBalance
              title="Total Portfolio"
              isDeposited={2}
              amountType={amountType}
            />
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="text-xs uppercase mb-2">Platform</div>
              <div className="text-xs text-gray-400 uppercase mb-2">TVL ℹ️</div>
              <div className="text-2xl font-bold">$276.58 M</div>
            </div>
            <div>
              <div className="text-xs uppercase mb-2">&nbsp;</div>
              <div className="text-xs text-gray-400 uppercase mb-2">VAULTS</div>
              <div className="text-2xl font-bold">5</div>
            </div>
          </div>
        </div>

        {/* 主内容区域：左表格+右Vault卡片 */}
        <Suspense fallback={<div>Loading...</div>}>
          <div className="md:grid md:grid-row-2 md:grid-cols-3 gap-5">
            {/* 左侧资产表格 */}
            <div className="g-card md:col-span-2">
              {/* 搜索框 */}
              <div className="flex items-center ">
                <Input
                  className="rounded px-3 py-1 text-sm text-white border border-[#444] w-48"
                  placeholder="Search..."
                  type="text"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    {VaultHeader.map((item, index) => (
                      <TableHead key={index} className="p-3 ">
                        {item}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TableHeaderArr.map((item, index) => (
                    <TableRow key={item.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Image
                            src={item.icon}
                            alt={item.name}
                            width={24}
                            height={24}
                          />
                          <span className="font-bold text-base">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{item.network}</TableCell>

                      <TableCell>
                        <span className="text-xs md:text-lg">
                          {item.wallet}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs md:text-lg">
                          {FormatNumberWithDecimals(item.deposited, 4, 6)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-bold text-xl rounded-lg")}>
                          {item.apy}%
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-primary"
                          aria-label="View details"
                          onClick={() => {
                            startTransition(() => {
                              setSelectIndex(index);
                              setSelectedAsset(item);
                              // 判断是否为移动端
                              if (
                                window.innerWidth <= 768 &&
                                rightCardRef.current
                              ) {
                                setTimeout(() => {
                                  rightCardRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                }, 100); // 等待内容渲染完成
                              }
                            });
                          }}
                        >
                          {index === selectIndex ? (
                            <IoArrowForwardSharp size={24} />
                          ) : (
                            <HiOutlineBars3 size={24} />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 右侧Vault卡片 */}
            <div className="mt-4 md:mt-0 g-card">
              <div className="text-lg font-bold">Vault</div>
              {(selectedAsset.name === "USDT" && (
                <div ref={rightCardRef}>
                  {/* Flexible Staking */}
                  <div className="mb-4 mt-8">
                    <Valuts_RightCard arr={Valuts_title} />
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        {/* <AccordionTrigger className="flex-none mt-2 grid grid-cols-6 w-full  py-2 rounded-full bg-[#ff4c4c]/[0.1] hover:bg-[#ff4c4c]/[0.2]"> */}
                        <AccordionTrigger
                          className={cn(
                            "flex-none mt-2 grid grid-cols-6 w-full py-2 rounded-full",
                            bg_cell_colo
                          )}
                        >
                          <div className="option-name font-bold col-span-1">
                            Aave
                          </div>
                          <div className="col-span-1"></div>

                          <div className="text-left">
                            {FormatNumberWithDecimals(
                              selectedAsset?.deposited,
                              4,
                              6
                            )}
                          </div>
                          <div className="col-auto"></div>

                          <div className="text-left">
                            {selectedAsset?.apy + "%"}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 grid grid-cols-2 gap-2">
                          <Button
                            disabled={!ChainType}
                            onClick={() => {
                              setDepositModalOpen(true);
                            }}
                          >
                            Deposit
                          </Button>
                          <Button
                            onClick={() => {
                              setWithdrawModalOpen(true);
                            }}
                            disabled={
                              Number(getAAVEBalance.depositedUsdt) === 0
                            }
                            variant="secondary"
                          >
                            Withdraw
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div
                      className={cn(
                        " grid grid-cols-3 mt-2 items-center p-2  rounded-full",
                        bg_cell_colo
                      )}
                    >
                      <div className="option-name font-bold">Compound</div>
                      <div>0.00</div>
                      <div>7.15 %</div>
                    </div>
                    <div
                      className={cn(
                        " grid grid-cols-3 mt-2 items-center p-2  rounded-full",
                        bg_cell_colo
                      )}
                    >
                      <div className="option-name font-bold col-span-1">
                        Navi
                      </div>
                      <div>0</div>
                      <div>7.15 %</div>
                    </div>
                    <div
                      className={cn(
                        " grid grid-cols-3 mt-2 items-center p-2  rounded-full",
                        bg_cell_colo
                      )}
                    >
                      <div className="option-name font-bold col-span-1">
                        Usual
                      </div>
                      <div>0</div>
                      <div>27 %</div>
                    </div>
                  </div>
                  {/* Strategy Staking */}
                  <div className="mb-4">
                    <Valuts_RightCard arr={Valuts_Strategy_title} />

                    <div
                      className={cn(
                        " grid grid-cols-3 mt-2 items-center p-2  rounded-full",
                        bg_cell_colo
                      )}
                    >
                      <div className="option-name font-bold">Ether-fi</div>
                      <div>0</div>
                      <div>7.15 %</div>
                    </div>
                  </div>
                  {/* Time Deposit */}
                  <div className="mb-4">
                    <div className="section-header grid grid-cols-4 uppercase text-primary text-xs">
                      <div>Time Deposit</div>
                      <div>Amount</div>
                      <div>Maturity</div>
                      <div>APY</div>
                    </div>

                    <div
                      className={cn(
                        " grid grid-cols-5 mt-2 items-center p-2  rounded-full",
                        bg_cell_colo
                      )}
                    >
                      <div className="option-name font-bold">Usual</div>
                      <div>100</div>
                      <div className="nowrap col-span-2">30 Fed 2025</div>
                      <div>26.7 %</div>
                    </div>
                  </div>
                </div>
              )) || (
                <div ref={rightCardRef}>
                  {/* Flexible Staking */}
                  <div className="mb-4 mt-8">
                    <Valuts_RightCard arr={Valuts_title} />
                    <Accordion type="single" collapsible>
                      {(selectedAsset.name === "ETH" && (
                        <AccordionItem value="item-1">
                          <AccordionTrigger
                            className={cn(
                              "flex-none mt-2 grid grid-cols-6 w-full  py-2 rounded-full",
                              bg_cell_colo
                            )}
                          >
                            <div className="option-name font-bold col-span-1">
                              Lido
                            </div>
                            <div className="col-span-1"></div>

                            <div className="text-left">
                              {FormatNumberWithDecimals(
                                getLidoBalance?.depositedEth,
                                4,
                                6
                              )}
                            </div>
                            <div className="col-auto"></div>

                            <div className="text-left">
                              {getLidoBalance?.apyEth}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-2 grid  gap-2">
                            <Button
                              onClick={() => setLidoDepositModalOpen(true)}
                              disabled={getLidoBalance.balance === 0}
                            >
                              Stake
                            </Button>
                            {/* </div> */}
                          </AccordionContent>
                        </AccordionItem>
                      )) || (
                        <AccordionItem value="item-1">
                          <AccordionTrigger
                            className={cn(
                              "flex-none mt-2 grid grid-cols-6 w-full  py-2 rounded-full",
                              bg_cell_colo
                            )}
                          >
                            <div className="option-name font-bold col-span-1">
                              Drift
                            </div>
                            <div className="col-span-1"></div>

                            <div className="text-left">
                              {FormatNumberWithDecimals(
                                selectedAsset?.deposited,
                                4,
                                6
                              )}
                            </div>
                            <div className="col-auto"></div>

                            <div className="text-left">
                              {selectedAsset?.apy + "%"}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-2 grid grid-cols-2 gap-2">
                            <Button
                              disabled={!ChainType}
                              onClick={() => {
                                console.log("selectedAsset", selectedAsset);
                                switch (selectedAsset.name) {
                                  case "SOL":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftDepositModalOpen(true);
                                    } else {
                                      setEvmDriftModalOpen(true);
                                    }
                                    break;
                                  case "BTC":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftDepositBtcModalOpen(true);
                                    } else {
                                      setEvmDriftBtcModalOpen(true);
                                    }
                                    break;
                                  case "USDC":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftDepositUsdcModalOpen(true);
                                    } else {
                                      setEvmDriftUsdcDepositModalOpen(true);
                                    }
                                    break;
                                  default:
                                    break;
                                }
                              }}
                            >
                              Deposit
                            </Button>
                            <Button
                              onClick={() => {
                                if (!ChainType) return;
                                switch (selectedAsset.name) {
                                  case "SOL":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftWithdrawModalOpen(true);
                                    } else {
                                      setEvmDriftWithdrawModalOpen(true);
                                    }
                                    break;
                                  case "BTC":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftWithdrawBtcModalOpen(true);
                                    } else {
                                      setEvmDriftBtcWithdrawModalOpen(true);
                                    }
                                    break;
                                  case "USDC":
                                    if (ChainType == SupportChain.Solana) {
                                      setSolDriftWithdrawUsdcModalOpen(true);
                                    } else {
                                      setEvmDriftUsdcWithdrawModalOpen(true);
                                    }
                                    break;
                                  default:
                                    break;
                                }
                              }}
                              disabled={
                                (selectedAsset.name === "SOL" &&
                                  Number(driftBalance?.sol) === 0) ||
                                (selectedAsset.name === "BTC" &&
                                  Number(driftBalance?.btc) === 0) ||
                                (selectedAsset.name === "USDC" &&
                                  Number(driftBalance?.usdc) === 0)
                              }
                              variant="secondary"
                            >
                              Withdraw
                            </Button>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Suspense>
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
            evmUsdtBalance={getAAVEBalance.evmUsdt}
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
            evmUsdtBalance={getAAVEBalance.depositedUsdt}
            isDeposit={false}
          />

          {/*drift sol deposit */}
          <EvmDriftModal
            open={evmDriftModalOpen}
            onOpenChange={(open) => {
              setEvmDriftModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={parseFloat(solBalance)}
            isDeposit={true}
          />

          {/*drift sol withdraw */}
          <EvmDriftModal
            open={evmDriftWithdrawModalOpen}
            onOpenChange={(open) => {
              setEvmDriftWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.sol || 0}
            isDeposit={false}
          />

          {/*drift btc deposit */}
          <EvmDriftBtcModal
            deposit_coin="BTC"
            open={evmDriftBtcModalOpen}
            onOpenChange={(open) => {
              setEvmDriftBtcModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={solBtcBalance}
            isDeposit={true}
          />

          {/*drift btc withdraw */}
          <EvmDriftBtcModal
            deposit_coin="BTC"
            open={evmDriftBtcWithdrawModalOpen}
            onOpenChange={(open) => {
              setEvmDriftBtcWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.btc || 0}
            isDeposit={false}
          />

          {/*drift usdc deposit */}
          <EvmDriftBtcModal
            deposit_coin="USDC"
            open={evmDriftUsdcDepositModalOpen}
            onOpenChange={(open) => {
              setEvmDriftUsdcDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={solUsdcBalance}
            isDeposit={true}
          />

          {/*drift usdc withdraw */}
          <EvmDriftBtcModal
            deposit_coin="USDC"
            open={evmDriftUsdcWithdrawModalOpen}
            onOpenChange={(open) => {
              setEvmDriftUsdcWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.usdc || 0}
            isDeposit={false}
          />
        </>
      )}
      {/* solana 存款 */}
      {ChainType == SupportChain.Solana && (
        <>
          <SolDepositModal
            open={depositModalOpen}
            onOpenChange={(open) => {
              setDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getAAVEBalance.evmUsdt}
            isDeposit={true}
          />
          {/* 提现弹框 */}
          <SolDepositModal
            open={withdrawModalOpen}
            onOpenChange={(open) => {
              setWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getAAVEBalance.depositedUsdt}
            isDeposit={false}
          />

          {/* 1. sol drift deposit modal */}
          <SolDriftModal
            marketIndex={market_sol_index}
            open={solDriftDepositModalOpen}
            onOpenChange={(open) => {
              setSolDriftDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={parseFloat(solBalance)}
            isDeposit={true}
            deposit_coin="SOL"
          />
          {/* 2.sol drift withdraw modal */}
          <SolDriftModal
            marketIndex={market_sol_index}
            open={solDriftWithdrawModalOpen}
            onOpenChange={(open) => {
              setSolDriftWithdrawModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.sol || 0}
            isDeposit={false}
            deposit_coin="SOL"
          />
          {/* 3.sol drift usdc deposit modal */}
          <SolDriftModal
            marketIndex={market_usdc_index}
            open={solDriftDepositUsdcModalOpen}
            onOpenChange={(open) => {
              setSolDriftDepositUsdcModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={solUsdcBalance}
            isDeposit={true}
            deposit_coin="USDC"
          />
          {/* 4.sol drift usdc withdraw modal */}
          <SolDriftModal
            marketIndex={market_usdc_index}
            open={solDriftWithdrawUsdcModalOpen}
            onOpenChange={(open) => {
              setSolDriftWithdrawUsdcModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.usdc || 0}
            isDeposit={false}
            deposit_coin="USDC"
          />
          {/* 5.sol drift btc deposit modal */}
          <SolDriftModal
            marketIndex={market_btc_index}
            open={solDriftDepositBtcModalOpen}
            onOpenChange={(open) => {
              setSolDriftDepositBtcModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={solBtcBalance}
            isDeposit={true}
            deposit_coin="BTC"
          />
          {/* 6.sol drift btc withdraw modal */}
          <SolDriftModal
            marketIndex={market_btc_index}
            open={solDriftWithdrawBtcModalOpen}
            onOpenChange={(open) => {
              setSolDriftWithdrawBtcModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={driftBalance?.btc || 0}
            isDeposit={false}
            deposit_coin="BTC"
          />
        </>
      )}

      {/* lido deposit modal */}
      {ChainType == SupportChain.Ethereum ||
        (ChainType == SupportChain.Solana && (
          <LidoDepositModal
            open={lidoDepositModalOpen}
            onOpenChange={(open) => {
              setLidoDepositModalOpen(open);
              if (!open) {
                handleRefresh();
              }
            }}
            evmUsdtBalance={getLidoBalance.balance}
          />
        ))}
    </main>
  );
};

export default VaultsFeature;
