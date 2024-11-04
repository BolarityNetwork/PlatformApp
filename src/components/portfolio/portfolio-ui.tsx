"use client";

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
import {
  AccountBalance,
  ActiveEvmAccountButton,
  ActiveSolanaAccountBtn,
  ReceiveModal,
  SendEthModal,
  SendModal,
  SendSolModal,
} from "@/components/widgets/account-ui";
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
import { ellipsify } from "@/lib/utils";
import { CopyIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import { RefreshCcwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiSolana } from "react-icons/si";
import { FaEthereum } from "react-icons/fa";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAccountBalance } from "@/hooks/useAccount";
import { Skeleton } from "../ui/skeleton";
import { useBolarity } from "@/hooks/useBolarity";
import { CurrencyEnum, SupportChain } from "@/config";
import { useProxyAddress } from "@/hooks/useProxyAddress";
import { useFeedsData } from "@/hooks/useFeedsData";

export const AccountInfo = () => {
  const { isConnected, wallet, updateWalletAddress } = useBolarity();
  const [address, setAddress] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const { fetchProxyAddress, fetchSolanaAddress } = useProxyAddress();
  const [activeSolanaAccount, setActiveSolanaAccount] = useState(false);
  const [activeEvmAccount, setActiveEvmAccount] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setAddress(wallet.address);
      setEvmAddress(wallet.evmAddress);
    } else {
      setAddress("");
      setEvmAddress("");
    }
  }, [isConnected, wallet]);

  const onCopy = async (text: string) => {
    if (!text || !navigator) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy");
    }
  };

  useMemo(() => {
    if (isConnected) {
      if (wallet?.chain === SupportChain.Solana && !wallet.evmAddress) {
        const getProxyAddress = async () => {
          const evmAddress = await fetchProxyAddress(wallet.address);
          if (evmAddress) {
            updateWalletAddress({
              chain: SupportChain.Ethereum,
              address: evmAddress.toString(),
            });
          } else {
            setActiveEvmAccount(true);
          }
        };
        getProxyAddress();
      } else if (wallet?.chain === SupportChain.Ethereum && !wallet.address) {
        const getSolanaAddress = async () => {
          const solanaAddress = await fetchSolanaAddress(wallet.evmAddress);
          if (solanaAddress) {
            updateWalletAddress({
              chain: SupportChain.Solana,
              address: solanaAddress.toString(),
            });
          } else {
            setActiveSolanaAccount(true);
          }
        };
        getSolanaAddress();
      }
    }
  }, [
    isConnected,
    wallet,
    fetchProxyAddress,
    fetchSolanaAddress,
    updateWalletAddress,
  ]);

  const WalletLogo = () => {
    return (
      <div
        className={`rounded-full w-[64px] h-[64px] bg-[#ab9ff2] flex items-center justify-center ${
          !isConnected ? "opacity-60" : ""
        }`}
      >
        <Image
          src={
            wallet?.chain === SupportChain.Ethereum
              ? "/ethereum.svg"
              : "/phantom.svg"
          }
          alt="phantom"
          width={40}
          height={40}
        />
      </div>
    );
  };

  return (
    <div className="h-auto lg:h-16 flex flex-col lg:flex-row items-center gap-y-4 gap-x-4 md:gap-x-6 xl:gap-x-12">
      <div className="flex flex-row gap-x-4 items-center">
        <WalletLogo />
        <div className="flex flex-col items-center lg:items-start gap-y-2">
          <p className="text-sm text-muted-foreground">Total portfolio value</p>
          <AccountBalance />
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Solana address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {address ? ellipsify(address) : "-"}
          </p>
          {address && (
            <CopyIcon
              onClick={() => onCopy(address)}
              className="text-muted-foreground cursor-pointer hover:text-foreground"
            />
          )}
          {/* <DashboardIcon className="text-muted-foreground cursor-pointer hover:text-foreground" /> */}
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Evm address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {evmAddress ? ellipsify(evmAddress) : "-"}
          </p>
          {evmAddress && (
            <CopyIcon
              onClick={() => onCopy(evmAddress)}
              className="text-muted-foreground cursor-pointer hover:text-foreground"
            />
          )}
          {/* <DashboardIcon className="text-muted-foreground cursor-pointer hover:text-foreground" /> */}
        </div>
      </div>

      <div className="flex-1 flex justify-between lg:justify-end gap-x-4">
        {activeEvmAccount && <ActiveEvmAccountButton />}

        {activeSolanaAccount && <ActiveSolanaAccountBtn />}

        {address && <ReceiveModal address={address} />}

        {isConnected && wallet.chain === SupportChain.Solana && (
          <SendSolModal />
        )}
        {isConnected && wallet.chain === SupportChain.Ethereum && (
          <SendEthModal />
        )}
      </div>
    </div>
  );
};

