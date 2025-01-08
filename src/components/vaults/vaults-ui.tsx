"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaEthereum } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Label } from "@radix-ui/react-label";
import { LoaderCircle, RefreshCcwIcon } from "lucide-react";


import {
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  parseUnits,
  toBytes,
  toHex,
  bytesToHex,
  formatUnits,
} from "viem";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getExplorerLink,
  getProvider,
  handleTransactionSuccess,
  hexStringToUint8Array,
  wait,
  writeBigUint64LE,
} from "@/lib/utils";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { CONTRACTS } from "@certusone/wormhole-sdk";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { toast } from "sonner";
import { publicClient } from "@/config/wagmi";
import { useQuery } from "@tanstack/react-query";

import { useGetBalance } from '@/hooks/useAccount'
import { aaveABI } from "@/abis/AAveABI";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

const usdtContractAddress = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
const aaveContractAddress = "0x6ae43d3271ff6888e7fc43fd7321a503ff738951";

async function checkAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amountInWei: bigint
) {
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "allowance",
    args: [owner, spender],
  });

  if (allowance) {
    return amountInWei <= allowance;
  }
  return false;
}

export const DepositModal = ({
  open = false,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean, status?: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);


  const { evmAddress, solAddress } = useBolarityWalletProvider()

  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();


  const onChange = (open: boolean, status?: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open, status);
  };

  const onSendTransaction = async (
    solanaPublicKey: PublicKey,
    txPayload: any
  ) => {
    const provider = getProvider(
      {
        signTransaction,
        signAllTransactions,
        publicKey: solanaPublicKey,
      },
      connection
    );
    const program = new anchor.Program(IDL!, provider);

    const NETWORK = "TESTNET";
    const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
    const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
    const HELLO_WORLD_PID = program.programId;
    console.log("CORE_BRIDGE_PID:", CORE_BRIDGE_PID.toString());
    console.log("HELLO_WORLD_PID:", HELLO_WORLD_PID.toString());

    const realConfig = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);
    console.log("realConfig:", realConfig.toString());

    const message2 = await getProgramSequenceTracker(
      connection,
      program.programId,
      CORE_BRIDGE_PID
    )
      .then((tracker) =>
        deriveAddress(
          [
            Buffer.from("sent"),
            (() => {
              // const buf = Buffer.alloc(8);
              // buf.writeBigUInt64LE(tracker.sequence + BigInt(1));
              // return buf;
              return writeBigUint64LE(tracker.sequence + BigInt(1));
            })(),
          ],
          HELLO_WORLD_PID
        )
      )
      .catch((err) => {
        toast.error("Failed to get program sequence tracker");
        console.log("err:", err);
      });

    if (!message2) {
      return;
    }

    const wormholeAccounts2 = getPostMessageCpiAccounts(
      program.programId,
      CORE_BRIDGE_PID,
      solanaPublicKey,
      message2
    );
    console.log("wormholeAccounts2:", wormholeAccounts2);

    const message = hexStringToUint8Array(txPayload);
    try {
      const params = {
        config: realConfig,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts2,
      };
      const ix1 = program.methods.sendMessage(Buffer.from(message));
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = solanaPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx3, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      // Send transaction and await for signature
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      return signature;
      // appreove usdt success.
    } catch (error: any) {
      return error;
    }
  };

  const onApprove = async (solanaPublicKey: PublicKey) => {
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(usdtContractAddress)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    let ABI = ["function approve(address to, uint256 tokenId)"];
    // 解析 ABI
    const iface = parseAbi(ABI);
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "approve",
      args: [
        aaveContractAddress,
        BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ),
      ],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    // 6. Encode the final payload
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );

    return onSendTransaction(solanaPublicKey, txPayload);
  };

  const handleSubmit = async () => {

    if (!amount) return;

    setIsLoading(true);
    setIsSendDisabled(true);
    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const amountInWei = parseUnits(amount.toString(), 6); // Convert USDT to wei

    // 判断是否需要授权
    const isApproved = await checkAllowance(
      usdtContractAddress,
      evmAddress as `0x${string}`,
      aaveContractAddress,
      amountInWei
    );
    if (!isApproved) {
      await onApprove(solanaPublicKey);
      // 等待2s
      await wait(2000);
    }

    const proxyAddress = evmAddress;
    const contractAddressPadded = pad(toHex(toBytes(aaveContractAddress)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    const ABI = [
      "function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)",
    ];
    // 解析 ABI
    const iface = parseAbi(ABI);
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "supply",
      args: [usdtContractAddress, amountInWei, proxyAddress, 0],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );
    const signature = await onSendTransaction(solanaPublicKey, txPayload);
    if (signature) {
      setTimeout(() => {
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet")
        );
        // 关闭状态
        setIsSendDisabled(false);
        setIsLoading(false);
        // 关闭对话框
        onChange(false, true);
      }, 3000);
    } else {
      toast.error("Transaction Failed.");

      // 关闭状态
      setIsSendDisabled(false);
      setIsLoading(false);
      // 关闭对话框
      onChange(false, true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit</DialogTitle>
          <DialogDescription>Deposit usdt</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <div>
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                handleSubmit();
              }}
              disabled={isSendDisabled}
            >
              {isLoading && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Deposit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const WithdrawModal = ({
  open = false,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean, status?: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { evmAddress, solAddress } = useBolarityWalletProvider()



  const onChange = (open: boolean, status?: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open, status);
  };

  const onSendTransaction = async (
    solanaPublicKey: PublicKey,
    txPayload: any
  ) => {
    const provider = getProvider(
      {
        signTransaction,
        signAllTransactions,
        publicKey: solanaPublicKey,
      },
      connection
    );
    const program = new anchor.Program(IDL!, provider);

    const NETWORK = "TESTNET";
    const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
    const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
    const HELLO_WORLD_PID = program.programId;
    console.log("CORE_BRIDGE_PID:", CORE_BRIDGE_PID.toString());
    console.log("HELLO_WORLD_PID:", HELLO_WORLD_PID.toString());

    const realConfig = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);
    console.log("realConfig:", realConfig.toString());

    const message2 = await getProgramSequenceTracker(
      connection,
      program.programId,
      CORE_BRIDGE_PID
    )
      .then((tracker) =>
        deriveAddress(
          [
            Buffer.from("sent"),
            (() => {
              return writeBigUint64LE(tracker.sequence + BigInt(1));
            })(),
          ],
          HELLO_WORLD_PID
        )
      )
      .catch((err) => {
        toast.error("Failed to get program sequence tracker");
        console.log("err:", err);
      });

    if (!message2) {
      return;
    }

    const wormholeAccounts2 = getPostMessageCpiAccounts(
      program.programId,
      CORE_BRIDGE_PID,
      solanaPublicKey,
      message2
    );
    console.log("wormholeAccounts2:", wormholeAccounts2);

    const message = hexStringToUint8Array(txPayload);
    try {
      const params = {
        config: realConfig,
        wormholeProgram: CORE_BRIDGE_PID,
        ...wormholeAccounts2,
      };
      const ix1 = program.methods.sendMessage(Buffer.from(message));
      const ix2 = ix1.accountsStrict(params);
      const ix3 = await ix2.instruction();
      const tx3 = new Transaction().add(ix3);
      tx3.feePayer = solanaPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendTransaction(tx3, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      // Send transaction and await for signature
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      return signature;
      // appreove usdt success.
    } catch (error: any) {
      return error;
    }
  };

  const handleSubmit = async () => {

    if (!amount) return;

    setIsLoading(true);
    setIsSendDisabled(true);

    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const amountInWei = parseUnits(amount.toString(), 6); // Convert USDT to wei

    const proxyAddress = evmAddress;
    const contractAddressPadded = pad(toHex(toBytes(aaveContractAddress)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    const ABI = ["function withdraw(address asset,uint256 amount, address to)"];
    // 解析 ABI
    const iface = parseAbi(ABI);
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "withdraw",
      args: [usdtContractAddress, amountInWei, proxyAddress],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );
    const signature = await onSendTransaction(solanaPublicKey, txPayload);
    if (signature) {
      setTimeout(() => {
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet")
        );
        // 关闭状态
        setIsSendDisabled(false);
        setIsLoading(false);
        // 关闭对话框
        onChange(false, true);
      }, 3000);
    } else {
      toast.error("Transaction Failed.");

      // 关闭状态
      setIsSendDisabled(false);
      setIsLoading(false);
      // 关闭对话框
      onChange(false, true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <DialogDescription>Withdraw USDT</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <div>
            <DialogClose asChild>
              <Button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  handleSubmit();
                }}
                disabled={isSendDisabled}
              >
                {isLoading && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Withdraw
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface IBalance {
  solanaUsdt?: number;
  evmUsdt?: number;
  depositedUsdt?: number;
  apyUsdt?: string;
  dailyUsdt?: string;
}
const DefaultBalance: IBalance = {
  solanaUsdt: 0,
  evmUsdt: 0,
  depositedUsdt: 0,
  apyUsdt: "",
  dailyUsdt: "",
};

interface IReserveUSDTBalance {
  balance: number;
  apy: string;
  daily: string;
}
interface IReserveData {
  usdt: IReserveUSDTBalance;
}
const DefaultReserveData: IReserveData = {
  usdt: {
    balance: 0,
    apy: "",
    daily: "",
  },
};

const useGetReserveData = ({ evmAddress }: { evmAddress: string }) => {
  return useQuery({
    queryKey: ["getReserveData", evmAddress],
    enabled: !!evmAddress,
    queryFn: async (): Promise<IReserveData> => {
      const _reservesData: IReserveData = DefaultReserveData;
      const address = "0x69529987fa4a075d0c00b0128fa848dc9ebbe9ce";
      const pAddress = "0x012bac54348c0e635dcac9d5fb99f06f24136c9a";

      let scaledATokenBalance: bigint = 0n;
      let liquidityIndex: bigint = 0n;
      let liquidityRate: bigint = 0n;

      try {
        const userReserveDataResp = await publicClient.readContract({
          address,
          abi: aaveABI,
          functionName: "getUserReservesData",
          args: [pAddress, evmAddress as `0x${string}`],
        });
        // console.log("getUserReservesData:", userReserveData);
        if (
          userReserveDataResp &&
          userReserveDataResp instanceof Array &&
          userReserveDataResp.length > 0
        ) {
          for (const item of userReserveDataResp[0]) {
            // console.log("userReserveData item:", item);
            if (
              item.underlyingAsset.toLocaleLowerCase() ==
              usdtContractAddress.toLocaleLowerCase()
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
        // console.log("getReservesData:", reservesData);
        if (
          reservesDataResp &&
          reservesDataResp instanceof Array &&
          reservesDataResp.length > 0
        ) {
          for (const item of reservesDataResp[0]) {
            if (
              item.underlyingAsset.toLocaleLowerCase() ==
              usdtContractAddress.toLocaleLowerCase()
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

export const StakeTable = () => {

  const [openDepositModal, setOpenDepositModal] = useState(false);
  const [openWithdrawModal, setOpenWithdrawModal] = useState(false);

  const { evmAddress } = useBolarityWalletProvider()

  const { data: accountBalance, refetch: refetchAccountBalance } = useGetBalance()

  const { data: reservesData, refetch: refetchReserveData } = useGetReserveData(
    {
      evmAddress,
    }
  );
  const [balance, setBalance] = useState<IBalance>(DefaultBalance);

  const onDeposit = () => {
    setOpenDepositModal(true);
  };

  const handleCloseDepositModal = (open: boolean, status?: boolean) => {
    if (!open) {
      setOpenDepositModal(false);
    }

    if (status) {
      console.log("refresh account balance...");
      // refetchAccountBalance();
    }
  };

  const onWithdraw = () => {
    setOpenWithdrawModal(true);
  };

  const handleCloseWithdrawModal = (open: boolean, status?: boolean) => {
    if (!open) {
      setOpenWithdrawModal(false);
    }
    if (status) {
      console.log("refresh reserve data...");
      // handleRefresh();
    }
  };

  const handleRefresh = async () => {
    await refetchAccountBalance();
    await refetchReserveData();
  };

  useEffect(() => {
    setBalance({
      solanaUsdt: accountBalance?.solUsdtBalance,
      evmUsdt: accountBalance?.ethUsdtBalance,
      depositedUsdt: reservesData?.usdt.balance || 0,
      apyUsdt: reservesData?.usdt.apy || "-",
      dailyUsdt: reservesData?.usdt.daily || "-",
    });
  }, [
    // accountBalance?.solBalance,
    // accountBalance?.ethBalance,
    reservesData?.usdt.balance,
    reservesData?.usdt.apy,
    reservesData?.usdt.daily,
    accountBalance?.solUsdtBalance,
    accountBalance?.ethUsdtBalance,
  ]);

  return (
    <>
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
            <TableHead className="p-3"></TableHead>
            <TableHead className="p-3">Network</TableHead>
            <TableHead className="p-3">Application</TableHead>
            <TableHead className="p-3">Wallet Balance</TableHead>
            <TableHead className="p-3">Balance</TableHead>
            <TableHead className="p-3">APY</TableHead>
            <TableHead className="p-3">DAILY</TableHead>
            <TableHead className="p-3"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="p-3 lg:w-[160px] xl:w-[240px]">
              <div className="flex gap-2 items-center">
                <Image src="/tether.png" alt="USDT" width={24} height={24} />
                <h4 className="xl:text-lg uppercase">USDT</h4>
              </div>
            </TableCell>
            <TableCell className="p-3lg:w-[100px] xl:w-[160px]">
              <FaEthereum className="h-5 w-5" />
            </TableCell>
            <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
              <Image src="/aave.png" alt="AAVE" width={24} height={24} />
            </TableCell>
            <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
              <h5 className="xl:text-lg">
                {balance.evmUsdt?.toFixed(2) || 0.0}
              </h5>
            </TableCell>
            <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
              <h5 className="xl:text-lg">
                {balance.depositedUsdt?.toFixed(2) || 0.0}
              </h5>
            </TableCell>
            <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
              <h5 className="xl:text-lg">{balance.apyUsdt || "-"}</h5>
            </TableCell>
            <TableCell className="p-3 lg:w-[100px] xl:w-[160px]">
              <h5 className="xl:text-lg">{balance.dailyUsdt || "-"}</h5>
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
                    onClick={onDeposit}
                  >
                    Deposit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={onWithdraw}
                  >
                    Withdraw
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {openDepositModal && (
        <DepositModal
          open={openDepositModal}
          onOpenChange={handleCloseDepositModal}
        />
      )}

      {openWithdrawModal && (
        <WithdrawModal
          open={openWithdrawModal}
          onOpenChange={handleCloseWithdrawModal}
        />
      )}
    </>
  );
};
