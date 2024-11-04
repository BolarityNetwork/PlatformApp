"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { HandCoins } from "lucide-react";

import { useBolarity } from "@/hooks/useBolarity";
import { useAccountBalance } from "@/hooks/useAccount";
import {
  formatRecipientAddress,
  getProvider,
  handleTransactionSuccess,
  hexStringToUint8Array,
  isValidEvmAddress,
  isValidPublicKey,
  wait,
  writeBigUint64LE,
} from "@/lib/utils";
import {
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  SOLANA_USDC_CONTRACT,
  SOLANA_USDT_CONTRACT,
  SupportChain,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
  WORMHOLE_EVM_CHAIN_NAME,
  WORMHOLE_SOLANA_BRIDGE,
  WORMHOLE_SOLANA_TOKEN_BRIDGE,
} from "@/config";
import { publicClient } from "@/config/wagmi";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCluster } from "@/providers/cluster-provider";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { toast } from "sonner";
import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  pad,
  parseAbi,
  parseUnits,
  toBytes,
  toHex,
} from "viem";

import * as anchor from "@coral-xyz/anchor";
import {
  CONTRACTS,
  transferNativeSol,
  ChainName,
  getEmitterAddressSolana,
  parseSequenceFromLogSolana,
} from "@certusone/wormhole-sdk";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// interface IFeeData {
//   gasFee: number;
//   gasAmount: number;
//   transactionFee: number;
//   transactionAmount: number;
// }

