import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { publicClient } from "@/config/wagmi";
import { aaveABI } from "@/abis/AAveABI";

import {
  formatUnits,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  toBytes,
  toHex,
  bytesToHex,
  erc20Abi,
} from "viem";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

import {
  getProvider,
  hexStringToUint8Array,
  writeBigUint64LE,
} from "@/lib/utils";

import * as anchor from "@coral-xyz/anchor";
import { CONTRACTS } from "@certusone/wormhole-sdk";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import {
  AAVE_CONTRACT,
  APPROVE_BASE_AMOUNT,
  ETH_TO_STETH_STAKING,
  EVM_USDT_CONTRACT,
  PROXY_LIDO_CONTRACT_ADDRESS,
} from "@/config";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

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

export const useGetReserveData = ({ evmAddress }: { evmAddress: string }) => {
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
        // console.log('getlidoDdata-----:', userReserveDataResp)

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
const lidoAprUrl = "https://eth-api.lido.fi/v1/protocol/steth/apr/last";
export const useGetLidoApr = () => {
  return useQuery({
    queryKey: ["useGetLidoAprReq"],
    queryFn: () => fetch(lidoAprUrl).then((res) => res.json()),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
};

// vaults-ui 的 deposit modal data context

export const useDepositModal = () => {
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { solAddress, evmAddress } = useBolarityWalletProvider();

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
            (() => writeBigUint64LE(tracker.sequence + BigInt(1)))(),
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
      console.log("error:", error);
      // toast.error('Transaction failed: ' + error.toString().substring(0, 100))
    }
  };

  const onApprove = async () => {
    const solanaPublicKey = new PublicKey(solAddress);
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(solanaPublicKey.toBytes()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(EVM_USDT_CONTRACT)), {
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
      args: [AAVE_CONTRACT, APPROVE_BASE_AMOUNT],
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

  // 读取是否授权了
  const CheckApproveTransfer = async () => {
    const allowanceStatus = await publicClient.readContract({
      address: EVM_USDT_CONTRACT,
      abi: erc20Abi,
      functionName: "allowance",
      args: [evmAddress as `0x${string}`, AAVE_CONTRACT],
    });
    console.log("allowanceStatus", allowanceStatus);
    return Number(allowanceStatus);
  };
  return {
    onApprove,
    onSendTransaction,
    CheckApproveTransfer,
  };
};
