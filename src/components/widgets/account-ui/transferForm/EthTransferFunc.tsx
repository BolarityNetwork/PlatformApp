import { serialize } from "borsh";
import { PublicKey } from "@solana/web3.js";
import { useWriteContract } from "wagmi";
import {
  encodeAbiParameters,
  erc20Abi,
  parseUnits,
  formatUnits,
  toHex,
} from "viem";
import { toast } from "sonner";

import {
  APPROVE_BASE_AMOUNT,
  BOLARITY_EVM_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
  CurrencyEnum,
  ETH_CONTROLLED_SOL_TOKEN,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  TOKEN_BRIDGE_RELAYER,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
  UNI_PROXY,
  WORMHOLE_EVM_CHAIN_ID,
} from "@/config";

import { publicClient } from "@/config/wagmi";
import { RawDataSchema, encodeMeta } from "@/config/solala";
import {
  handleTransactionSuccess,
  hexStringToUint8Array,
  rightAlignBuffer,
  sepoliaPayloadHead,
  sha256,
  sliceBuffer,
  writeBigUint64LE,
  writeUInt16LE,
} from "@/lib/utils";

import { tryNativeToHexString, deriveAddress } from "@certusone/wormhole-sdk";

import { useWidgetsProvider } from "@/providers/widgets-provider";
import { useCluster } from "@/providers/cluster-provider";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

const STATIC_AMOUNT = 0.01;

