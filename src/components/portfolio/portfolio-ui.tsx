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
  SendEthTokenModal,
  SendSolanaTokenModal,
  SendSolModal,
} from "@/components/widgets/account-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ellipsify } from "@/lib/utils";
import { CopyIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import { RefreshCcwIcon } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
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
      // if (wallet.chain === SupportChain.Solana) {
      //   setAddress(wallet.address);
      // } else if (wallet.chain === SupportChain.Ethereum) {
      //   setAddress(wallet.evmAddress);
      // }
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
  value: string;
  amount: string;
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
        {asset.value}
      </TableCell>
      <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
        {asset.amount}
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

export const AssetsTable = () => {
  const { isConnected, wallet } = useBolarity();
  const [solPublicKey, setSolPublicKey] = useState<PublicKey>();
  const [evmAddress, setEvmAddress] = useState<string>();
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [openReceiveModal, setOpenReceiveModal] = useState({
    open: false,
    address: "",
  });
  const [openSendSolModal, setOpenSendSolModal] = useState(false);
  const [openSendSolTokenModal, setOpenSendSolTokenModal] = useState({
    open: false,
    tokenSymbol: "",
  });
  const [openSendEthModal, setOpenSendEthModal] = useState(false);
  const [openSendEthTokenModal, setOpenSendEthTokenModal] = useState({
    open: false,
    tokenSymbol: "",
  });
  const [openInternationalizeSolModal, setOpenInternationalizeSolModal] =
    useState(false);

  const {
    accountBalance,
    refetch: fetchBalance,
    isLoading,
  } = useAccountBalance({
    solPublicKey,
    evmAddress,
  });
  const { feedsData } = useFeedsData();

  useEffect(() => {
    if (isConnected) {
      const { address, evmAddress } = wallet;
      if (address) {
        setSolPublicKey(new PublicKey(address));
      }
      if (evmAddress) {
        setEvmAddress(evmAddress);
      }
    } else {
      setSolPublicKey(undefined);
      setEvmAddress(undefined);
      setAssetsList([]);
    }
  }, [isConnected, wallet]);

  useMemo(() => {
    if (!isConnected) {
      setAssetsList([]);
      return;
    }

    console.log("Assets Table", accountBalance);

    const {
      solBalance,
      solUsdtBalance,
      solUsdcBalance,
      ethBalance,
      ethUsdtBalance,
      ethUsdcBalance,
    } = accountBalance;

    const _assetsList: Asset[] = [];

    let needSolBalance = false;
    if (wallet.chain === SupportChain.Solana) {
      needSolBalance = true;
    } else if (wallet.address) {
      needSolBalance = true;
    }

    if (needSolBalance) {
      _assetsList.push({
        icon: "/solana.svg",
        symbol: CurrencyEnum.SOLANA,
        price: feedsData.sol.formattedPrice,
        change24h: feedsData.sol.change24h,
        value: "$ " + (solBalance * feedsData.sol.price).toFixed(4),
        amount: solBalance.toFixed(4),
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    if (solUsdtBalance > 0) {
      _assetsList.push({
        icon: "/tether.png",
        symbol: CurrencyEnum.USDT,
        price: feedsData.usdt.formattedPrice,
        change24h: 0,
        value: "$ " + (solUsdtBalance * feedsData.usdt.price).toFixed(2),
        amount: solUsdtBalance.toFixed(4),
        network: "Solana",
        networkIcon: <SiSolana className="h-5 w-5" />,
      });
    }

    if (solUsdcBalance > 0) {
      _assetsList.push({
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: "$ " + (solUsdcBalance * feedsData.usdc.price).toFixed(2),
        amount: solUsdcBalance.toFixed(2),
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
      _assetsList.push({
        icon: "/ethereum.svg",
        symbol: CurrencyEnum.ETHEREUM,
        price: feedsData.eth.formattedPrice,
        change24h: feedsData.eth.change24h,
        value: "$ " + (ethBalance * feedsData.eth.price).toFixed(4),
        amount: ethBalance.toFixed(2),
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    if (ethUsdtBalance > 0) {
      _assetsList.push({
        icon: "/tether.png",
        symbol: CurrencyEnum.USDT,
        price: feedsData.usdt.formattedPrice,
        change24h: 0,
        value: "$ " + (ethUsdtBalance * feedsData.usdt.price).toFixed(2),
        amount: ethUsdtBalance.toFixed(2),
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    if (ethUsdcBalance > 0) {
      _assetsList.push({
        icon: "/usdc.png",
        symbol: CurrencyEnum.USDC,
        price: feedsData.usdc.formattedPrice,
        change24h: 0,
        value: "$ " + (ethUsdcBalance * feedsData.usdc.price).toFixed(2),
        amount: ethUsdcBalance.toFixed(2),
        network: "Ethereum",
        networkIcon: <FaEthereum className="h-5 w-5" />,
      });
    }

    // console.log("assetsList: ", _assetsList);

    setAssetsList(_assetsList);
  }, [isConnected, wallet, accountBalance, feedsData]);

  const onReceiveModal = useMemo(() => {
    return (asset: Asset) => {
      console.log(
        "onReceiveModal",
        asset,
        solPublicKey?.toString(),
        evmAddress
      );
      const address =
        asset.network === "Solana" ? solPublicKey?.toString() : evmAddress;
      setOpenReceiveModal({
        open: true,
        address: address || "",
      });
    };
  }, [solPublicKey, evmAddress]);

  const handleCloseReceiveModal = (open: boolean) => {
    if (!open) {
      setOpenReceiveModal({
        open: false,
        address: "",
      });
    }
  };

  const onSendModal = useMemo(() => {
    return (asset: Asset) => {
      if (wallet) {
        switch (wallet.chain) {
          case SupportChain.Ethereum:
            if (
              asset.symbol === CurrencyEnum.ETHEREUM ||
              asset.symbol === CurrencyEnum.SOLANA
            ) {
              setOpenSendEthModal(true);
            } else {
              setOpenSendEthTokenModal({
                open: true,
                tokenSymbol: asset.symbol,
              });
            }
            break;
          case SupportChain.Solana:
            if (
              asset.symbol === CurrencyEnum.SOLANA ||
              asset.symbol === CurrencyEnum.ETHEREUM
            ) {
              setOpenSendSolModal(true);
            } else {
              setOpenSendSolTokenModal({
                open: true,
                tokenSymbol: asset.symbol,
              });
            }
            break;
        }
      }
    };
  }, [wallet]);
  const handleCloseSendSolModal = (open: boolean) => {
    if (!open) {
      setOpenSendSolModal(false);
    }
  };
  const handleCloseSendSolTokenModal = (open: boolean) => {
    if (!open) {
      setOpenSendSolTokenModal({
        open: false,
        tokenSymbol: "",
      });
    }
  };
  const handleCloseSendEthModal = (open: boolean) => {
    if (!open) {
      setOpenSendEthModal(false);
    }
  };
  const handleCloseSendEthTokenModal = (open: boolean) => {
    if (!open) {
      setOpenSendEthTokenModal({
        open: false,
        tokenSymbol: "",
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
          {isLoading || assetsList.length === 0 ? (
            <>
              <TableRow>
                <TableCell className="px-0 py-2" colSpan={6}>
                  <Skeleton className="h-12" />
                </TableCell>
              </TableRow>
            </>
          ) : (
            <>
              {assetsList.map((asset) => (
                <AssetRow
                  key={`${asset.network}-${asset.symbol}`}
                  asset={asset}
                  onInternationalize={() => {
                    onInternationalizeModal(asset);
                  }}
                  onSend={() => {
                    onSendModal(asset);
                  }}
                  onReceive={() => {
                    onReceiveModal(asset);
                  }}
                />
              ))}
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
      {openSendSolModal && (
        <SendSolModal
          open={openSendSolModal}
          onOpenChange={handleCloseSendSolModal}
          withButton={false}
        />
      )}
      {openSendSolTokenModal.open && (
        <SendSolanaTokenModal
          tokenSymbol={openSendSolTokenModal.tokenSymbol}
          open={true}
          withButton={false}
          onOpenChange={handleCloseSendSolTokenModal}
        />
      )}
      {openSendEthModal && (
        <SendEthModal
          open={openSendEthModal}
          onOpenChange={handleCloseSendEthModal}
          withButton={false}
        />
      )}
      {openSendEthTokenModal.open && (
        <SendEthTokenModal
          tokenSymbol={openSendEthTokenModal.tokenSymbol}
          open={true}
          withButton={false}
          onOpenChange={handleCloseSendEthTokenModal}
        />
      )}
    </>
  );
};
