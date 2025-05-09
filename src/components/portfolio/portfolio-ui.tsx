"use client";
import React from "react";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import { QrCodeModal } from "@/components/widgets/account-ui/index";

import {
  DialogHeader,
  DialogContent,
  DialogTitle,
  Dialog,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { RefreshCcwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SiSolana } from "react-icons/si";
import { FaEthereum } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetBalance } from "@/hooks/useAccount";
import { Skeleton } from "@/components/ui/skeleton";

import { CurrencyEnum, SupportChain } from "@/config";
import { useFeedsData } from "@/hooks/useFeedsData";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

import { cn, FormatNumberWithDecimals } from "@/lib/utils";

import { Asset, TableHeaderArr } from "./portfolio-data";
import { useWidgetsProvider } from "@/providers/widgets-provider";

import { useSolanaAccountBalance } from "@/providers/useSolanaAccountBalance";

const AssetsModal = ({
  open = false,
  onOpenChange,
  assets,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  assets: Asset[];
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [totalValue, setTotalValue] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (assets.length > 0) {
      let _totalValue = 0;
      let _totalAmount = 0;
      assets.forEach((asset) => {
        _totalValue += asset.value;
        _totalAmount += asset.amount;
      });
      setTotalValue(_totalValue);
      setTotalAmount(_totalAmount);
    } else {
      setTotalValue(0);
      setTotalAmount(0);
    }
  }, [assets]);

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Total</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div className="flex flex-col py-2 gap-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-x-4">
              <div className="pr-4">
                <Image
                  src={assets[0].icon}
                  alt={assets[0].symbol}
                  width={48}
                  height={48}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">
                  {totalAmount > 0 ? totalAmount.toFixed(4) : "0.00"}
                </span>
                <span className="text-sm text-gray-500">
                  ≈ ${totalValue > 0 ? totalValue.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end">
              {assets.map((asset) => (
                <div
                  key={`asset-icon-${asset.network}-${asset.symbol}`}
                  className="rounded-full p-2 bg-secondary ml-[-10px]"
                >
                  {asset.networkIcon ? asset.networkIcon : asset.network}
                </div>
              ))}
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col gap-y-4">
            {assets.map((asset) => (
              <div
                key={`asset-${asset.network}-${asset.symbol}`}
                className="flex items-center justify-between gap-x-2"
              >
                <div className="relative pr-6">
                  <div className="p-2 rounded-full bg-secondary">
                    <Image
                      src={asset.icon}
                      alt={asset.symbol}
                      width={28}
                      height={28}
                    />
                  </div>
                  <div className="absolute bottom-[-5px] right-[10px] p-[4px] overflow-hidden rounded-full bg-secondary">
                    {asset.networkIcon
                      ? asset.networkIcon
                      : asset.network.slice(0, 1)}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-xl font-semibold uppercase">
                    {asset.symbol}
                  </span>
                  <span className="text-sm text-gray-500">{asset.network}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-semibold">
                    {asset.amount > 0 ? asset.amount.toFixed(4) : "0.00"}
                  </span>
                  <span className="text-sm text-gray-500">
                    ≈ ${asset.value > 0 ? asset.value.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MuitlAssetRow = ({
  assets,
  onSend,
  onReceive,
}: {
  assets: Asset[];

  onSend: () => void;
  onReceive: (asset: Asset) => void;
}) => {
  // const [asset, setAsset] = useState<Asset | null>(null);
  const [asset, setAsset] = useState(null as Asset | null);
  // const [networks, setNetworks] = useState<string[]>([]);
  const [networkIcons, setNetworkIcons] = useState([]);
  const [openAssetsModal, setOpenAssetsModal] = useState(false);

  useEffect(() => {
    if (assets.length > 0) {
      const _asset: Asset = {
        icon: assets[0].icon,
        symbol: assets[0].symbol,
        price: assets[0].price,
        change24h: assets[0].change24h,
        value: 0,
        amount: 0,
        network: assets[0].network,
        networkIcon: assets[0].networkIcon,
      };
      const _networks: string[] = [];
      const _networkIcons: React.ReactNode[] = [];
      assets.forEach((asset) => {
        _asset.value += asset.value;
        _asset.amount += asset.amount;
        _networks.push(asset.network);
        _networkIcons.push(asset.networkIcon);
      });

      setAsset(_asset);
      // setNetworks(_networks);
      setNetworkIcons(_networkIcons);
    }
  }, [assets]);
  return (
    <>
      {asset && (
        <TableRow>
          <TableCell className="p-3 w-[100px] lg:w-[160px] xl:w-[240px]">
            <div className="flex gap-2 items-center">
              <div className="hidden xl:block p-2 rounded-full bg-secondary">
                <Image
                  src={asset.icon}
                  alt={asset.symbol}
                  width={24}
                  height={24}
                />
              </div>
              <h4 className="xl:text-lg font-bold uppercase">{asset.symbol}</h4>
            </div>
          </TableCell>
          <TableCell className="p-3 w-[160px]">
            <div className="flex gap-2 items-center">
              <span className="xl:text-lg font-bold">{asset.price}</span>{" "}
              {asset.change24h > 0 ? (
                <Badge className="hidden lg:block text-xs rounded-md">
                  + {asset.change24h.toFixed(2)} %
                </Badge>
              ) : asset.change24h == 0 ? (
                ""
              ) : (
                <Badge
                  variant="destructive"
                  className="hidden lg:block text-xs rounded-md"
                >
                  {asset.change24h.toFixed(2)} %
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="p-3 font-bold w-[100px] xl:w-[160px]">
            $ {asset.value > 0 ? asset.value.toFixed(2) : "0.00"}
          </TableCell>
          <TableCell className="p-3 font-bold w-[100px] xl:w-[160px]">
            {/* {asset.amount > 0 ? asset.amount.toFixed(4) : "0.00"} */}
            {asset.amount > 0
              ? FormatNumberWithDecimals(asset.amount, 4, 6)
              : "0.00"}
          </TableCell>
          <TableCell
            className="cursor-pointer p-3 w-[100px] xl:w-[160px]"
            onClick={() => setOpenAssetsModal(true)}
          >
            <div className="flex gap-2 items-center">
              {networkIcons.map((networkIcon, index) => (
                <div key={`network-icon-${index}`}>{networkIcon}</div>
              ))}
            </div>
          </TableCell>
          <TableCell className="p-3 text-right w-[100px] xl:w-[160px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <DotsHorizontalIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onSend()}
                >
                  Send
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onReceive(asset)}
                >
                  Receive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      )}
      {assets.length > 0 && openAssetsModal && (
        <AssetsModal
          assets={assets}
          open={openAssetsModal}
          onOpenChange={setOpenAssetsModal}
        />
      )}
    </>
  );
};

export const AssetsTable = () => {
  const { ChainType, solAddress, evmAddress } = useBolarityWalletProvider();

  const [solList, setSolList] = useState([] as Asset[]);
  const [ethList, setEthList] = useState([] as Asset[]);
  const [usdtList, setUsdtList] = useState([] as Asset[]);

  const {
    isLoading,
    data: accountBalance,
    refetch: fetchBalance,
  } = useGetBalance();
  const { solBalance, solBolBalance, solUsdcBalance } =
    useSolanaAccountBalance();
  const { feedsData } = useFeedsData();
  const usdc_arr = useMemo(() => {
    if (!ChainType || !feedsData || !accountBalance) return [];
    const { ethUsdcBalance }: any = accountBalance;
    let usdcListArr = [];
    if (solUsdcBalance > 0) {
      const solUsdcArr = {
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: solUsdcBalance * feedsData.usdc.price,
        amount: solUsdcBalance,
        network: "Solana",
        networkIcon: <SiSolana size={24} />,
      };

      usdcListArr.push(solUsdcArr);
    }
    if (ethUsdcBalance > 0) {
      let ethUsdcArr = {
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: ethUsdcBalance * feedsData.usdc.price,
        amount: ethUsdcBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum size={24} />,
      };
      usdcListArr.push(ethUsdcArr);
    }

    return usdcListArr;
  }, [accountBalance, feedsData, ChainType, solUsdcBalance]);
  const sol_bolarity_coin = useMemo(() => {
    if (!ChainType || !feedsData) return [];

    let bolList = [];

    if (solBolBalance) {
      const solBolArr = {
        icon: "/walletNo.svg",
        symbol: CurrencyEnum.BOLARITY,
        price: "$ 1.00",
        change24h: 0,
        value: solBolBalance * 1,
        amount: solBolBalance,
        network: "Solana",
        networkIcon: <SiSolana size={24} />,
      };
      bolList.push(solBolArr);
    }

    return bolList;
  }, [solBolBalance, feedsData, ChainType]);

  useEffect(() => {
    if (!ChainType) {
      setSolList([]);
      setEthList([]);
      setUsdtList([]);

      return;
    }
    if (!feedsData || !accountBalance) {
      return;
    }

    const { ethBalance, ethSolBalance, ethUsdtBalance }: any = accountBalance;
    console.log("solUsdcBalance----", feedsData.usdc);
    console.log("solBalance", accountBalance);

    if (ChainType === SupportChain.Solana || solAddress) {
      setSolList([
        {
          icon: "/solana.svg",
          symbol: CurrencyEnum.SOLANA,
          price: feedsData.sol.formattedPrice,
          change24h: feedsData.sol.change24h,
          value: solBalance * feedsData.sol.price,
          amount: solBalance,
          network: "Solana",
          networkIcon: <SiSolana size={24} />,
        },
      ]);
    }

    if (ethSolBalance > 0) {
      const ethSolArr = {
        icon: "/solana.svg",
        symbol: CurrencyEnum.SOLANA,
        price: feedsData.sol.formattedPrice,
        change24h: feedsData.sol.change24h,
        value: ethSolBalance * feedsData.sol.price,
        amount: ethSolBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum size={24} />,
      };

      if (ChainType === SupportChain.Solana || solAddress) {
        setSolList((prevList: any) => [...prevList, ethSolArr]);
      } else {
        setSolList([ethSolArr]);
      }
    }

    if (ChainType === SupportChain.Ethereum || evmAddress) {
      setEthList([
        {
          icon: "/ethereum.svg",
          symbol: CurrencyEnum.ETHEREUM,
          price: feedsData.eth.formattedPrice,
          change24h: feedsData.eth.change24h,
          value: ethBalance * feedsData.eth.price,
          amount: ethBalance,
          network: "Ethereum",
          networkIcon: <FaEthereum size={24} />,
        },
      ]);
    }

    if (ethUsdtBalance > 0) {
      console.log("ethUsdtBalance---进来了-----", ethUsdtBalance);
      setUsdtList([
        {
          icon: "/tether.png",
          symbol: CurrencyEnum.USDT,
          price: feedsData.usdt.formattedPrice,
          change24h: 0,
          value: ethUsdtBalance * feedsData.usdt.price,
          amount: ethUsdtBalance,
          network: "Ethereum",
          networkIcon: <FaEthereum size={24} />,
        },
      ]);
    }
  }, [accountBalance, feedsData, ChainType, solBalance]);

  const { setIsOpen, setInitFromChain } = useWidgetsProvider();

  const [isReceive, setIsReceive] = useState(false);
  // const [isReceiveAddress, setIsReceiveAddress] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate refreshing NFT data
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API call with timeout
    setTimeout(() => {
      // In a real app, you would fetch new data here
      fetchBalance();
      setIsRefreshing(false);
    }, 2000);
  };
  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-lg md:text-2xl xl:text-4xl font-bold">Assets</h2>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh NFT collection"
        >
          <RefreshCcwIcon
            className={`h-5 w-5 ${
              isRefreshing ? "animate-spin text-gray-400" : "text-primary"
            }`}
          />
        </Button>
      </div>

      <Table className="mt-0 md:mt-4">
        <TableHeader>
          <TableRow>
            {TableHeaderArr.map((item, index) => (
              <TableHead
                key={index}
                className={cn(
                  "p-3",
                  item == "Network" && "hidden md:table-cell"
                )}
              >
                {item}
              </TableHead>
            ))}
            {/* <TableHead className="p-3"></TableHead> */}
          </TableRow>
        </TableHeader>
        {ChainType && (
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="px-0 py-2" colSpan={6}>
                  <Skeleton className="h-12" />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* SOL Balance */}
                <MuitlAssetRow
                  assets={solList}
                  onSend={() => {
                    if (solAddress && evmAddress) {
                      setIsOpen(true);
                      setInitFromChain(CurrencyEnum.SOLANA);
                    } else {
                      toast.error("Please Activate Proxy Address");
                    }
                  }}
                  onReceive={() => {
                    console.log("onReceive");
                    setIsReceive(true);
                    // setIsReceiveAddress(solAddress);
                  }}
                />
                {/* ETH Balance */}
                <MuitlAssetRow
                  assets={ethList}
                  onSend={() => {
                    console.log("onSend000000");
                    if (solAddress && evmAddress) {
                      setIsOpen(true);
                      setInitFromChain(CurrencyEnum.ETHEREUM);
                    } else {
                      toast.error("Please Activate Proxy Address");
                    }
                  }}
                  onReceive={() => {
                    console.log("onReceive");
                    setIsReceive(true);
                    // setIsReceiveAddress(evmAddress);
                  }}
                />
                {/* USDT Balance */}
                <MuitlAssetRow
                  assets={usdtList}
                  onSend={() => {
                    if (solAddress && evmAddress) {
                      setIsOpen(true);
                      setInitFromChain(CurrencyEnum.USDT);
                    } else {
                      toast.error("Please Activate Proxy Address");
                    }
                  }}
                  onReceive={() => setIsReceive(true)}
                />
                {/* USDC Balance */}
                <MuitlAssetRow
                  assets={usdc_arr}
                  onSend={() => {
                    if (solAddress && evmAddress) {
                      setIsOpen(true);
                      setInitFromChain(CurrencyEnum.USDC);
                    } else {
                      toast.error("Please Activate Proxy Address");
                    }
                  }}
                  onReceive={() => setIsReceive(true)}
                />
                {/* BOLARITY Balance */}
                <MuitlAssetRow
                  assets={sol_bolarity_coin}
                  onSend={() => {
                    if (solAddress && evmAddress) {
                      setIsOpen(true);
                      setInitFromChain(CurrencyEnum.BOLARITY);
                    } else {
                      toast.error("Please Activate Proxy Address");
                    }
                  }}
                  onReceive={() => setIsReceive(true)}
                />
              </>
            )}
          </TableBody>
        )}
      </Table>

      {ChainType && (
        <QrCodeModal
          open={isReceive}
          onOpenChange={(open) => {
            setIsReceive(open);
          }}
          address={evmAddress}
          solAddress={solAddress}
        />
      )}
    </>
  );
};