function EthTransferFunc() {
  const { writeContract, writeContractAsync } = useWriteContract();
  const { setIsOpen } = useWidgetsProvider();
  const { getExplorerUrl } = useCluster();
  const { evmAddress, CheckApproveTransfer, refetchBalance } = useBolarityWalletProvider();

  function transactionStatus(hash: string) {
    handleTransactionSuccess(hash, getExplorerUrl(`tx/${hash}`), "Transfer");
    refetchBalance();
  }

  const ethereumTransferEthBalanceToSolana = async ({ to, bridgeBalance, evmAddress, currentBalance }: { to: string; bridgeBalance: number; evmAddress: string; currentBalance: number; }) => {
    try {
      const amount = bridgeBalance > currentBalance ? currentBalance - STATIC_AMOUNT : bridgeBalance;
      const amount_sol = bridgeBalance - currentBalance + STATIC_AMOUNT;
      const amountInWei = parseUnits(amount.toString(), 9);
      const destinationPublicKey = new PublicKey(to);

      const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
      const paras = sliceBuffer(sha256("transfer"), 0, 8);
      const encodedParams = Buffer.concat([paras, writeBigUint64LE(amountInWei)]);
      const ethAddress = rightAlignBuffer(Buffer.from(hexStringToUint8Array(evmAddress)));

      const realForeignEmitter = deriveAddress([
        Buffer.from("pda"),
        writeUInt16LE(WORMHOLE_EVM_CHAIN_ID),
        ethAddress,
      ], HELLO_WORLD_PID);

      const RawData = {
        chain_id: WORMHOLE_EVM_CHAIN_ID,
        caller: ethAddress,
        programId: HELLO_WORLD_PID.toBuffer(),
        acc_count: 2,
        accounts: [
          { key: realForeignEmitter.toBuffer(), isWritable: true, isSigner: true },
          { key: destinationPublicKey.toBuffer(), isWritable: true, isSigner: false },
        ],
        paras: encodedParams,
        acc_meta: Buffer.from(encodeMeta),
      };
      const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));

      const txHash = await sendTransactionToEVM(RawDataEncoded);
      transactionStatus(txHash);
      await waitForTransactionConfirmation(txHash);

      if (bridgeBalance - currentBalance > 0) {
        setTimeout(() => ethTransferToSolBalanceToSolana(amount_sol, to), 5000);
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Transaction failed: " + (error?.toString()?.substring(0, 100) || ""));
      setIsOpen(false);
    }
  };

  const ethereumTransferSplBalanceToEvm = async ({ token, to, balance }: { token: CurrencyEnum.USDT | CurrencyEnum.USDC; to: string; balance: number; }) => {
    try {
      const tokenContract = token === CurrencyEnum.USDC ? EVM_USDC_CONTRACT : EVM_USDT_CONTRACT;
      const hash = await writeContractAsync({
        abi: ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
        address: tokenContract,
        functionName: "transfer",
        args: [to, parseUnits(balance.toString(), 6)],
      });
      transactionStatus(hash);
      return hash;
    } catch (error) {
      console.error(error);
      toast.error("Transfer failed");
    }
  };

  const EthTransferApprove = async () => {
    try {
      const hash = await writeContractAsync({
        address: EVM_WSOL_CONTRACT,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOKEN_BRIDGE_RELAYER_CONTRACT, APPROVE_BASE_AMOUNT],
      });
      transactionStatus(hash);
      return hash;
    } catch (error) {
      console.error(error);
      setIsOpen(false);
      toast.error("Approve failed");
    }
  };

  const ethTransferToSolApprove = async (balance: number, to: string, currentBalance_sol: number) => {
    try {
      const approveHash = await EthTransferApprove();
      if (!approveHash) throw new Error("Approve Failed");
      if (currentBalance_sol <= STATIC_AMOUNT) {
        await ethTransferToSolBalanceToSolana(balance, to);
      } else {
        await ethereumTransferEthBalanceToSolana({ to, bridgeBalance: balance, evmAddress, currentBalance: currentBalance_sol });
      }
    } catch (error) {
      console.error(error);
      toast.error("Transfer after approve failed");
      setIsOpen(false);
    }
  };

  async function ethTransferToSolBalanceToSolana(balance: number, to: string) {
    try {
      const amount = parseUnits(balance.toString(), 9);
      const byte32Address = tryNativeToHexString(to, 1);
      const targetRecipient = encodeAbiParameters([{ type: "bytes32" }], [toHex(Buffer.from(hexStringToUint8Array(byte32Address)))]);
      const hash = await writeContractAsync({
        address: TOKEN_BRIDGE_RELAYER_CONTRACT,
        abi: TOKEN_BRIDGE_RELAYER.abi,
        functionName: "transferTokensWithRelay",
        args: [EVM_WSOL_CONTRACT, amount, 0, 1, targetRecipient, 0],
      });
      transactionStatus(hash);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Cross-chain transfer failed");
      setIsOpen(false);
    }
  }

  const ethTransferCheckApprove = async (to: string, balance: number, currentBalance: number, s_type: number) => {
    try {
      const approveHash = await EthTransferApprove();
      if (!approveHash) throw new Error("Approve Failed");
      if (s_type) {
        await ethereumTransferEthBalanceToSolana({ to, bridgeBalance: balance, evmAddress, currentBalance });
      } else {
        await ethereumCoontrollSolBalanceToEth({ to, balance, currentBalance });
      }
    } catch (error) {
      console.error(error);
      toast.error("Approve and transfer failed");
      setIsOpen(false);
    }
  };

  async function ethereumCoontrollSolBalanceToEth({ to, balance, currentBalance, solCurrentBalance = 0 }: { to: string; balance: number; currentBalance: number; solCurrentBalance?: number; }) {
    try {
      const aParsed = parseUnits(balance.toString(), 9);
      const bParsed = parseUnits(currentBalance.toString(), 9);
      const result = aParsed - bParsed;
      const formattedResult = formatUnits(result, 9);
      const isStatus = balance > currentBalance;
      const amount = (Number(formattedResult) === solCurrentBalance) ? (isStatus ? Number(formattedResult) - STATIC_AMOUNT : balance) : (isStatus ? Number(formattedResult) : balance);
      const amountInWei = parseUnits(amount.toString(), 9);
      const destinationPublicKey = Buffer.from(hexStringToUint8Array(to));

      const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
      const paras = Buffer.from("crosstsf");
      const encodedParams = Buffer.concat([paras, writeBigUint64LE(amountInWei), destinationPublicKey]);
      const ethAddress = rightAlignBuffer(Buffer.from(hexStringToUint8Array(evmAddress)));

      const realForeignEmitter = deriveAddress([
        Buffer.from("pda"),
        writeUInt16LE(WORMHOLE_EVM_CHAIN_ID),
        ethAddress,
      ], HELLO_WORLD_PID);

      const RawData = {
        chain_id: WORMHOLE_EVM_CHAIN_ID,
        caller: ethAddress,
        programId: HELLO_WORLD_PID.toBuffer(),
        acc_count: 2,
        accounts: [
          { key: realForeignEmitter.toBuffer(), isWritable: true, isSigner: true },
          { key: new PublicKey(ETH_CONTROLLED_SOL_TOKEN).toBuffer(), isWritable: true, isSigner: false },
        ],
        paras: encodedParams,
        acc_meta: Buffer.from(encodeMeta),
      };
      const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));

      const txHash = await sendTransactionToEVM(RawDataEncoded);
      transactionStatus(txHash);
      await waitForTransactionConfirmation(txHash);

      if (currentBalance > 0) {
        setTimeout(() => ethereumTransferSolBalanceToEth({ to, balance: currentBalance }), 2000);
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Cross transfer failed");
      setIsOpen(false);
    }
  }

  async function ethereumTransferSolBalanceToEth({ to, balance }: { to: string; balance: number; }) {
    try {
      const hash = await writeContractAsync({
        abi: ETH_TRANSFER_SOL_TO_SOL_ABI,
        address: EVM_WSOL_CONTRACT,
        functionName: "transfer",
        args: [to as `0x${string}`, parseUnits(balance.toString(), 9)],
      });
      transactionStatus(hash);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Transfer failed");
      setIsOpen(false);
    }
  }

  async function sendTransactionToEVM(RawDataEncoded: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      writeContract({
        address: BOLARITY_EVM_CONTRACT,
        abi: UNI_PROXY.abi,
        functionName: "sendMessage",
        args: [toHex(Buffer.concat([sepoliaPayloadHead, RawDataEncoded]))],
      }, {
        onSuccess: (hash) => resolve(hash),
        onError: (error) => reject(error),
      });
    });
  }

  async function waitForTransactionConfirmation(txHash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Transaction confirmation timeout"));
      }, 60000);
      const interval = setInterval(async () => {
        try {
          const receipt = await checkTransactionStatusFromEVM(txHash);
          if (receipt.success) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        } catch (err) {
          clearInterval(interval);
          clearTimeout(timeout);
          reject(err);
        }
      }, 1000);
    });
  }

  async function checkTransactionStatusFromEVM(txHash: string) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status) return { success: true, receipt };
      else return { success: false, receipt };
    } catch (err) {
      throw new Error("Transaction status check failed");
    }
  }

  return {
    ethereumTransferEthBalanceToSolana,
    ethereumTransferSplBalanceToEvm,
    ethereumTransferSolBalanceToEth,
    ethTransferToSolApprove,
    ethTransferToSolBalanceToSolana,
    ethereumCoontrollSolBalanceToEth,
    ethTransferCheckApprove,
  };
}

export default EthTransferFunc;