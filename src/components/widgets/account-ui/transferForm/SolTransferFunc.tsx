import {
  APPROVE_BASE_AMOUNT,
  CurrencyEnum,
  EVM_USDC_CONTRACT,
  EVM_USDT_CONTRACT,
  EVM_WSOL_CONTRACT,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
} from "@/config";

import { solanaPayloadHead } from "@/lib/utils";

import {
  useTransferSol,
  useTransferSolToken,
} from "@/hooks/transfer/solanaTransfer";
import { PublicKey } from "@solana/web3.js";

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

import { useWidgetsProvider } from "@/providers/widgets-provider";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";

import { useDappInitProgram } from "@/hooks/transfer/solMethod";

function SolTransferFunc() {
  const { setIsOpen } = useWidgetsProvider();
  const { solAddress, CheckApproveTransfer } = useBolarityWalletProvider();

  const { initialize } = useDappInitProgram();

  // send message to contract
  const AllTransformFunc = async (
    message: string,
    title: string,
    isReturn = false
  ) => {
    const solPublicKey = new PublicKey(solAddress);
    try {
      const signature = await initialize.mutateAsync({
        message,
        solPublicKey,
        title,
      });

      console.log("signature", signature);

      // 只有在不需要返回签名的情况下才关闭弹窗
      if (signature && !isReturn) {
        setIsOpen(false);
      }

      // 如果需要返回签名，则返回签名
      if (isReturn) {
        return signature;
      }
    } catch (e: any) {
      console.error("Transaction error:", e);
      toast.error(`${title} failed`, {
        description: e.toString().slice(0, 100),
        duration: 5000,
      });

      // 出错时总是关闭弹窗
      setIsOpen(false);

      // 如果需要返回结果，则返回 null 表示失败
      if (isReturn) {
        return null;
      }
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
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
    );
    console.log("txPayload---", txPayload);

    return AllTransformFunc(txPayload, "Approve", true);
  };

  // 发送Solana转账: Solana Token(USDT/USDC) -> Solana - 完成
  // 发送Solana转账: Solana USDC -> Solana
  // 发送Solana转账: BOLARITY -> SOLANA
  const mutation_token = useTransferSolToken({
    solPublicKey: new PublicKey(solAddress),
  });

  const solanaTransferSplToken = async ({
    toPubkey,
    balance,
    contract,
    decimals = 9,
  }: {
    toPubkey: PublicKey;
    decimals?: number;
    balance: number;
    contract: String;
  }) => {
    console.log("balance", balance);
    // 获取USDC代币地址
    const tokenMintPublicKey = new PublicKey(contract);
    try {
      const signature = await mutation_token.mutateAsync({
        destination: toPubkey,
        amount: balance,
        tokenMintPublicKey,
        decimals,
      });
      console.log("tranfer bolarity--", signature);
      if (signature) {
        setIsOpen(false);
      }
    } catch (error) {
      setIsOpen(false);
      console.error("transfer failed: ", error);
      toast.error("transfer failed: " + error);
    }
  };

  // 1.2 发送Solana转账: solana -> solana - 完成
  const mutation = useTransferSol({ address: new PublicKey(solAddress) });
  const SolanaTransferToSol = async (amount: number, address: string) => {
    try {
      const signature = await mutation.mutateAsync({
        destination: new PublicKey(address),

        amount,
      });
      console.log("solanaTransfer");
      if (signature) {
        setIsOpen(false);
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
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
    );

    //   合并Wormhole交易消息和转账
    try {
      const signature = await initialize.mutateAsync({
        message: txPayload,
        solPublicKey: fromPubkey,
        title: "ETH Transfer Sol",
      });

      console.log("signature", signature);

      if (signature) {
        if (balance) {
          console.log("hhhhhh");
          // 间隔2s原因是：考虑到其他钱包插件，不能连续多次操作
          setTimeout(() => {
            SolanaTransferToSol(balance, to);
          }, 2000);
        } else {
          setIsOpen(false);
        }
      }
    } catch (e) {
      console.log("e----");
      setIsOpen(false);
    }
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
    let tokenContract,
      TransformTitle = "";
    const functionName = "transfer";
    switch (token) {
      case CurrencyEnum.USDC:
        tokenContract = EVM_USDC_CONTRACT;
        TransformTitle = "USDC";
        break;
      case CurrencyEnum.USDT:
      default:
        tokenContract = EVM_USDT_CONTRACT;
        TransformTitle = "USDT";
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
      functionName,
      args: [to, balanceInWei],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(encodedFunction))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), sourceAddress, payloadPart]
    );

    // 3. 发送交易
    AllTransformFunc(txPayload, `${functionName + " " + TransformTitle}`);
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
    console.log("balanceInWei--", balanceInWei);
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      // [targetAddress, BigInt(balanceInWei), toHex(Buffer.from([0]))]
      [targetAddress, BigInt(balanceInWei), toHex(Buffer.alloc(0))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), sourceAddress, payloadPart]
    );

    // 3. 发送交易
    AllTransformFunc(txPayload, "Transform ETH");

    // 4. 交易完成
  };
  return {
    approveWSol,
    SolanaTransferToSol,
    solanaTransferSplBalanceToEvm,
    solanaTransferEthBalanceToEvm,
    solanaTransferSolBalanceToSolana,
    solanaTransferSplToken,
    AllTransformFunc,
  };
}

export default SolTransferFunc;