type Asset = {
  icon: string;
  symbol: string;
  price: string;
  change24h: number;
  value: number;
  amount: number;
  network: string;
  networkIcon?: React.ReactNode;
};

const AssetRow = ({
  asset,
  onInternationalize,
  onSend,
  onReceive,
}: {
  asset: Asset;
  onInternationalize: () => void;
  onSend: () => void;
  onReceive: () => void;
}) => {
  return (
    <TableRow>
      <TableCell className="p-3 lg:w-[160px] xl:w-[240px]">
        <div className="flex gap-2 items-center">
          <div className="hidden xl:block p-2 rounded-full bg-secondary">
            <Image src={asset.icon} alt={asset.symbol} width={24} height={24} />
          </div>
          <h4 className="xl:text-lg font-bold uppercase">{asset.symbol}</h4>
        </div>
      </TableCell>
      <TableCell className="p-3">
        <div className="flex gap-2 items-center">
          <span className="xl:text-lg font-bold">{asset.price}</span>{" "}
          {asset.change24h > 0 ? (
            <Badge className="text-xs rounded-md">
              + {asset.change24h.toFixed(2)} %
            </Badge>
          ) : asset.change24h == 0 ? (
            ""
          ) : (
            <Badge variant="destructive" className="text-xs rounded-md">
              {asset.change24h.toFixed(2)} %
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
        $ {asset.value.toFixed(4)}
      </TableCell>
      <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
        {asset.amount.toFixed(4)}
      </TableCell>
      <TableCell className="hidden md:table-cell p-3 lg:w-[100px] xl:w-[160px]">
        <div className="flex gap-2 items-center">
          {asset.networkIcon ? asset.networkIcon : asset.network}
        </div>
      </TableCell>
      <TableCell className="p-3 text-right lg:w-[100px] xl:w-[160px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <DotsHorizontalIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={onInternationalize}
            >
              Internationalize
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={onSend}>
              Send
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={onReceive}>
              Receive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

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
                  {assets[0].symbol == CurrencyEnum.USDC ||
                  assets[0].symbol == CurrencyEnum.USDT
                    ? totalAmount.toFixed(2)
                    : totalAmount.toFixed(4)}
                </span>
                <span className="text-sm text-gray-500">
                  ≈ ${totalValue.toFixed(2)}
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
                    {asset.amount.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ≈ ${asset.value.toFixed(2)}
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
  onInternationalize,
  onSend,
  onReceive,
}: {
  assets: Asset[];
  onInternationalize: (asset: Asset) => void;
  onSend: (asset: Asset) => void;
  onReceive: (asset: Asset) => void;
}) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [networks, setNetworks] = useState<string[]>([]);
  const [networkIcons, setNetworkIcons] = useState<React.ReactNode[]>([]);
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
      setNetworks(_networks);
      setNetworkIcons(_networkIcons);
    } else {
      setAsset(null);
      setNetworks([]);
      setNetworkIcons([]);
    }
  }, [assets]);

  return (
    <>
      {asset && (
        <TableRow>
          <TableCell className="p-3 lg:w-[160px] xl:w-[240px]">
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
          <TableCell className="p-3">
            <div className="flex gap-2 items-center">
              <span className="xl:text-lg font-bold">{asset.price}</span>{" "}
              {asset.change24h > 0 ? (
                <Badge className="text-xs rounded-md">
                  + {asset.change24h.toFixed(2)} %
                </Badge>
              ) : asset.change24h == 0 ? (
                ""
              ) : (
                <Badge variant="destructive" className="text-xs rounded-md">
                  {asset.change24h.toFixed(2)} %
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
            $ {asset.value.toFixed(2)}
          </TableCell>
          <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
            {asset.amount.toFixed(2)}
          </TableCell>
          <TableCell
            className="cursor-pointer hidden md:table-cell p-3 lg:w-[100px] xl:w-[160px]"
            onClick={() => setOpenAssetsModal(true)}
          >
            <div className="flex gap-2 items-center">
              {networkIcons.map((networkIcon, index) => (
                <div key={`network-icon-${index}`}>{networkIcon}</div>
              ))}
            </div>
          </TableCell>
          <TableCell className="p-3 text-right lg:w-[100px] xl:w-[160px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <DotsHorizontalIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onInternationalize(asset)}
                >
                  Internationalize
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onSend(asset)}
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
  const { isConnected, wallet } = useBolarity();
  const [solAddress, setSolAddress] = useState<string>();
  const [evmAddress, setEvmAddress] = useState<string>();
  const [solList, setSolList] = useState<Asset[]>([]);
  const [ethList, setEthList] = useState<Asset[]>([]);
  const [usdtList, setUsdtList] = useState<Asset[]>([]);
  const [usdcList, setUsdcList] = useState<Asset[]>([]);
  const [openReceiveModal, setOpenReceiveModal] = useState({
    open: false,
    address: "",
  });
  const [openSendModal, setOpenSendModal] = useState({
    open: false,
    currency: CurrencyEnum.SOLANA,
  });

  const [openInternationalizeSolModal, setOpenInternationalizeSolModal] =
    useState(false);

  const {
    accountBalance,
    refetch: fetchBalance,
    isLoading,
  } = useAccountBalance({
    solAddress,
    evmAddress,
  });
  const { feedsData } = useFeedsData();

  useMemo(() => {
    if (isConnected) {
      const { address, evmAddress } = wallet;
      if (address) {
        setSolAddress(address);
      }
      if (evmAddress) {
        setEvmAddress(evmAddress);
      }
    } else {
      setSolAddress(undefined);
      setEvmAddress(undefined);
      setSolList([]);
      setEthList([]);
      setUsdtList([]);
      setUsdcList([]);
    }
  }, [isConnected, wallet]);

  useMemo(() => {
    if (!wallet || !feedsData || !accountBalance) {
      return;
    }

    const {
      solBalance,
      solEthBalance,
      solUsdtBalance,
      solUsdcBalance,
      ethBalance,
      ethSolBalance,
      ethUsdtBalance,
      ethUsdcBalance,
    } = accountBalance;

    const _solList: Asset[] = [];
    const _ethList: Asset[] = [];
    const _usdtList: Asset[] = [];
    const _usdcList: Asset[] = [];

    let needSolBalance = false;
    if (wallet.chain === SupportChain.Solana) {
      needSolBalance = true;
    } else if (wallet.address) {
      needSolBalance = true;
    }

    if (needSolBalance) {
      _solList.push({
        icon: "/solana.svg",
        symbol: CurrencyEnum.SOLANA,
        price: feedsData.sol.formattedPrice,
        change24h: feedsData.sol.change24h,
        value: solBalance * feedsData.sol.price,
        amount: solBalance,
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    if (solEthBalance > 0) {
      _ethList.push({
        icon: "/ethereum.svg",
        symbol: CurrencyEnum.ETHEREUM,
        price: feedsData.eth.formattedPrice,
        change24h: feedsData.eth.change24h,
        value: solEthBalance * feedsData.eth.price,
        amount: solEthBalance,
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    if (solUsdtBalance > 0) {
      _usdtList.push({
        icon: "/tether.png",
        symbol: CurrencyEnum.USDT,
        price: feedsData.usdt.formattedPrice,
        change24h: 0,
        value: solUsdtBalance * feedsData.usdt.price,
        amount: solUsdtBalance,
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    if (solUsdcBalance > 0) {
      _usdcList.push({
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: solUsdcBalance * feedsData.usdc.price,
        amount: solUsdcBalance,
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    // Eth Balance
    let needEthBalance = false;
    if (wallet.chain === SupportChain.Ethereum) {
      needEthBalance = true;
    } else if (wallet.evmAddress) {
      needEthBalance = true;
    }

    if (needEthBalance) {
      _ethList.push({
        icon: "/ethereum.svg",
        symbol: CurrencyEnum.ETHEREUM,
        price: feedsData.eth.formattedPrice,
        change24h: feedsData.eth.change24h,
        value: ethBalance * feedsData.eth.price,
        amount: ethBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    if (ethSolBalance > 0) {
      _solList.push({
        icon: "/solana.svg",
        symbol: CurrencyEnum.SOLANA,
        price: feedsData.sol.formattedPrice,
        change24h: feedsData.sol.change24h,
        value: ethSolBalance * feedsData.sol.price,
        amount: ethSolBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    if (ethUsdtBalance > 0) {
      _usdtList.push({
        icon: "/tether.png",
        symbol: CurrencyEnum.USDT,
        price: feedsData.usdt.formattedPrice,
        change24h: 0,
        value: ethUsdtBalance * feedsData.usdt.price,
        amount: ethUsdtBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    if (ethUsdcBalance > 0) {
      _usdcList.push({
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: ethUsdcBalance * feedsData.usdc.price,
        amount: ethUsdcBalance,
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    setSolList(_solList);
    setEthList(_ethList);
    setUsdtList(_usdtList);
    setUsdcList(_usdcList);
  }, [wallet, accountBalance, feedsData]);

  const onReceiveModal = useMemo(() => {
    return (asset: Asset) => {
      const address = asset.network === "Solana" ? solAddress : evmAddress;
      setOpenReceiveModal({
        open: true,
        address: address || "",
      });
    };
  }, [solAddress, evmAddress]);

  const handleCloseReceiveModal = (open: boolean) => {
    if (!open) {
      setOpenReceiveModal({
        open: false,
        address: "",
      });
    }
  };

  const onSendModal = (currency: CurrencyEnum = CurrencyEnum.SOLANA) => {
    setOpenSendModal({
      open: true,
      currency
    });
  };
  const handleCloseSendModal = (open: boolean) => {
    if (!open) {
      setOpenSendModal({
        open: false,
        currency: CurrencyEnum.SOLANA
      });
    }
  };

  const onInternationalizeModal = useMemo(() => {
    return (asset: Asset) => {
      if (asset.network === "Solana") {
        if (asset.symbol === "SOL") {
          setOpenInternationalizeSolModal(true);
        }
      }
    };
  }, []);

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-lg md:text-2xl xl:text-4xl font-bold">Assets</h2>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={async () => {
            await fetchBalance();
          }}
        >
          <RefreshCcwIcon className="h-5 w-5 text-primary" />
        </Button>
      </div>
      <Table className="mt-0 md:mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="p-3">Name</TableHead>
            <TableHead className="p-3">Price/24h change</TableHead>
            <TableHead className="p-3">Value</TableHead>
            <TableHead className="p-3">Amount</TableHead>
            <TableHead className="hidden md:table-cell p-3">Network</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              <TableRow>
                <TableCell className="px-0 py-2" colSpan={6}>
                  <Skeleton className="h-12" />
                </TableCell>
              </TableRow>
            </>
          ) : (
            <>
              {/* SOL Balance */}
              <MuitlAssetRow
                assets={solList}
                onInternationalize={() => {
                  onInternationalizeModal(solList[0]);
                }}
                onSend={() => onSendModal(CurrencyEnum.SOLANA)}
                onReceive={() => {
                  onReceiveModal(solList[0]);
                }}
              />
              {/* ETH Balance */}
              <MuitlAssetRow
                assets={ethList}
                onInternationalize={() => {
                  onInternationalizeModal(ethList[0]);
                }}
                onSend={() => onSendModal(CurrencyEnum.ETHEREUM)}
                onReceive={() => {
                  onReceiveModal(ethList[0]);
                }}
              />
              {/* USDT Balance */}
              <MuitlAssetRow
                assets={usdtList}
                onInternationalize={() => {
                  onInternationalizeModal(usdtList[0]);
                }}
                onSend={() => onSendModal(CurrencyEnum.USDT)}
                onReceive={() => {
                  onReceiveModal(usdtList[0]);
                }}
              />
              {/* USDC Balance */}
              <MuitlAssetRow
                assets={usdcList}
                onInternationalize={() => {
                  onInternationalizeModal(usdtList[0]);
                }}
                onSend={() => onSendModal(CurrencyEnum.USDC)}
                onReceive={() => {
                  onReceiveModal(usdtList[0]);
                }}
              />
            </>
          )}
        </TableBody>
      </Table>
      {openReceiveModal.open && (
        <ReceiveModal
          open={true}
          address={openReceiveModal.address}
          onOpenChange={handleCloseReceiveModal}
          withButton={false}
        />
      )}
      {openSendModal.open && (
        <SendModal
          open={true}
          currency={openSendModal.currency}
          onOpenChange={handleCloseSendModal}
          withButton={false}
        />
      )}
    </>
  );
};
