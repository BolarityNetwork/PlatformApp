import { serialize } from "borsh";

import {
  APPROVE_BASE_AMOUNT,
  BOLARITY_EVM_CONTRACT,
  BOLARITY_SOLANA_CONTRACT,
  CurrencyEnum,
  SOLANA_USDC_CONTRACT,
  ETH_CONTROLLED_SOL_TOKEN,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  TOKEN_BRIDGE_RELAYER,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
  TOKEN_CLAIM_PROGRAM,
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

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

import { publicClient } from "@/config/wagmi";
import {
  AccountMeta,
  RawDataSchema,
  SolanaAccountMetaList,
  encodeMeta,
} from "@/config/solala";
import ethContractTransfer from "@/hooks/transfer/ethTransfer";
import { useEffect } from "react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
const STATIC_AMOUNT = 0.01; //最低转账金额

function EthTransferFunc() {
  const { writeContract, writeContractAsync } = useWriteContract();
  const { evmAddress, solAddress, CheckApproveTransfer } =
    useBolarityWalletProvider();
  const { EthControll, isLoading, setToastTitle } = ethContractTransfer();

  const { setIsOpen } = useWidgetsProvider();

  const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT);
  const USDC_Mint = new PublicKey(SOLANA_USDC_CONTRACT);

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
        setToastTitle("Transfer USDC");
        break;
      case CurrencyEnum.USDT:
      default:
        tokenContract = EVM_USDT_CONTRACT;
        setToastTitle("Transfer USDT");
        break;
    }
    try {
      // 2. 发送交易
      const hash = await EthControll({
        abi: ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
        address: tokenContract,
        functionName: "transfer",
        args: [to, parseUnits(balance.toString(), 6)],
      });
      console.log("hash--ethereumTransferSplBalanceToEvm--", hash);
      // return hash;
    } catch (e) {
      console.log("e--ethereumTransferSplBalanceToEvm--", e);
      toast.error("Transaction failed");
      setIsOpen(false);
    }
  };
  useEffect(() => {
    if (!isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

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

    setToastTitle("Transferring WSOL");
    try {
      const hash = await EthControll({
        address: TOKEN_BRIDGE_RELAYER_CONTRACT,
        abi: TOKEN_BRIDGE_RELAYER.abi,
        functionName: "transferTokensWithRelay",
        args: [EVM_WSOL_CONTRACT, amount, 0, 1, targetRecipient, 0],
      });
      console.log("hash--跨桥交易--", hash);
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
          // 6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF
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
    setToastTitle("Transferring WSOL");
    try {
      // 2. 发送交易
      const hash = await EthControll({
        abi: ETH_TRANSFER_SOL_TO_SOL_ABI,
        address: EVM_WSOL_CONTRACT,
        functionName: "transfer",
        args: [to as `0x${string}`, parseUnits(balance.toString(), 9)],
      });
      console.log("hash--ethereumTransferSolBalanceToEth--", hash);
    } catch (e) {
      console.log("e", e);
      toast.error("Transaction failed");
      setIsOpen(false);
    }
  }
  // 添加到组件内部或提取到单独的工具函数
  const handleDriftTransaction = async (
    payload: any,
    ethController: any,
    title: string
  ) => {
    try {
      const resHash = await ethController({
        abi: UNI_PROXY.abi,
        address: BOLARITY_EVM_CONTRACT,
        functionName: "sendMessage",
        args: [toHex(Buffer.concat([sepoliaPayloadHead, payload]))],
      });
      console.log(`${title} result:`, resHash);
      if (!resHash) {
        setIsOpen(false);
      }
    } catch (error: any) {
      console.error(`${title} error:`, error);
      toast.error(`${title} Failed.`);

      setIsOpen(false);
    }
  };
  // TODO:  eth controll  sol address transfer usdc
  const EthTxSOLBalanceUsdcToSola = async ({
    address,
    amount,
    splTokenAddress = USDC_Mint,
    isUsdc = 0,
  }: {
    address: string;
    amount: number;
    splTokenAddress?: PublicKey;
    isUsdc?: number;
  }) => {
    const amountInWei = parseUnits(amount.toString(), 6); // Convert ETH to wei
    const destinationPublicKey = new PublicKey(address);
    console.log("eth控制sol地址----amount", amount);
    console.log("eth控制sol地址----amountInWei", amountInWei);
    // 2. 构建交易消息

    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const paras = Buffer.from([0x0c]);

    const decimalBuf = Buffer.alloc(1);

    decimalBuf.writeUint8(6); // udsc 6 decimals

    const encodedParams = Buffer.concat([
      paras,
      writeBigUint64LE(amountInWei),
      decimalBuf,
    ]);
    const addressKey = new PublicKey(solAddress);
    const usdcTokenAta = getAssociatedTokenAddressSync(
      splTokenAddress, // usdc mint
      addressKey,
      true
    );
    const destination = getAssociatedTokenAddressSync(
      splTokenAddress, // usdc mint
      destinationPublicKey,
      true
    );

    const encodeMeta = serialize(AccountMeta, SolanaAccountMetaList);

    console.log("usdc--proxy address-", destination.toBase58());
    console.log("usdc--WORMHOLE_EVM_CHAIN_ID-", WORMHOLE_EVM_CHAIN_ID);

    const RawData_usdc = {
      chain_id: WORMHOLE_EVM_CHAIN_ID,
      caller: ethAddress,
      programId: new PublicKey(TOKEN_CLAIM_PROGRAM).toBuffer(),
      acc_count: 5,
      accounts: [
        {
          key: usdcTokenAta.toBuffer(), // proxy account ata account
          isWritable: SolanaAccountMetaList[0].writeable,
          isSigner: SolanaAccountMetaList[0].is_signer,
        },
        {
          key: splTokenAddress.toBuffer(), // usdc mint,or btc mint, or other...
          isWritable: SolanaAccountMetaList[1].writeable,
          isSigner: SolanaAccountMetaList[1].is_signer,
        },
        {
          // key: new PublicKey(destination).toBuffer(), // dest ata address
          key: destination.toBuffer(), // dest ata address
          isWritable: SolanaAccountMetaList[2].writeable,
          isSigner: SolanaAccountMetaList[2].is_signer,
        },
        {
          key: addressKey.toBuffer(),
          isWritable: SolanaAccountMetaList[3].writeable,
          isSigner: SolanaAccountMetaList[3].is_signer,
        },
        {
          key: addressKey.toBuffer(),
          isWritable: SolanaAccountMetaList[4].writeable,
          isSigner: SolanaAccountMetaList[4].is_signer,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };
    const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData_usdc));
    const isUsdcTitle = (isUsdc && "BTC") || "USDC";
    setToastTitle(`Transfer ${isUsdcTitle}`);

    // 3. send tx
    await handleDriftTransaction(
      RawDataEncoded,
      EthControll,
      `Transfer ${isUsdcTitle}`
    );
  };

  return {
    ethereumTransferEthBalanceToSolana,
    ethereumTransferSplBalanceToEvm,
    ethereumTransferSolBalanceToEth,
    ethTransferToSolApprove,
    ethTransferToSolBalanceToSolana,
    ethereumCoontrollSolBalanceToEth,
    ethTransferCheckApprove,
    EthTxSOLBalanceUsdcToSola,
    handleDriftTransaction,
  };
}

export default EthTransferFunc;
