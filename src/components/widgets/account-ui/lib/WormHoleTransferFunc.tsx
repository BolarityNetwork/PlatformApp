import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  APPROVE_BASE_AMOUNT,
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  SOLANA_USDC_CONTRACT,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
} from "@/config";
import { CONTRACTS } from "@certusone/wormhole-sdk";
import { IDL } from "@/anchor/setup";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import {
  getProvider,
  handleTransactionSuccess,
  hexStringToUint8Array,
  writeBigUint64LE,
} from "@/lib/utils";

import { useTransferSol } from "@/hooks/transfer/solanaTransfer";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useCluster } from "@/providers/cluster-provider";

import { toast } from "sonner";

import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  parseEther,
  parseUnits,
  toBytes,
  toHex,
} from "viem";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { useWidgetsProvider } from "@/providers/widgets-provider";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

function WormHoleTransferFunc() {
  const { getExplorerUrl } = useCluster();
  const {
    signTransaction: solanaSignTransaction,
    signAllTransactions: solanaSignAllTransactions,
    sendTransaction: solanaSendTransaction,
  } = useWallet();
  const { setIsOpen } = useWidgetsProvider();
  const { solAddress, CheckApproveTransfer } = useBolarityWalletProvider();
  const { connection } = useConnection();

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
  }): Promise<any> => {
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
      if (toAddress) {
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
      const confirm = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      console.log("confirm", confirm);

      handleTransactionSuccess(
        signature,
        getExplorerUrl(`tx/${signature}`),
        txMessage
      );

      if (signature && txMessage !== "Approve") {
        setIsOpen(false);
      }
      return signature;
    } catch (error: any) {
      toast.error(`${txMessage} Failed`, {
        description: `${error}`,
        duration: 10000,
      });
      setIsOpen(false);
    }
  };

  // 授权: WSOL - 完成
  const approveWSol = async () => {
    toast.info(`You need approved to ${TOKEN_BRIDGE_RELAYER_CONTRACT}`);
    const fromPubkey = new PublicKey(solAddress);
    // 发起授权
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(fromPubkey.toBytes()))]
    );
    const contractAddressPadded = pad(toHex(toBytes(EVM_WSOL_CONTRACT)), {
      size: 32,
      dir: "left",
    });
    const contractAddressParam = encodeAbiParameters(
      [{ type: "bytes32" }],
      [contractAddressPadded]
    );
    // let ABI = ["function approve(address to, uint256 tokenId)"];
    const ABI = ["function approve(address spender,uint256 amount)"];

    // 解析 ABI
    const iface = parseAbi(ABI);
    // 使用 encodeFunctionData 编码函数调用数据
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "approve",
      args: [TOKEN_BRIDGE_RELAYER_CONTRACT, APPROVE_BASE_AMOUNT],
      // args: [TOKEN_BRIDGE_RELAYER_CONTRACT, 0n],
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
    console.log("txPayload---", txPayload);
    const confirm = await sendSolanaWormholeTransaction({
      solanaPublicKey: fromPubkey,
      txPayload,
      txMessage: "Approve",
    });
    console.log("confirm", confirm);
    // toast.success(`You need approved to ${TOKEN_BRIDGE_RELAYER_CONTRACT}`);
    return confirm;
  };

  // 发送Solana转账: Solana Token(USDT/USDC) -> Solana - 完成
  // 发送Solana转账: Solana USDC -> Solana
  const solanaTransferSplBalanceToSolana = async ({
    toPubkey,
    balance,
  }: {
    toPubkey: PublicKey;
    balance: number;
  }) => {
    try {
      // 获取USDC代币地址
      const tokenMintPublicKey = new PublicKey(SOLANA_USDC_CONTRACT);
      const fromPubkey = new PublicKey(solAddress);
      // 获取发送方和接收方的关联账户地址
      const senderTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        fromPubkey
      );
      let recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        toPubkey
      );

      // 验证发送方账户
      if (!senderTokenAccount) {
        toast.error("发送方账户无效");
        return false;
      }

      // 如果接收方没有关联账户,则创建一个
      if (!recipientTokenAccount) {
        const created = await createAssociatedTokenAccount({
          payer: fromPubkey,
          associatedTokenAddress: toPubkey,
          owner: toPubkey,
          mint: tokenMintPublicKey,
        });

        if (!created) {
          toast.error("创建接收方账户失败");
          return false;
        }

        recipientTokenAccount = await getAssociatedTokenAddress(
          tokenMintPublicKey,
          toPubkey
        );

        if (!recipientTokenAccount) {
          toast.error("接收方账户无效");
          return false;
        }
      }

      // 创建转账交易
      const tx = new Transaction();

      // 获取最新区块哈希
      const { blockhash } = await connection.getRecentBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromPubkey;

      // 添加转账指令
      tx.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          fromPubkey,
          parseUnits(balance.toString(), 6) // USDC精度为6
        )
      );

      // 发送并确认交易
      const signature = await solanaSendTransaction(tx, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
      // toast.success("转账成功!");
      handleTransactionSuccess(
        signature,
        getExplorerUrl(`tx/${signature}`),
        "Transfer"
      );
      setIsOpen(false);
    } catch (error) {
      console.error("USDC转账错误: ", error);
      toast.error("转账失败: " + error);
    }
  };

  // 创建代币关联账户
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

  // 1.2 发送Solana转账: solana -> solana - 完成
  const mutation = useTransferSol({ address: new PublicKey(solAddress) });
  const SolanaTransferToSol = async (amount: number, address: string) => {
    try {
      const signature = await mutation.mutateAsync({
        destination: new PublicKey(address),
        amount: parseFloat(amount.toString()),
      });
      console.log("solanaTransfer");
      if (signature) {
        handleTransactionSuccess(
          signature,
          getExplorerUrl(`tx/${signature}`),
          "Transfer"
        );
      } else {
        toast.error("Transaction failed: ");
      }
    } catch (e: any) {
      toast.error("Transaction failed: " + e.message);
    } finally {
      setIsOpen(false);
    }
  };

  //   授权后执行
  const solanaTransferSolBalanceToSolana = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log("跳过approve---");

    try {
      if (!(await CheckApproveTransfer())) {
        const confirmApprove = await approveWSol();
        console.log("confirmApprove", confirmApprove);
        if (confirmApprove) {
          const intervalTime = setInterval(async () => {
            if (await CheckApproveTransfer()) {
              clearInterval(intervalTime);

              solanaTransferSolBalanceToEthAddress({
                to,
                balance,
                bridgeBalance,
              });
            }
          }, 1000);
        }
      } else {
        solanaTransferSolBalanceToEthAddress({
          to,
          balance,
          bridgeBalance,
        });
      }
    } catch (error) {
      console.log("error--approve--", error);
    }
  };
  //   solana调用 代理地址 eth. 向 solana地址 转账
  const solanaTransferSolBalanceToEthAddress = async ({
    to,
    balance,
    bridgeBalance,
  }: {
    to: string;
    balance: number;
    bridgeBalance: number;
  }) => {
    console.log("本链转账---跨区--balance--", balance);
    console.log("本链转账---跨区--bridgeBalance--", bridgeBalance);

    const fromPubkey = new PublicKey(solAddress);
    const toPubkey = new PublicKey(to);
    // 2. 初始化数据
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
    console.log("本链转账---跨区--balance--", balance);

    //   合并Wormhole交易消息和转账
    await sendSolanaWormholeTransaction({
      solanaPublicKey: fromPubkey,
      txPayload,
      txMessage: "Transfer",
      amount: balance,
      toAddress: to,
    });
  };

  // 发送Solana转账: Solana Token(USDT/USDC) -> Ethereum - 完成
  const solanaTransferSplBalanceToEvm = async ({
    token,
    to,
    balance,
  }: {
    token: CurrencyEnum.USDT | CurrencyEnum.USDC;
    to: string;
    balance: number;
  }) => {
    // 只支持evm账户到evm账户
    //    判断余额是否足够
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

    // 2. 构建交易消息
    const fromPubkey = new PublicKey(solAddress);
    const balanceInWei = parseUnits(balance.toString(), 6); // 在EVM中，USDT/USDC的精度为6
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
  };

  // 发送Solana转账: ETH -> Ethereum - 完成
  const solanaTransferEthBalanceToEvm = async ({
    to,
    bridgeBalance,
  }: {
    to: string;
    bridgeBalance: number;
  }) => {
    // 2. 构建交易消息
    const fromPubkey = new PublicKey(solAddress);
    const balanceInWei = parseEther(bridgeBalance.toString()); // 在EVM中，精度为18
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
  };
  return {
    sendSolanaWormholeTransaction,
    approveWSol,
    solanaTransferSplBalanceToSolana,
    SolanaTransferToSol,
    solanaTransferSplBalanceToEvm,
    solanaTransferEthBalanceToEvm,

    solanaTransferSolBalanceToSolana,
  };
}

export default WormHoleTransferFunc;