export const SendModal = ({
  currency = CurrencyEnum.SOLANA,
  open = false,
  onOpenChange,
  withButton = true,
}: {
  currency?: CurrencyEnum;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const { isConnected, wallet } = useBolarity();
  const { connection } = useConnection();
  const { getExplorerUrl } = useCluster();
  const {
    signTransaction: solanaSignTransaction,
    signAllTransactions: solanaSignAllTransactions,
    sendTransaction: solanaSendTransaction,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(open);
  const [amount, setAmount] = useState("");
  const [fromChain, setFromChain] = useState(currency);
  const [toChain, setToChain] = useState("sol");
  const [destination, setDestination] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const [currentBalance, setCurrentBalance] = useState("0.00");
  const [gasFeeToken, setGasFeeToken] = useState("");
  const [gasFee, setGasFee] = useState(0.0);
  const [gasAmount, setGasAmount] = useState(0.0);
  const [transactionFee, setTransactionFee] = useState(0.0);
  const [transactionAmount, setTransactionAmount] = useState(0.0);
  const [loadingFee, setLoadingFee] = useState(false);
  const [sending, setSending] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const { accountBalance } = useAccountBalance({
    solAddress: wallet.address,
    evmAddress: wallet.evmAddress,
  });

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (!wallet) {
      setGasFeeToken("");
    } else {
      if (wallet.chain === SupportChain.Solana) {
        setGasFeeToken("SOL");
      } else if (wallet.chain === SupportChain.Ethereum) {
        setGasFeeToken("ETH");
      }
    }
  }, [wallet]);

  useEffect(() => {
    if (
      destination.length >= 32 &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= parseFloat(currentBalance) &&
      isConnected
    ) {
      if (
        (toChain === "sol" && isValidPublicKey(destination)) ||
        (toChain === "eth" && isValidEvmAddress(destination))
      ) {
        setIsSendDisabled(false);
      }
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount, isConnected, toChain, currentBalance]);

  useMemo(() => {
    if (!accountBalance) {
      setCurrentBalance("0.00");
    } else {
      if (fromChain === CurrencyEnum.SOLANA) {
        setCurrentBalance(
          (accountBalance.solBalance + accountBalance.ethSolBalance).toFixed(4)
        );
      } else if (fromChain === CurrencyEnum.ETHEREUM) {
        setCurrentBalance(
          (accountBalance.ethBalance + accountBalance.solEthBalance).toFixed(4)
        );
      } else if (fromChain === CurrencyEnum.USDT) {
        setCurrentBalance(
          (
            accountBalance.solUsdtBalance + accountBalance.ethUsdtBalance
          ).toFixed(2)
        );
      } else if (fromChain === CurrencyEnum.USDC) {
        setCurrentBalance(
          (
            accountBalance.solUsdcBalance + accountBalance.ethUsdcBalance
          ).toFixed(2)
        );
      } else {
        setCurrentBalance("0.00");
      }
    }
  }, [fromChain, accountBalance]);

  // const fetchFee = async () => {
  //   const fee = {
  //     gasFee: 0.0,
  //     gasAmount: 0.0,
  //     transactionFee: 0.0,
  //     transactionAmount: 0.0,
  //   };

  //   // 获取当前链的手续费
  //   if (fromChain === CurrencyEnum.SOLANA) {
  //   } else if (fromChain === CurrencyEnum.ETHEREUM) {
  //   }

  //   return fee;
  // };

  // useEffect(() => {
  //   let unsubscribe = false;
  //   if (!isSendDisabled) {
  //     const _getFee = async () => {
  //       setLoadingFee(true);
  //       fetchFee()
  //         .then((res) => {
  //           if (!unsubscribe) {
  //             setGasFee(res.gasFee);
  //             setGasAmount(res.gasAmount);
  //             setTransactionFee(res.transactionFee);
  //             setTransactionAmount(res.transactionAmount);
  //           }
  //         })
  //         .finally(() => {
  //           setLoadingFee(false);
  //         });
  //     };
  //     _getFee();
  //   }

  //   return () => {
  //     unsubscribe = true;
  //   };
  // }, [isSendDisabled]);

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const formReset = () => {
    setAmount("");
    setDestination("");
    setGasFeeToken("");
    setGasFee(0.0);
    setGasAmount(0.0);
    setTransactionFee(0.0);
    setTransactionAmount(0.0);
  };

  // 发送Solana Wormhole交易 - 完成
  const sendSolanaWormholeTransaction = async ({
    solanaPublicKey,
    txPayload,
    txMessage = "Transaction",
    amount = 0, // 是否需要执行SOL链上转账
    toAddress = "", // 转账目标地址
    addTransaction,
  }: {
    solanaPublicKey: PublicKey;
    txPayload: any;
    txMessage?: string;
    amount?: number;
    toAddress?: string;
    addTransaction?: Transaction | TransactionInstruction;
  }): Promise<boolean> => {
    const provider = getProvider(
      {
        signTransaction: solanaSignTransaction,
        signAllTransactions: solanaSignAllTransactions,
        publicKey: solanaPublicKey,
      },
      connection
    );
    const program = new anchor.Program(IDL!, provider);

    const NETWORK = "TESTNET";
    const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
    const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
    const HELLO_WORLD_PID = program.programId;
    const realConfig = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);

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
      });

    if (!message2) {
      return false;
    }

    const wormholeAccounts2 = getPostMessageCpiAccounts(
      program.programId,
      CORE_BRIDGE_PID,
      solanaPublicKey,
      message2
    );

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
      if (amount > 0 && toAddress) {
        tx3.add(
          SystemProgram.transfer({
            fromPubkey: solanaPublicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: parseUnits(amount.toString(), 9),
          })
        );
      }
      if (addTransaction) {
        tx3.add(addTransaction);
      }

      tx3.feePayer = solanaPublicKey;
      tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await solanaSendTransaction(tx3, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      // Send transaction and await for signature
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      handleTransactionSuccess(
        signature,
        getExplorerUrl(`tx/${signature}`),
        txMessage
      );

      return true;
    } catch (error: any) {
      toast.error(`${txMessage} Failed`, {
        description: `${error}`,
        duration: 10000,
      });
      return false;
    }
  };

  // 授权: WSOL - 完成
  const approveWSol = async ({
    fromPubkey,
    contractAddress,
  }: {
    fromPubkey: PublicKey;
    contractAddress: string;
  }) => {
    toast.info(`You need approved to ${TOKEN_BRIDGE_RELAYER_CONTRACT}`);

    // 发起授权
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(fromPubkey.toBytes()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(contractAddress)), {
      size: 32,
      dir: "left",
    });
    const contractAddressParam = encodeAbiParameters(
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
        TOKEN_BRIDGE_RELAYER_CONTRACT,
        BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        ),
      ],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddressParam, BigInt(0), bytesToHex(toBytes(paras))]
    );
    // 6. Encode the final payload
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [userAddress, payloadPart]
    );

    await sendSolanaWormholeTransaction({
      solanaPublicKey: fromPubkey,
      txPayload,
      txMessage: "Approve",
    });

    toast.success(`You need approved to ${TOKEN_BRIDGE_RELAYER_CONTRACT}`);
  };

  // 创建Associated Token Account
  const createAssociatedTokenAccount = async ({
    payer,
    associatedTokenAddress,
    owner,
    mint,
  }: {
    payer: PublicKey;
    associatedTokenAddress: PublicKey;
    owner: PublicKey;
    mint: PublicKey;
  }): Promise<boolean> => {
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedTokenAddress,
        owner,
        mint
      )
    );

    try {
      const latestBlockhash = await connection.getLatestBlockhash();
      const signature = await solanaSendTransaction(tx, connection);
      await connection.confirmTransaction(
        { signature: signature, ...latestBlockhash },
        "confirmed"
      );

      return true;
    } catch (error: any) {
      toast.error(`Create Associated Token Account Failed`, {
        description: `${error}`,
        duration: 10000,
      });
      return false;
    }
  };

  // 发送Solana转账: Sol -> solana - 完成
  const transferSolBalanceToSolana = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log(`Sending ${balance} + ${bridgeBalance} SOL to ${to}`);

    // 1. 执行交易前Loading...
    setSending(true);

    // 2. 初始化数据
    const fromPubkey = new PublicKey(wallet.address);
    const toPubkey = new PublicKey(to);

    // 3. 判断是否需要跨桥
    if (bridgeBalance > 0) {
      if (!isApproved) {
        // 判断是否需要approve
        let needApprove = false;
        try {
          const bridgeBalanceInWei = parseUnits(bridgeBalance.toString(), 9);
          const allowance = await publicClient.readContract({
            address: EVM_WSOL_CONTRACT,
            abi: erc20Abi,
            functionName: "allowance",
            args: [
              wallet.evmAddress as `0x${string}`,
              TOKEN_BRIDGE_RELAYER_CONTRACT,
            ],
          });
          needApprove = allowance < bridgeBalanceInWei;
        } catch (error) {
          toast.error("Failed to get allowance");
          setSending(false);
          return;
        }

        if (needApprove) {
          try {
            await approveWSol({
              fromPubkey,
              contractAddress: EVM_WSOL_CONTRACT,
            });

            setIsApproved(true);
            await wait(2500); // 等待2.5s
          } catch (error) {
            toast.error("Failed to approve");
          }

          setSending(false);
          return;
        }
      }

      // 构建wormhole交易消息
      const userAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(fromPubkey.toBytes()))]
      );
      const contractAddressPadded = pad(
        toHex(toBytes(TOKEN_BRIDGE_RELAYER_CONTRACT)),
        {
          size: 32,
          dir: "left",
        }
      );
      const contractAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [contractAddressPadded]
      );
      const targetRecipient = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(toPubkey.toBytes()))]
      );
      let ABI = [
        "function transferTokensWithRelay(\
        address token,\
        uint256 amount,\
        uint256 toNativeTokenAmount,\
        uint16 targetChain,\
        bytes32 targetRecipient,\
        uint32 batchId\
        )",
      ];
      const iface = parseAbi(ABI);
      const bridgeAmount = parseUnits(bridgeBalance.toString(), 9); // Sol 的精度为9
      const paras = encodeFunctionData({
        abi: iface,
        functionName: "transferTokensWithRelay",
        args: [EVM_WSOL_CONTRACT, bridgeAmount, 0, 1, targetRecipient, 0],
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

      // 合并Wormhole交易消息和转账
      await sendSolanaWormholeTransaction({
        solanaPublicKey: fromPubkey,
        txPayload,
        txMessage: "Transfer",
        amount: balance,
        toAddress: to,
      });
      formReset();
      setSending(false);
      onChange(false);
      // -------------------------------
    } else {
      // 如果本链余额足够，直接发送交易消息
      try {
        // 发送交易并等待确认
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: parseUnits(balance.toString(), 9), // Sol 的精度为9
          })
        );
        const signature = await solanaSendTransaction(transaction, connection, {
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });
        // 4. 处理交易结果
        handleTransactionSuccess(signature, getExplorerUrl(`tx/${signature}`));

        // 5. 重置表单 & 关闭对话框
        formReset();
        setSending(false);
        onChange(false);
      } catch (error) {
        setSending(false);
        toast.error("Transaction failed: " + error);
      }
    }
  };

  // 发送Solana转账: Solana Token(USDT/USDC) -> Solana - 已完成
  const transferSplBalanceToSolana = async ({
    token,
    to,
    balance,
    bridgeBalance,
  }: {
    token: CurrencyEnum.USDT | CurrencyEnum.USDC;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log(
      `transferSplBalanceToSolana: Sending ${balance} + ${bridgeBalance} ${token} to ${to}`
    );

    // 只支持Solana账户到Solana账户
    let currentAccountBalance = 0; // 当前余额
    let tokenMintAddress;
    switch (token) {
      case CurrencyEnum.USDT:
        tokenMintAddress = SOLANA_USDT_CONTRACT;
        currentAccountBalance = accountBalance?.solUsdtBalance;
        break;
      case CurrencyEnum.USDC:
        tokenMintAddress = SOLANA_USDC_CONTRACT;
        currentAccountBalance = accountBalance?.solUsdcBalance;
        break;
      default:
        toast.error("Unsupported token");
        return;
    }
    const sendBalance = balance + bridgeBalance;
    if (currentAccountBalance < sendBalance) {
      toast.error("Insufficient balance");
      return;
    }

    // 1. 执行交易前Loading...
    setSending(true);

    // 2. 构建交易信息
    const fromPubkey = new PublicKey(wallet.address);
    const toPubkey = new PublicKey(to);

    let tokenMintPublicKey;
    try {
      tokenMintPublicKey = new PublicKey(tokenMintAddress);
    } catch (error) {
      toast.error("Invalid token mint address");
      return;
    }

    let senderTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      fromPubkey
    );
    let recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      toPubkey
    );

    if (!senderTokenAccount) {
      toast.error("Invalid sender token account.");
      return false;
    }

    if (!recipientTokenAccount) {
      const created = await createAssociatedTokenAccount({
        payer: fromPubkey,
        associatedTokenAddress: toPubkey,
        owner: toPubkey,
        mint: tokenMintPublicKey,
      });
      if (!created) {
        toast.error("Invalid recipient token account.");
        return false;
      }
      recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        toPubkey
      );
      if (!recipientTokenAccount) {
        toast.error("Invalid recipient token account.");
        return false;
      }
    }

    // 3. 发送交易
    try {
      const tx = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          fromPubkey,
          parseUnits(sendBalance.toString(), 6), // USDT/USDC 的精度为6
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = fromPubkey;

      const signature = await solanaSendTransaction(tx, connection, {
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });

      // 4. 交易成功
      handleTransactionSuccess(signature, getExplorerUrl(`tx/${signature}`));

      // 5. 重置表单 & 关闭对话框
      formReset();
      onChange(false);
    } catch (error) {
      console.log("transferSplBalanceToSolana error: ", error);
      toast.error("Transaction failed: " + error);
    }

    setSending(false);
  };

  // 发送Solana转账: Solana -> Ethereum
  const transferSolBalanceToEvm = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log(
      `transferSolBalanceToEvm: Sending ${balance} + ${bridgeBalance} SOL to ${to}`
    );
    // 1. 执行交易前Loading...
    setSending(true);

    // 2. 初始化数据
    const fromPubkey = new PublicKey(wallet.address);

    // 3. 使用Relay构建wormhole bridge交易消息
    const toEvmAddress = formatRecipientAddress(to);
    const transaction = await transferNativeSol(
      connection,
      WORMHOLE_SOLANA_BRIDGE,
      WORMHOLE_SOLANA_TOKEN_BRIDGE,
      fromPubkey,
      parseUnits(balance.toString(), 9),
      toEvmAddress,
      WORMHOLE_EVM_CHAIN_NAME as ChainName
    );

    // const TOKEN_BRIDGE_RELAYER_PID =
    //   "EYcqMLNRMUkHvDMg2Jpng8R5HMeJgt8uX7q372omPVsD";
    // const CORE_BRIDGE_PID = "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
    // const TOKEN_BRIDGE_PID = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";
    // const mint = new PublicKey("So11111111111111111111111111111111111111112");
    // const sendParams: SendTokensParams = {
    //   amount: Math.floor(balance * 1e9),
    //   toNativeTokenAmount: 0,
    //   recipientAddress: formatRecipientAddress(to),
    //   recipientChain: WORMHOLE_EVM_CHAIN_ID as ChainId,
    //   batchId: 0,
    //   wrapNative: true,
    // };
    // const transaction =
    //   await tokenBridgeRelayer.createTransferNativeTokensWithRelayInstruction(
    //     connection,
    //     TOKEN_BRIDGE_RELAYER_PID,
    //     fromPubkey,
    //     TOKEN_BRIDGE_PID,
    //     CORE_BRIDGE_PID,
    //     mint,
    //     sendParams
    //   );

    try {
      const signature = await solanaSendTransaction(transaction, connection, {
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      // 4. 处理交易结果
      handleTransactionSuccess(signature, getExplorerUrl(`tx/${signature}`));

      // 5.获取 Wormhole VAA
      // const emitterAddress = await getEmitterAddressSolana(
      //   WORMHOLE_SOLANA_TOKEN_BRIDGE.toString()
      // );
      // const transactionResponse = await connection.getTransaction(signature, {
      //   commitment: "confirmed",
      //   maxSupportedTransactionVersion: 2,
      // });
      // if (!transactionResponse) {
      //   console.log("TransactionResponse is null");
      // } else {
      //   const sequence = await parseSequenceFromLogSolana(transactionResponse);
      //   console.log("Emitter Address:", emitterAddress);
      //   console.log("Sequence:", sequence);
      // }
    } catch (error) {
      setSending(false);
      toast.error("Transaction failed: " + error);
      return;
    }

    if (bridgeBalance > 0) {
      // 3. 判断是否需要approve
      if (!isApproved) {
        let needApprove = false;
        try {
          const approveBalanceInWei = parseUnits(
            (balance + bridgeBalance).toString(),
            9
          );
          const allowance = await publicClient.readContract({
            address: EVM_WSOL_CONTRACT,
            abi: erc20Abi,
            functionName: "allowance",
            args: [
              wallet.evmAddress as `0x${string}`,
              TOKEN_BRIDGE_RELAYER_CONTRACT,
            ],
          });
          needApprove = allowance < approveBalanceInWei;
        } catch (error) {
          toast.error("Failed to get allowance");
          setSending(false);
          return;
        }

        if (needApprove) {
          try {
            await approveWSol({
              fromPubkey,
              contractAddress: EVM_WSOL_CONTRACT,
            });

            setIsApproved(true);
            await wait(2500); // 等待2.5s
          } catch (error) {
            toast.error("Failed to approve");
          }

          setSending(false);
          return;
        }
      }
      // 4.构建wormhole交易消息
      const userAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(fromPubkey.toBytes()))]
      );
      const contractAddressPadded = pad(toHex(toBytes(EVM_WSOL_CONTRACT)), {
        size: 32,
        dir: "left",
      });
      const contractAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [contractAddressPadded]
      );
      let ABI = ["function transfer(address to, uint256 value) returns (bool)"];
      const iface = parseAbi(ABI);
      const bridgeAmount = parseUnits(bridgeBalance.toString(), 9); // Sol 的精度为9
      const paras = encodeFunctionData({
        abi: iface,
        functionName: "transfer",
        args: [to, bridgeAmount],
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
      // 合并Wormhole交易消息和转账
      await sendSolanaWormholeTransaction({
        solanaPublicKey: fromPubkey,
        txPayload,
      });

      // //
      // formReset();
      // setSending(false);
      // onChange(false);
    } else {
      // try {
      //   const signature = await solanaSendTransaction(transaction, connection, {
      //     preflightCommitment: "confirmed",
      //     maxRetries: 3,
      //   });
      //   // 4. 处理交易结果
      //   handleTransactionSuccess(signature, getExplorerUrl(`tx/${signature}`));
      //   // 5. 重置表单 & 关闭对话框
      //   formReset();
      //   setSending(false);
      //   onChange(false);
      // } catch (error) {
      //   setSending(false);
      //   toast.error("Transaction failed: " + error);
      // }
    }

    formReset();
    setSending(false);
    onChange(false);
  };

  // TODO: 发送Solana转账: ETH -> Solana
  const transferEthBalanceToSolana = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {};

  // 发送Solana转账: Solana Token(USDT/USDC) -> Ethereum - 已完成
  const transferSplBalanceToEvm = async ({
    token,
    to,
    balance,
    bridgeBalance,
  }: {
    token: CurrencyEnum.USDT | CurrencyEnum.USDC;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log(
      `transferSplBalanceToEvm: Sending ${balance} + ${bridgeBalance} ${token} to ${to}`
    );

    // 只支持evm账户到evm账户

    // 判断余额是否足够
    let currentAccountBalance = 0; // 当前余额
    let tokenContract;
    switch (token) {
      case CurrencyEnum.USDC:
        tokenContract = EVM_USDC_CONTRACT;
        currentAccountBalance = accountBalance?.ethUsdcBalance;
        break;
      case CurrencyEnum.USDT:
      default:
        tokenContract = EVM_USDT_CONTRACT;
        currentAccountBalance = accountBalance?.ethUsdtBalance;
        break;
    }

    const sendBalance = balance + bridgeBalance;

    if (currentAccountBalance < sendBalance) {
      toast.error("Balance is not enough. ");
      return;
    }

    // 1. 执行交易前Loading...
    setSending(true);

    // 2. 构建交易消息
    const fromPubkey = new PublicKey(wallet.address);
    const balanceInWei = parseUnits(sendBalance.toString(), 6); // 在EVM中，USDT/USDC的精度为6
    const sourceAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(fromPubkey.toBytes()))]
    );

    const contractAddressPadded = pad(toHex(toBytes(tokenContract)), {
      size: 32,
      dir: "left",
    });
    const contractAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    const encodedFunction = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transfer",
          inputs: [
            {
              name: "to",
              type: "address",
            },
            {
              name: "value",
              type: "uint256",
            },
          ],
          outputs: [{ type: "bool" }],
        },
      ],
      functionName: "transfer",
      args: [to, balanceInWei],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(encodedFunction))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [sourceAddress, payloadPart]
    );

    // 3. 发送交易
    await sendSolanaWormholeTransaction({
      solanaPublicKey: fromPubkey,
      txPayload,
    });

    // 4. 交易完成
    formReset();
    setSending(false);
    onChange(false);
  };

  // 发送Solana转账: ETH -> Ethereum - 完成
  const transferEthBalanceToEvm = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log(
      `transferEthBalanceToEvm: Sending ${balance} + ${bridgeBalance} SOL to ${to}`
    );

    // 当前不支持聚合转账
    if (bridgeBalance > 0) {
      toast.error("Balance is not enough. ");
      return;
    }

    // 1. 执行交易前Loading...
    setSending(true);

    // 2. 构建交易消息
    const fromPubkey = new PublicKey(wallet.address);
    const balanceInWei = parseUnits(balance.toString(), 18); // 在EVM中，Sol的精度为18
    const sourceAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(fromPubkey.toBytes()))]
    );
    const targetAddressPadded = pad(toHex(toBytes(to)), {
      size: 32,
      dir: "left",
    });
    const targetAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [targetAddressPadded]
    );
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [targetAddress, balanceInWei, toHex(Buffer.from([0]))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [sourceAddress, payloadPart]
    );

    // 3. 发送交易
    await sendSolanaWormholeTransaction({
      solanaPublicKey: fromPubkey,
      txPayload,
    });

    // 4. 交易完成
    formReset();
    setSending(false);
    onChange(false);
  };

  // 发送Solana转账: Solana -> Solana
  const transferSolToSolana = async ({
    currency,
    to,
    balance,
    bridgeBalance,
  }: {
    currency: CurrencyEnum;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    switch (currency) {
      case CurrencyEnum.SOLANA:
        await transferSolBalanceToSolana({
          to,
          balance,
          bridgeBalance,
        });
        break;
      case CurrencyEnum.USDT:
      case CurrencyEnum.USDC:
        await transferSplBalanceToSolana({
          token: currency,
          to,
          balance,
          bridgeBalance,
        });
        break;
      case CurrencyEnum.ETHEREUM:
        await transferEthBalanceToSolana({
          to,
          balance,
          bridgeBalance,
        });
        break;
    }
  };

  // 发送Solana转账: Solana -> Ethereum
  const transferSolToEvm = async ({
    currency,
    to,
    balance,
    bridgeBalance,
  }: {
    currency: CurrencyEnum;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    switch (currency) {
      case CurrencyEnum.SOLANA:
        await transferSolBalanceToEvm({
          to,
          balance,
          bridgeBalance,
        });
        break;
      case CurrencyEnum.USDT:
      case CurrencyEnum.USDC:
        await transferSplBalanceToEvm({
          token: currency,
          to,
          balance,
          bridgeBalance,
        });
        break;
      case CurrencyEnum.ETHEREUM:
        await transferEthBalanceToEvm({
          to,
          balance,
          bridgeBalance,
        });
        break;
    }
  };

  // 发送Solana链交易
  const transferSolana = async ({
    currency,
    targetChain,
    to,
    balance,
    bridgeBalance,
  }: {
    currency: CurrencyEnum;
    targetChain: SupportChain;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    switch (targetChain) {
      case SupportChain.Solana:
        await transferSolToSolana({
          currency,
          to,
          balance,
          bridgeBalance,
        });
        break;

      case SupportChain.Ethereum:
        await transferSolToEvm({
          currency,
          to,
          balance,
          bridgeBalance,
        });
        break;
    }
  };

  // TODO: 发送Ethereum链交易
  const transferEthereum = async ({
    currency,
    targetChain,
    to,
    balance,
    bridgeBalance,
  }: {
    currency: CurrencyEnum;
    targetChain: SupportChain;
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {};

  const handleSend = async () => {
    if (sending) return;

    // 1.获取当前钱包连接的链
    const currentChain = wallet.chain;
    const _amount = parseFloat(amount);
    // 2.获取目标链
    const targetChain =
      toChain === "sol" ? SupportChain.Solana : SupportChain.Ethereum;

    // 3.判断转账的金额是否大于当前链的余额
    let currentChainBalance = 0;
    switch (fromChain) {
      case "sol":
        currentChainBalance = accountBalance?.solBalance;
        break;
      case "eth":
        currentChainBalance = accountBalance?.ethBalance;
        break;
      case "usdt":
        currentChainBalance =
          currentChain === SupportChain.Solana
            ? accountBalance?.solUsdtBalance
            : accountBalance?.ethUsdtBalance;
        break;
      case "usdc":
        currentChainBalance =
          currentChain === SupportChain.Solana
            ? accountBalance?.solUsdcBalance
            : accountBalance?.ethUsdcBalance;
        break;
    }

    let balance = 0;
    let bridgeBalance = 0;
    let gasFee = 0.01; // TODO: 这里需要动态计算真实的gas费
    if (_amount > currentChainBalance + gasFee) {
      // 优先从当前账户转账
      balance = parseFloat((currentChainBalance - gasFee).toFixed(3));
      bridgeBalance = parseFloat((_amount - balance).toFixed(3));
    } else {
      balance = parseFloat(_amount.toFixed(3));
    }

    switch (currentChain) {
      case SupportChain.Solana:
        await transferSolana({
          currency: fromChain as CurrencyEnum,
          targetChain,
          to: destination,
          balance,
          bridgeBalance,
        });
        break;
      case SupportChain.Ethereum:
        await transferEthereum({
          currency: fromChain as CurrencyEnum,
          targetChain,
          to: destination,
          balance,
          bridgeBalance,
        });
        break;
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <HandCoins className="h-5 w-5 pr-1" />
            Send
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="sm:max-w-m px-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-semibold">
            Transfer
          </AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <div className="flex flex-col gap-y-4 mt-2">
          <div className="flex flex-col gap-y-2">
            <Label className=" text-gray-500">You&apos;re sending</Label>
            <div className="rounded-lg border border-gray-700 p-2 flex items-center justify-between">
              <Select
                value={fromChain}
                onValueChange={(value) => setFromChain(value as CurrencyEnum)}
              >
                <SelectTrigger className="flex-1 py-6 border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CurrencyEnum.SOLANA}>
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/solana.svg"
                          alt="SOL"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">SOL</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CurrencyEnum.ETHEREUM}>
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/ethereum.svg"
                          alt="ETH"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">ETH</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CurrencyEnum.USDT}>
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/tether.png"
                          alt="USDT"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">USDT</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CurrencyEnum.USDC}>
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src="/usdc.png"
                          alt="USDC"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">USDC</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 border-l border-gray-500 gap-x-1 flex justify-end items-center">
                <Input
                  id="amount"
                  placeholder="0.0"
                  className="text-md text-right pr-1 border-0 focus:border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="text-gray-500 text-md">
                  {fromChain.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-x-3 text-sm text-gray-500">
              <span>
                Balance: {currentBalance} {fromChain.toUpperCase()}
              </span>
              <span
                className="text-primary cursor-pointer"
                onClick={() => setAmount(currentBalance)}
              >
                Max
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label className=" text-gray-500">To</Label>
            <Select value={toChain} onValueChange={setToChain}>
              <SelectTrigger className="w-full py-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sol">
                  <div className="flex gap-x-3 items-center">
                    <div className="hidden xl:block p-2 rounded-full bg-secondary">
                      <Image
                        src="/solana.svg"
                        alt="sol"
                        width={16}
                        height={16}
                      />
                    </div>
                    <span className="text-lg">SOL</span>
                  </div>
                </SelectItem>
                <SelectItem value="eth">
                  <div className="flex gap-x-3 items-center">
                    <div className="hidden xl:block p-2 rounded-full bg-secondary">
                      <Image
                        src="/ethereum.svg"
                        alt="sol"
                        width={16}
                        height={16}
                      />
                    </div>
                    <span className="text-lg">ETH</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            id="address"
            placeholder="Input destination address"
            className="py-6"
            value={destination}
            onChange={(e) => setDestination(e.target.value.trim())}
          />

          <div className="my-2 flex flex-col gap-y-2">
            <div className="flex justify-between items-center">
              <span>Total fee</span>
              <span className="text-gray-500">
                {(gasFee + transactionFee).toFixed(4)}{" "}
                {gasFeeToken.toUpperCase()}
              </span>
            </div>
            <div className="bg-secondary p-4 rounded-lg flex flex-col gap-y-2">
              <div className="flex justify-between items-center">
                <span>Transaction Fee:</span>
                <div className=" text-sm flex flex-col items-end">
                  <span className="text-md">
                    {transactionFee.toFixed(4)} {gasFeeToken.toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    = ${transactionAmount.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Gas Fee:</span>
                <div className=" text-sm flex flex-col items-end">
                  <span className="text-md">
                    {gasFee.toFixed(4)} {gasFeeToken.toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    = ${gasAmount.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AlertDialogFooter className="w-full justify-between xl:gap-x-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled || sending}
                  className="w-full"
                  size="lg"
                >
                  {sending && <Loading className="w-4 h-4 mr-1" />}
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
