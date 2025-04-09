import { serialize } from "borsh";

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
import { tryNativeToHexString } from "@certusone/wormhole-sdk";

import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { toast } from "sonner";

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

import { PublicKey } from "@solana/web3.js";

import { useWriteContract } from "wagmi";

import {
  encodeAbiParameters,
  erc20Abi,
  parseUnits,
  formatUnits,
  toHex,
} from "viem";

import {
  ETH_TRANSFER_SOL_TO_SOL_ABI,
  ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
} from "@/abis/EthSolBridgeSol";
import { useWidgetsProvider } from "@/providers/widgets-provider";
import { useCluster } from "@/providers/cluster-provider";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

import { publicClient } from "@/config/wagmi";
import { RawDataSchema, encodeMeta } from "@/config/solala";
const STATIC_AMOUNT = 0.01; //最低转账金额

function EthTransferFunc() {
  const { writeContract, writeContractAsync } = useWriteContract();
  const { getExplorerUrl } = useCluster();
  const { evmAddress, CheckApproveTransfer } = useBolarityWalletProvider();

  // 交易状态提示
  function transactionStatus(hash: string) {
    handleTransactionSuccess(hash, getExplorerUrl(`tx/${hash}`), "Transfer");
  }

  const { setIsOpen } = useWidgetsProvider();

  // TODO: 发送ETH转账:  eth控制sol地址转sol
  const ethereumTransferEthBalanceToSolana = async ({
    to,
    bridgeBalance,
    evmAddress,
    currentBalance,
  }: {
    to: string;
    bridgeBalance: number;
    evmAddress: string;
    currentBalance: number;
  }) => {
    const amount =
      bridgeBalance > currentBalance
        ? currentBalance - STATIC_AMOUNT
        : bridgeBalance;

    const amount_sol = bridgeBalance - currentBalance + STATIC_AMOUNT;
    const amountInWei = parseUnits(amount.toString(), 9); // Convert ETH to wei
    const destinationPublicKey = new PublicKey(to);
    console.log("eth控制sol地址----amount", amount);
    console.log("eth控制sol地址----amount_sol", amount_sol);
    console.log("eth控制sol地址----amountInWei", amountInWei);
    // 2. 构建交易消息
    const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
    const paras = sliceBuffer(sha256("transfer"), 0, 8);
    const encodedParams = Buffer.concat([paras, writeBigUint64LE(amountInWei)]);

    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          return writeUInt16LE(WORMHOLE_EVM_CHAIN_ID);
        })(),
        ethAddress,
      ],
      HELLO_WORLD_PID
    );
    const RawData = {
      chain_id: WORMHOLE_EVM_CHAIN_ID,
      caller: ethAddress,
      programId: HELLO_WORLD_PID.toBuffer(),
      acc_count: 2,
      accounts: [
        {
          key: realForeignEmitter.toBuffer(),
          isWritable: true,
          isSigner: true,
        },
        {
          key: destinationPublicKey.toBuffer(), // Recipient's address
          isWritable: true,
          isSigner: false,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };
    const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));
    // 3. 发送交易
    try {
      const txHash = await sendTransactionToEVM(RawDataEncoded);
      console.log("Transaction hash:", txHash);
      handleTransactionSuccess(
        txHash,
        `https://sepolia.etherscan.io/tx/${txHash}`
      );

      // 等待交易确认后进行下一步操作
      await waitForTransactionConfirmation(txHash);

      if (bridgeBalance - currentBalance > 0) {
        console.log("执行第二步----", amount_sol);
        setTimeout(() => {
          ethTransferToSolBalanceToSolana(amount_sol, to);
        }, 5000);
      } else if (bridgeBalance - currentBalance < 0) {
        console.log("执行第三步");
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Transaction failed", error);
      toast.error("Transaction failed: " + error?.toString().substring(0, 100));
      setIsOpen(false);
    }
  };

  // 发送ETH转账: Eth Token(USDT/USDC) > EVM
  const ethereumTransferSplBalanceToEvm = async ({
    token,
    to,
    balance,
  }: {
    token: CurrencyEnum.USDT | CurrencyEnum.USDC;
    to: string;
    balance: number;
  }) => {
    // 判断余额是否足够
    let tokenContract;
    switch (token) {
      case CurrencyEnum.USDC:
        tokenContract = EVM_USDC_CONTRACT;
        break;
      case CurrencyEnum.USDT:
      default:
        tokenContract = EVM_USDT_CONTRACT;
        break;
    }

    // 2. 发送交易
    const hash = await writeContractAsync({
      abi: ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
      address: tokenContract,
      functionName: "transfer",
      args: [to, parseUnits(balance.toString(), 6)],
    });
    console.log("hash--ethereumTransferSplBalanceToEvm--", hash);
    return hash;
  };

  const EthTransferApprove = async () => {
    console.log("solanaTransferSolBalanceToEth");
    try {
      const hash = await writeContractAsync({
        address: EVM_WSOL_CONTRACT,
        abi: erc20Abi,
        functionName: "approve",
        args: [TOKEN_BRIDGE_RELAYER_CONTRACT, APPROVE_BASE_AMOUNT],
      });
      console.log("hash--approve--", hash);
      return hash;
    } catch (error) {
      console.log("error--approve--", error);
      setIsOpen(false);
    }
  };

  // 发送ETH转账: wsol -> sol
  async function ethTransferToSolBalanceToSolana(balance: number, to: string) {
    console.log("直接跨桥");
    const amount = parseUnits(balance.toString(), 9); // Convert ETH to wei
    const byte32Address = tryNativeToHexString(to, 1);

    const targetRecipient = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(hexStringToUint8Array(byte32Address)))]
    );
    try {
      const hash = await writeContractAsync({
        address: TOKEN_BRIDGE_RELAYER_CONTRACT,
        abi: TOKEN_BRIDGE_RELAYER.abi,
        functionName: "transferTokensWithRelay",
        args: [EVM_WSOL_CONTRACT, amount, 0, 1, targetRecipient, 0],
      });
      console.log("hash--跨桥交易--", hash);
      transactionStatus(hash.toString());
      setIsOpen(false);
    } catch (e) {
      console.log("e--跨桥交易--", e);
      toast.error("Transaction failed");
      setIsOpen(false);
    }
  }

  function handleTransactionToast(hashTxt: string) {
    handleTransactionSuccess(
      hashTxt as string,
      `https://sepolia.etherscan.io/tx/${hashTxt}`,
      "Approve Success"
    );
  }

  // 跨桥交易 eth登陆。eth-> sol
  const ethTransferToSolApprove = async (
    balance: number,
    to: string,
    currentBalance_sol: number
  ) => {
    const comfirApproveHash = await EthTransferApprove();
    console.log("comfirApproveHash---", comfirApproveHash);
    if (comfirApproveHash) {
      const intervalTime = setInterval(async () => {
        if ((await CheckApproveTransfer()) > 0) {
          // 提示授权成功
          handleTransactionToast(comfirApproveHash as string);
          clearInterval(intervalTime); // 停止定时器
          // 执行转账逻辑

          setTimeout(() => {
            // ethTransferToSolBalanceToSolana(balance, to);
            if (currentBalance_sol <= STATIC_AMOUNT) {
              // 如果sol本链余额不足，则直接跨桥
              ethTransferToSolBalanceToSolana(balance, to);
            } else {
              // 如果sol本链余额足够，则发本链
              ethereumTransferEthBalanceToSolana({
                to,
                bridgeBalance: balance,
                evmAddress,
                currentBalance: currentBalance_sol,
              });
            }
          }, 5000);
        }
      }, 1000); // 每 500ms 检查一次

      // 清除定时器的逻辑，避免意外泄漏
      return () => {
        clearInterval(intervalTime);
      };
    } else {
      toast.error("Transaction Approve failed ");
    }
  };

  // 跨桥交易 eth登陆。eth-> sol
  const ethTransferCheckApprove = async (
    to: string,
    balance: number,
    currentBalance: number,
    s_type: number
  ) => {
    const comfirApproveHash = await EthTransferApprove();
    console.log("comfirApproveHash-执行第一步--", comfirApproveHash);
    if (comfirApproveHash) {
      const intervalTime = setInterval(async () => {
        if ((await CheckApproveTransfer()) > 0) {
          // 提示授权成功
          handleTransactionToast(comfirApproveHash as string);
          clearInterval(intervalTime); // 停止定时器
          // 执行转账逻辑
          if (s_type) {
            ethereumTransferEthBalanceToSolana({
              to,
              bridgeBalance: balance,
              evmAddress,
              currentBalance,
            });
          } else {
            ethereumCoontrollSolBalanceToEth({
              to,
              balance,
              currentBalance,
            });
          }
        }
      }, 1000); // 每 500ms 检查一次

      // 清除定时器的逻辑，避免意外泄漏
      return () => {
        clearInterval(intervalTime);
      };
    } else {
      toast.error("Transaction Approve failed ");
    }
  };
  // eth登陆。控制sol地址 将sol 跨链 转账eth地址
  async function ethereumCoontrollSolBalanceToEth({
    to,
    balance,
    currentBalance,
    solCurrentBalance = 0,
  }: {
    to: string;
    balance: number;
    currentBalance: number;
    solCurrentBalance?: number;
  }) {
    // 使用 parseUnits 转换为大整数（模拟更高精度）
    const aParsed = parseUnits(balance.toString(), 9); // 将数字提升到 9 位精度
    const bParsed = parseUnits(currentBalance.toString(), 9);

    const result = aParsed - bParsed; // 精确计算差值
    const formattedResult = formatUnits(result, 9); // 将结果转换回小数
    console.log("eth控制sol地址----formattedResult", formattedResult);

    const isStatus = balance > currentBalance;
    let amount = 0;
    console.log("solCurrentBalance", solCurrentBalance);
    if (Number(formattedResult) == solCurrentBalance) {
      amount = isStatus ? Number(formattedResult) - STATIC_AMOUNT : balance;
    } else {
      amount = isStatus ? Number(formattedResult) : balance;
    }
    console.log("balance--00--", balance);
    console.log("amount_sol", currentBalance);
    console.log("amount", amount);

    const amountInWei = parseUnits(amount.toString(), 9); // Convert ETH to wei
    console.log("amountInWei", amountInWei);

    const destinationPublicKey = Buffer.from(hexStringToUint8Array(to));

    // 2. 构建交易消息
    const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);

    const paras = Buffer.from("crosstsf");

    const encodedParams = Buffer.concat([
      paras,
      writeBigUint64LE(amountInWei),
      destinationPublicKey,
    ]);

    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          const buf = Buffer.alloc(2);
          buf.writeUInt16LE(WORMHOLE_EVM_CHAIN_ID);
          return buf;
        })(),
        ethAddress,
      ],
      HELLO_WORLD_PID
    );
    const RawData = {
      chain_id: WORMHOLE_EVM_CHAIN_ID,
      caller: ethAddress,
      programId: HELLO_WORLD_PID.toBuffer(),
      acc_count: 2,
      accounts: [
        {
          key: realForeignEmitter.toBuffer(),
          isWritable: true,
          isSigner: true,
        },
        {
          key: new PublicKey(ETH_CONTROLLED_SOL_TOKEN).toBuffer(), //会现将sol转给这个地址，由他帮你跨链过去
          isWritable: true,
          isSigner: false,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };
    const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));
    console.log("RawDataEncoded---", RawDataEncoded.toString("hex"));

    // 3. 发送交易
    try {
      const txHash = await sendTransactionToEVM(RawDataEncoded);
      console.log("Transaction hash:", txHash);
      handleTransactionSuccess(
        txHash,
        `https://sepolia.etherscan.io/tx/${txHash}`
      );

      // 等待交易确认后进行下一步操作
      await waitForTransactionConfirmation(txHash);

      if (currentBalance > 0) {
        console.log("执行第二步----", currentBalance);
        setTimeout(() => {
          ethereumTransferSolBalanceToEth({
            to,
            balance: currentBalance,
          });
        }, 2000);
      } else {
        console.log("执行第三步");
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Transaction failed", error);
      toast.error("Transaction failed: " + error?.toString().substring(0, 100));
      setIsOpen(false);
    }
  }
  // 用来发送交易到 Ethereum 网络的函数
  async function sendTransactionToEVM(RawDataEncoded: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      writeContract(
        {
          address: BOLARITY_EVM_CONTRACT,
          abi: UNI_PROXY.abi,
          functionName: "sendMessage",
          args: [toHex(Buffer.concat([sepoliaPayloadHead, RawDataEncoded]))],
        },
        {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error),
        }
      );
    });
  }

  // 等待交易确认的函数

  async function waitForTransactionConfirmation(txHash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 设置一个超时定时器
      const timeout = setTimeout(() => {
        clearInterval(interval); // 停止轮询
        reject(new Error("Transaction confirmation timeout")); // 抛出超时错误
      }, 60000); // 1 分钟超时

      // 定时检查交易状态
      const interval = setInterval(async () => {
        try {
          const receipt = await checkTransactionStatusFromEVM(txHash);

          if (receipt.success) {
            clearInterval(interval); // 停止轮询
            clearTimeout(timeout); // 停止超时
            resolve(); // 交易成功
          }
        } catch (err) {
          clearInterval(interval); // 停止轮询
          clearTimeout(timeout); // 停止超时
          reject(err); // 出现错误时抛出
        }
      }, 1000); // 每秒检查一次交易状态
    });
  }

  // 检查交易状态的函数
  async function checkTransactionStatusFromEVM(txHash: string) {
    try {
      // 使用 wagmi 的 provider 获取 Ethereum 网络的 provider
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      console.log("receipt", receipt);

      // 检查 receipt 是否存在，并且确认交易的状态
      if (receipt.status) {
        console.log("Transaction successful:", txHash);
        return { success: true, receipt };
      } else {
        console.error("Transaction failed or pending:", txHash);
        return { success: false, receipt };
      }
    } catch (err) {
      console.error("Error checking transaction status:", err);
      throw new Error("Transaction status check failed");
    }
  }
  // 发送ETH转账: wsol -> wsol
  async function ethereumTransferSolBalanceToEth({
    to,
    balance,
  }: {
    to: string;
    balance: number;
  }) {
    try {
      // 2. 发送交易
      const hash = await writeContractAsync({
        abi: ETH_TRANSFER_SOL_TO_SOL_ABI,
        address: EVM_WSOL_CONTRACT,
        functionName: "transfer",
        args: [to as `0x${string}`, parseUnits(balance.toString(), 9)],
      });
      console.log("hash--ethereumTransferSplBalanceToEvm--", hash);
      if (hash) {
        handleTransactionSuccess(
          hash,
          `https://sepolia.etherscan.io/tx/${hash}`
        );
        setIsOpen(false);
      } else {
        toast.error("Transaction failed");
        setIsOpen(false);
      }
    } catch (e) {
      console.log("e", e);
      toast.error("Transaction failed");
      setIsOpen(false);
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
