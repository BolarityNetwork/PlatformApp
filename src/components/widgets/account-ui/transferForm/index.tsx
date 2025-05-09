import React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  CLAIM_TOKEN_CONTRACT,
  CurrencyEnum,
  EVM_WSOL_CONTRACT,
  SOLANA_USDC_CONTRACT,
  SupportChain,
  WORMHOLE_EVM_CHAIN_NAME,
  WORMHOLE_SOLANA_BRIDGE,
  WORMHOLE_SOLANA_TOKEN_BRIDGE,
} from "@/config";
import { transferNativeSol, ChainName } from "@certusone/wormhole-sdk";

import {
  FormatNumberWithDecimals,
  formatRecipientAddress,
  handleTransactionSuccess,
  isSolanaAddress,
  solanaPayloadHead,
} from "@/lib/utils";

import { useCluster } from "@/providers/cluster-provider";
import { Loading } from "@/components/ui/loading";

import { toast } from "sonner";

import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  parseAbi,
  parseUnits,
  toBytes,
  toHex,
  parseEther,
  isAddress,
  formatUnits,
} from "viem";
import { useSendTransaction } from "wagmi";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import SolTransferFunc from "./SolTransferFunc";

import EthTransferFunc from "./EthTransferFunc";
import { useWidgetsProvider } from "@/providers/widgets-provider";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import {
  Eth_Set_From_Chain_LIst,
  FromChainType,
  SetFromChainLIst,
} from "./form-data";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useMemo, useState } from "react";
import { useSolanaAccountBalance } from "@/providers/useSolanaAccountBalance";

const STATIC_AMOUNT = 0.01,
  validAmountFormat = /^(0|[1-9]\d*)(\.\d{1,9})?$/;
const TransferForm = ({
  accountBalance,
  solPublicKey,
  chainType,
  evmAddress,
}: {
  accountBalance: any;
  solPublicKey: string;
  chainType: string;
  evmAddress: string;
}) => {
  const { setIsOpen, initFromChain } = useWidgetsProvider();

  const { CheckApproveTransfer, ChainType: Chainlink_type } =
    useBolarityWalletProvider();
  const { solBalance, solBolBalance, solUsdcBalance } =
    useSolanaAccountBalance();
  console.log("ws-sol---balance", solBalance);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    locale: "en",
    defaultValues: {
      amount: 0,
      fromChain: initFromChain,
      network:
        chainType == SupportChain.Ethereum
          ? CurrencyEnum.ETHEREUM
          : CurrencyEnum.SOLANA,
      address: "",
    },
  });

  const { getExplorerUrl } = useCluster();
  const { sendTransactionAsync } = useSendTransaction();

  // 发送Solana转账: Solana -> Ethereum - 完成
  const solanaToEth = async (amount: number, address: string) => {
    const { ethSolBalance = 0 }: any = accountBalance;
    console.log("solanaToEth----", ethSolBalance);
    // 如果授权为0，则需要授权
    if (!(await CheckApproveTransfer())) {
      console.log("需要授权");
      const confirm = await approveWSol();
      console.log("confirm----0----", confirm);

      if (confirm) {
        const intervalTime = setInterval(async () => {
          if (await CheckApproveTransfer()) {
            clearInterval(intervalTime);
            JudgingBalance(amount, ethSolBalance, address);
          }
        }, 1000);
      }
    } else {
      console.log("不需要授权");
      JudgingBalance(amount, ethSolBalance, address);
    }
  };
  function JudgingBalance(
    amount: number,
    ethSolBalance: number,
    address: string
  ) {
    console.log("amount-----", amount);
    console.log("ethSolBalance-----", ethSolBalance);
    if (amount <= ethSolBalance) {
      // 先转本链
      console.log("先转本链");
      buildWormholeTransaction(amount, address);
    } else {
      // 如果本链余额不足，则需要先转本链+跨链
      console.log("先转跨链+本链");
      buildTransferSameChain(amount, address);
    }
  }

  const buildTransferSameChain = async (isAmount: number, toPubkey: string) => {
    const { ethSolBalance = 0 }: any = accountBalance;

    let amount = 0;
    if (isAmount >= solBalance) {
      amount = isAmount - ethSolBalance - STATIC_AMOUNT;
    } else {
      amount = isAmount - ethSolBalance;
    }
    console.log("amount--跨链--", amount);
    // 如果本链余额足够，直接发送交易消息
    const toEvmAddress = formatRecipientAddress(toPubkey);
    try {
      const transaction = await transferNativeSol(
        connection,
        WORMHOLE_SOLANA_BRIDGE,
        WORMHOLE_SOLANA_TOKEN_BRIDGE,
        new PublicKey(solPublicKey),
        parseUnits(amount.toString(), 9),
        toEvmAddress,
        WORMHOLE_EVM_CHAIN_NAME as ChainName
      );

      const signature = await solanaSendTransaction(transaction, connection, {
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      // 4. 处理交易结果
      handleTransactionSuccess(
        signature,
        getExplorerUrl(`tx/${signature}`),
        "Transfer"
      );
      if (ethSolBalance < isAmount && ethSolBalance) {
        buildWormholeTransaction(ethSolBalance, toPubkey);
      } else {
        setLoadingState(false);
        setIsOpen(false);
      }
    } catch (error) {
      toast.error("Transaction failed: " + error);
      if (ethSolBalance > isAmount && ethSolBalance) {
        setLoadingState(false);
        setIsOpen(false);
      }
    }
  };

  // 进行目标链转账
  const buildWormholeTransaction = async (amount: number, address: string) => {
    const userAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(new PublicKey(solPublicKey).toBytes()))]
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
    const bridgeAmount = parseUnits(amount.toString(), 9); // Sol 的精度为9
    const paras = encodeFunctionData({
      abi: iface,
      functionName: "transfer",
      args: [address, bridgeAmount],
    });
    const payloadPart = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    );
    const txPayload = encodeAbiParameters(
      [{ type: "bytes8" }, { type: "bytes32" }, { type: "bytes" }],
      [toHex(solanaPayloadHead), userAddress, payloadPart]
    );

    // 发送交易
    AllTransformFunc(txPayload, "Transform WSol");
  };
  // 交易状态
  function transactionStatus(hash: string) {
    if (hash) {
      setLoadingState(false);
      handleTransactionSuccess(hash, getExplorerUrl(`tx/${hash}`), "Transfer");
      setIsOpen(false);
    } else {
      toast.error("Transaction failed: ");
      setIsOpen(false);
    }
  }
  // 发送EVM转账
  const {
    ethereumTransferEthBalanceToSolana,
    ethereumTransferSplBalanceToEvm,
    ethTransferToSolBalanceToSolana,
    ethTransferToSolApprove,
    ethereumTransferSolBalanceToEth,
    ethereumCoontrollSolBalanceToEth,
    ethTransferCheckApprove,
  } = EthTransferFunc();

  // 2.1 发送EVM转账 eth -> eth
  const ethTransferToEvm = async (amount: number, address: string) => {
    const balanceInWei = parseEther(amount.toString()); // Convert ETH to wei
    const hash = await sendTransactionAsync({
      to: address as `0x${string}`,
      value: balanceInWei,
    });
    console.log("hash--发送EVM转账 eth -> eth--", hash);
    transactionStatus(hash);
  };

  // 2.3 发送EVM转账 wsol -> wsolconst

  const checkApproveEthToSol = async (amount: number, to: string) => {
      const aParsed = parseUnits(amount.toString(), 9); // 将数字提升到 9 位精度
      const bParsed = parseUnits(currentSolBalance_Eth.toString(), 9);

      const result = aParsed - bParsed; // 精确计算差值
      const formattedResult = formatUnits(result, 9); // 将结果转换回小数
      if (await CheckApproveTransfer()) {
        let amount_balance = 0;
        if (currentBalance_sol && currentBalance_sol <= STATIC_AMOUNT) {
          console.log("solCurrentBalance", currentBalance_sol);
          amount_balance =
            amount > currentSolBalance_Eth
              ? Number(formattedResult) - STATIC_AMOUNT
              : amount;
        } else {
          amount_balance =
            amount > currentSolBalance_Eth ? Number(formattedResult) : amount;
        }
        // 要不要判断 sol地址的sol余额，是否少等于0.001？如果sol余额少于0.001，就不跨桥转账，直接发送eth wsol交易
        if (amount_balance) {
          ethereumCoontrollSolBalanceToEth({
            to,
            balance: amount,
            currentBalance: currentSolBalance_Eth,
            solCurrentBalance: currentBalance_sol,
          });
        } else {
          ethereumTransferSolBalanceToEth({
            to,
            balance: currentSolBalance_Eth,
          });
        }
      } else {
        console.log("跨链转账--SOL---没有approve");
        ethTransferCheckApprove(to, amount, currentSolBalance_Eth, 0);
      }
    },
    /*****
     * @title
     * 1. eth 控制proxy address 转sol,先判断是否授权
     * 2. 根据 转账金额进行判断，如小于本链余额，则需要先转本链，大于本链余额+跨链
     * 3. 如果本链余额足够，则直接发送交易
     * 4. 如果本链余额不足，则需要先转本链+跨链，若本链余额不足，则直接跨桥
     *****/
    checkApproveEthSolToSol = async (amount: number, to: string) => {
      console.log("跨链转账--SOL---本链余额不足", currentBalance_sol);
      console.log("跨链转账--SOL---本链余额不足amount--", amount);
      // 如果本链余额为0.01，则需要先转链
      //如果本链余额不足，则需要先转本链+跨链
      const approveTransferAmount = await CheckApproveTransfer();
      console.log("approveTransferAmount", approveTransferAmount);
      //1. 旧账号读取approve额度偏少，新账号就没这问题。
      //2.在这基础上进行再添加判断，若approve额度为0或少于转账金额，则重新进行approve
      const approve_Amount =
        amount > Number(formatUnits(approveTransferAmount, 9));
      console.log("approve_Amount", approve_Amount);
      console.log("currentBalance_sol", currentBalance_sol);
      console.log("amount", amount);
      if (currentBalance_sol < amount) {
        if (approve_Amount) {
          ethTransferToSolApprove(amount, to, currentBalance_sol);
        } else if (currentBalance_sol <= STATIC_AMOUNT) {
          // 如果sol本链余额不足，则直接跨桥
          ethTransferToSolBalanceToSolana(amount, to);
        } else {
          // 如果sol本链余额足够，则发本链+跨链
          ethereumTransferEthBalanceToSolana({
            to,
            bridgeBalance: amount,
            evmAddress,
            currentBalance: currentBalance_sol,
          });
        }
      } else {
        if (approve_Amount) {
          ethTransferCheckApprove(to, amount, currentBalance_sol, 1);
        } else {
          //如果本链余额足够，则直接发送交易
          ethereumTransferEthBalanceToSolana({
            to,
            bridgeBalance: amount,
            evmAddress,
            currentBalance: currentBalance_sol,
          });
        }
      }
    };

  // 提交表单
  const onSubmit = (data: {
    amount: number;
    fromChain: string;
    network: string;
    address: string;
  }) => {
    console.log("Form Data:", data);
    const { amount, fromChain, network, address } = data;
    const { ethSolBalance = 0 }: any = accountBalance;
    console.log("currentBalance_sol000---", currentBalance_sol);
    setLoadingState(true);
    // 全局判断 是solana还是evm
    // 3. 生成转账金额
    // 逻辑：如果是本链到本链，优先转本链；
    //      如果是本链到他链，优先转他链，再转本链
    const globalChainType = chainType == SupportChain.Ethereum;
    const currentChainFrom = fromChain === CurrencyEnum.SOLANA;
    const currentChainTo = network === CurrencyEnum.ETHEREUM;
    if (globalChainType) {
      // console.log("跨链转账--ETH");
      if (fromChain === CurrencyEnum.ETHEREUM && currentChainTo) {
        console.log("本链转账--ETH---ETH");
        ethTransferToEvm(amount, address);
      } else if (currentChainFrom && currentChainTo) {
        console.log("本链转账--ETH-wsol->wsol");
        // 首先要判断 sol地址的sol余额，是否不足？如果不足，则需要先转本链
        console.log(
          "跨链转账--SOL----currentBalance_sol < 0.01---",
          ethSolBalance <= STATIC_AMOUNT
        );
        if (amount > ethSolBalance) {
          console.log("跨链转账--SOL-如果wsol余额--少于0.01");
          // 要检查是否有approve，没有就先执行approve后再调用ethereumCoontrollSolBalanceToEth
          checkApproveEthToSol(amount, address);
        } else {
          //   本链 发送EVM转账 wsol -> wsol
          ethereumTransferSolBalanceToEth({
            to: address,
            balance: amount,
          });
        }
      } else if (
        (fromChain === CurrencyEnum.USDT && currentChainTo) ||
        (fromChain === CurrencyEnum.USDC && currentChainTo)
      ) {
        console.log("当前ETH转账支持USDT和USDC");
        // 2.2 发送EVM转账 usdt -> usdt  usdc -> usdc
        ethereumTransferSplBalanceToEvm({
          balance: amount,
          to: address,
          token: fromChain,
        });
      } else if (
        fromChain === CurrencyEnum.SOLANA &&
        network === CurrencyEnum.SOLANA
      ) {
        console.log("控制sol地址--SOL");
        console.log("currentBalance_sol", currentBalance_sol);
        checkApproveEthSolToSol(amount, address);
      }
    } else {
      console.log("本链转账--SOL---network---", network);
      if (currentChainFrom && network === CurrencyEnum.SOLANA) {
        console.log("本链转账--SOL");
        console.log("本链转账-currentBalance-", currentBalance);
        console.log("本链转账-currentBalance_sol-SOL", currentBalance_sol);
        const aParsed = parseUnits(amount.toString(), 9); // 将数字提升到 9 位精度
        const bParsed = parseUnits(currentBalance_sol.toString(), 9);

        const isFixed = formatUnits(aParsed - bParsed, 9);
        console.log("本链转账---isFixed", isFixed);

        if (Number(isFixed) > 0) {
          solanaTransferSolBalanceToSolana({
            to: address,
            balance: currentBalance_sol - STATIC_AMOUNT,
            bridgeBalance: Number(isFixed),
          });
        } else {
          SolanaTransferToSol(amount, address);
        }
      } else if (currentChainFrom && network === CurrencyEnum.ETHEREUM) {
        console.log("跨链转账--ETH");
        solanaToEth(amount, address);
      } else if (fromChain === CurrencyEnum.ETHEREUM && currentChainTo) {
        console.log("跨链转账-操控eth账户转-ETH------");
        solanaTransferEthBalanceToEvm({
          to: address,
          bridgeBalance: amount,
        });
      } else if (
        fromChain === CurrencyEnum.USDC &&
        network === CurrencyEnum.SOLANA
      ) {
        //暂时不支持sol usdt
        console.log("本链转账--USDC");
        if (amount <= solUsdcBalance) {
          solanaTransferSplToken({
            toPubkey: new PublicKey(address),
            balance: amount,
            contract: SOLANA_USDC_CONTRACT,
            decimals: 6,
          });
        } else {
          console.log("🈷️本链余额不足，则需要先转本链+跨链");
          toast.error("Balance is not enough. ");
          setLoadingState(false);
        }
      } else if (fromChain === CurrencyEnum.USDT && currentChainTo) {
        console.log("本链转账--USDT");
        solanaTransferSplBalanceToEvm({
          token: CurrencyEnum.USDT,
          to: address,
          balance: amount,
        });
      } else if (fromChain === CurrencyEnum.USDC && currentChainTo) {
        console.log("本链转账--USDC");

        JudgingUsdcBalance(address, amount);
      } else if (
        fromChain === CurrencyEnum.BOLARITY &&
        network === CurrencyEnum.SOLANA
      ) {
        console.log("本链转账--BOLARITY");
        // 转BOLARITY代币地址
        solanaTransferSplToken({
          toPubkey: new PublicKey(address),
          balance: amount,
          contract: CLAIM_TOKEN_CONTRACT,
        });
      }
    }
  };

  const JudgingUsdcBalance = (to: string, balance: number) => {
    const { ethUsdcBalance = 0 }: any = accountBalance;
    if (balance <= ethUsdcBalance) {
      solanaTransferSplBalanceToEvm({
        token: CurrencyEnum.USDC,
        to,
        balance,
      });
    } else {
      // 如果本链余额不足，则需要先转本链+跨链
      console.log("🈷️本链余额不足，则需要先转本链+跨链");
      toast.error("Balance is not enough. ");
      setLoadingState(false);
    }
  };

  const { sendTransaction: solanaSendTransaction } = useWallet();
  const { connection } = useConnection();
  // 发送Solana Wormhole交易 - 完成
  const {
    solanaTransferSplBalanceToEvm,
    AllTransformFunc,
    approveWSol,
    SolanaTransferToSol,
    solanaTransferSolBalanceToSolana,
    solanaTransferSplToken,
    solanaTransferEthBalanceToEvm,
  } = SolTransferFunc();

  const [loadingState, setLoadingState] = useState(false);
  const watchAmount = watch("amount", 0);
  const watchFromChain = watch("fromChain", initFromChain);
  // 计算当前余额
  const currentBalance = useMemo(() => {
    if (!accountBalance) return 0;
    const {
      ethBalance = 0,
      ethUsdtBalance = 0,
      ethUsdcBalance = 0,
      ethSolBalance = 0,
      solEthBalance = 0,
    }: any = accountBalance;
    if (watchFromChain === CurrencyEnum.SOLANA) {
      return FormatNumberWithDecimals(solBalance + ethSolBalance, 4, 9);
    } else if (watchFromChain === CurrencyEnum.ETHEREUM) {
      return ethBalance + solEthBalance;
    } else if (watchFromChain === CurrencyEnum.USDT) {
      return ethUsdtBalance;
    } else if (watchFromChain === CurrencyEnum.USDC) {
      return FormatNumberWithDecimals(solUsdcBalance + ethUsdcBalance, 4, 6);
    } else if (watchFromChain === CurrencyEnum.BOLARITY) {
      return solBolBalance;
    }
  }, [watchFromChain, accountBalance]);

  // 计算当前余额 sol
  const currentBalance_sol = useMemo(() => {
    return solBalance;
  }, [solBalance]);
  // 计算当前余额 eth的sol
  const currentSolBalance_Eth = useMemo(() => {
    if (!accountBalance) return 0;
    const { ethSolBalance = 0 }: any = accountBalance;
    return ethSolBalance;
  }, [accountBalance]);

  // 选择链类型 若是eth则显示eth的链类型，否则显示sol的链类型
  const select_chain_type = useMemo(() => {
    return Chainlink_type == SupportChain.Ethereum
      ? Eth_Set_From_Chain_LIst
      : SetFromChainLIst;
  }, [Chainlink_type]);
  return (
    <div className="gap-y-4 md:mt-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={() => {
          console.log("onReset");
          setIsOpen(false);
        }}
      >
        {/* Sending Asset */}
        <div className="flex flex-col gap-y-2">
          <h2 className="text-gray-500">You're sending</h2>
          <div className="rounded-lg border border-gray-700 p-2 flex items-center justify-between">
            <Label htmlFor="asset" className="text-gray-500 hidden">
              fromChain
            </Label>
            <Select
              defaultValue={watch("fromChain")}
              onValueChange={(value: string) => setValue("fromChain", value)}
              {...register("fromChain", { required: true })}
            >
              <SelectTrigger className="flex-1 py-6 border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {select_chain_type.map((item: FromChainType) => (
                  <SelectItem value={item.value} key={item.value}>
                    <div className="flex gap-x-3 items-center">
                      <div className="hidden xl:block p-2 rounded-full bg-secondary">
                        <Image
                          src={item.iconUrl}
                          alt={item.text}
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className="text-lg">{item.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 border-l border-gray-500 gap-x-1 flex justify-end items-center">
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                step="any"
                autoComplete="off"
                encType="application/x-www-form-urlencoded"
                className="text-md text-right pr-1 border-0 focus:border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                {...register("amount", {
                  required: "Please enter an amount",
                  validate: (value: string) => {
                    const parsed = parseFloat(value);
                    // 前导零校验：允许 0.x，但不允许如 01, 012.1 - 0.1 abc
                    if (!validAmountFormat.test(value)) {
                      return "Invalid amount format";
                    }
                    if (isNaN(parsed) || parsed <= 0)
                      return "Please enter a valid amount";
                    if (parsed > currentBalance) return "Insufficient balance";
                    return true;
                  },
                })}
              />
              <Label
                className="text-gray-500 text-base md:text-md"
                htmlFor="amount"
              >
                {watchFromChain.toUpperCase()}
              </Label>
            </div>
          </div>
          {/* 校验提示 */}
          <div>
            {errors.amount && (
              <span className="text-red-500 text-sm float-right mt-1 ">
                {errors.amount.message}
              </span>
            )}
            {errors.fromChain && (
              <span className="text-red-500 float-right">
                Please select a valid fromChain
              </span>
            )}
          </div>
          <div className="flex justify-end gap-x-3 text-xs md:text-sm text-gray-500">
            <span>
              {"Balance: " +
                currentBalance +
                " " +
                watchFromChain?.toUpperCase()}
            </span>
            <span
              className="text-primary cursor-pointer"
              onClick={() => setValue("amount", currentBalance)}
            >
              Max
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label htmlFor="network" className="text-gray-500">
            To
          </Label>
          <Select
            defaultValue={watch("network")}
            onValueChange={(value: string) => setValue("network", value)}
            {...register("network", { required: true })}
          >
            <SelectTrigger className="w-full py-6">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CurrencyEnum.SOLANA}>
                <div className="flex gap-x-3 items-center">
                  <div className="hidden xl:block p-2 rounded-full bg-secondary">
                    <Image src="/solana.svg" alt="sol" width={16} height={16} />
                  </div>
                  <span className="text-lg">Solana Devnet</span>
                </div>
              </SelectItem>
              <SelectItem value={CurrencyEnum.ETHEREUM}>
                <div className="flex gap-x-3 items-center">
                  <div className="hidden xl:block p-2 rounded-full bg-secondary">
                    <Image
                      src="/ethereum.svg"
                      alt="eth"
                      width={16}
                      height={16}
                    />
                  </div>
                  <span className="text-lg">Ethereum Sepolia</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {errors.network && (
            <span className="text-red-500 float-right">
              Please select a valid toChain
            </span>
          )}
        </div>

        {/* Destination Address */}
        <div className="flex flex-col gap-y-2 mt-2">
          <Label htmlFor="address" className="text-gray-500">
            Destination Address
          </Label>
          <Input
            id="address"
            placeholder="Input destination address"
            className="py-6"
            autocomplete="off"
            encType="application/x-www-form-urlencoded"
            {...register("address", {
              required: true,
              validate: (value: any) => {
                const isSolana = watch("network") === "sol";
                const isEvm = watch("network") === "eth";

                if (isSolana) {
                  // 这里添加Solana地址的校验逻辑
                  return isSolanaAddress(value) || "Invalid Solana address";
                } else if (isEvm) {
                  return isAddress(value) || "Invalid EVM address";
                }
                return false;
              },
            })}
          />
          {errors.address && (
            <span className="text-red-500 float-right">
              {errors.address.message}
            </span>
          )}
        </div>

        {/* Fees */}
        <div className="my-2 flex flex-col gap-y-2">
          <div className="flex justify-between items-center">
            <span className="sm:text-base">Total fee</span>
            <span className="sm:text-xs text-gray-500">
              {(watchAmount * 0.00001).toFixed(4)}
              SOL
            </span>
          </div>

          <div className="bg-secondary p-4 rounded-lg flex flex-col gap-y-2">
            <div className="flex justify-between items-center">
              <span>Service Fee:</span>
              <div className="text-sm flex flex-col items-end">
                <span className="text-md">0</span>
                <span className="text-gray-500">
                  = ${(watchAmount * 0.00001).toFixed(4)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Gas Fee:</span>
              <div className=" text-sm flex flex-col items-end">
                <span className="text-md">
                  {(watchAmount * 0.00001).toFixed(4)} SOL
                </span>
                <span className="text-gray-500">
                  = ${(watchAmount * 0.00001).toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-x-3 text-sm text-gray-500">
          <Button
            type="reset"
            className="bg-gray-500 text-white px-4 py-2 rounded-md"
            // disabled={loadingState}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-md"
            disabled={
              loadingState ||
              (watchFromChain === CurrencyEnum.USDT &&
                watch("network") === CurrencyEnum.SOLANA) ||
              (watchFromChain === CurrencyEnum.BOLARITY &&
                watch("network") === CurrencyEnum.ETHEREUM)
            }
          >
            {loadingState ? <Loading className="w-4 h-4 mr-1" /> : "Send"}
          </Button>
        </div>
      </form>
      {/* <Button onClick={() => approveWSol()}>Approve01</Button> */}
    </div>
  );
};

export default TransferForm;
