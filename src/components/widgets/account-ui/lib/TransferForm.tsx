import React from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  CurrencyEnum,
  EVM_WSOL_CONTRACT,
  SupportChain,
  TOKEN_BRIDGE_RELAYER_CONTRACT,
  WORMHOLE_EVM_CHAIN_NAME,
  WORMHOLE_SOLANA_BRIDGE,
  WORMHOLE_SOLANA_TOKEN_BRIDGE,
} from '@/config'
import { transferNativeSol, ChainName } from '@certusone/wormhole-sdk'

import {
  formatRecipientAddress,
  handleTransactionSuccess,
  isSolanaAddress,
} from '@/lib/utils'

import { useMemo } from 'react'
import { useCluster } from '@/providers/cluster-provider'
import { Loading } from '@/components/ui/loading'

import { toast } from 'sonner'

import { publicClient } from '@/config/wagmi'
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
  parseEther,
  isAddress,
} from 'viem'
import { useSendTransaction } from 'wagmi'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey
} from "@solana/web3.js";
import WormHoleTransferFunc from './WormHoleTransferFunc'
import EthTransferFunc from './EthTransferFunc'
import { useWidgetsProvider } from '@/providers/widgets-provider'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from 'next/image'
import { SetFromChainLIst } from './data'

const STATIC_AMOUNT = 0.01


const TransferForm = ({

  accountBalance,
  solPublicKey,
  chainType,
  evmAddress
}: {
  accountBalance: any
  solPublicKey: string
  chainType: string
  evmAddress: string
}) => {
  const { setIsOpen, initFromChain } = useWidgetsProvider();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    getValues
  } = useForm({
    defaultValues: {
      amount: 0,
      fromChain: initFromChain,
      network: chainType == SupportChain.Ethereum ? CurrencyEnum.ETHEREUM : CurrencyEnum.SOLANA,
      address: '',
    },
  })



  const { getExplorerUrl } = useCluster()
  const { sendTransactionAsync } = useSendTransaction()


  // 发送Solana转账: Solana -> Ethereum - 完成
  const solanaToEth = async (amount: number, address: string) => {
    const { ethSolBalance = 0 }: any = accountBalance

    const allowance = await publicClient.readContract({
      address: EVM_WSOL_CONTRACT,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [evmAddress as `0x${string}`, TOKEN_BRIDGE_RELAYER_CONTRACT],
    })
    console.log('allowance', allowance)
    // 如果授权为0，则需要授权
    if (allowance === BigInt(0)) {
      const confirm = await approveWSol({
        fromPubkey: new PublicKey(solPublicKey),
        contractAddress: EVM_WSOL_CONTRACT,
      })
      console.log('confirm----0----', confirm)
      if (confirm) {
        JudgingBalance(amount, ethSolBalance, address)
      }
    } else {
      JudgingBalance(amount, ethSolBalance, address)
    }
  }
  function JudgingBalance(
    amount: number,
    ethSolBalance: number,
    address: string
  ) {
    if (amount < ethSolBalance && amount > STATIC_AMOUNT) {// 先转本链
      console.log('先转本链')
      buildWormholeTransaction(amount, address)

    } else {// 如果本链余额不足，则需要先转本链+跨链
      console.log('先转跨链+本链')
      buildTransferSameChain(amount, address)
    }

  }
  const buildTransferSameChain = async (isAmount: number, toPubkey: string) => {

    const { ethSolBalance = 0 }: any = accountBalance

    const amount = isAmount - ethSolBalance + STATIC_AMOUNT
    // 如果本链余额足够，直接发送交易消息
    const toEvmAddress = formatRecipientAddress(toPubkey)
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
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      })
      // 4. 处理交易结果
      handleTransactionSuccess(
        signature,
        getExplorerUrl(`tx/${signature}`),
        'Transfer'
      )
      if (ethSolBalance > STATIC_AMOUNT) {
        buildWormholeTransaction(ethSolBalance - STATIC_AMOUNT, toPubkey)
      } else {
        setLoadingState(false)
        setIsOpen(false)
      }

    } catch (error) {
      toast.error('Transaction failed: ' + error)
    }
    finally {
      setLoadingState(false)
      setIsOpen(false)
    }
  }


  // 进行目标链转账
  const buildWormholeTransaction = async (amount: number, address: string) => {
    console.log('buildWormholeTransaction---solPublicKey---', solPublicKey)

    const userAddress = encodeAbiParameters(
      [{ type: 'bytes32' }],
      [toHex(Buffer.from(new PublicKey(solPublicKey).toBytes()))]
    )
    const contractAddressPadded = pad(toHex(toBytes(EVM_WSOL_CONTRACT)), {
      size: 32,
      dir: 'left',
    })
    const contractAddress = encodeAbiParameters(
      [{ type: 'bytes32' }],
      [contractAddressPadded]
    )
    let ABI = ['function transfer(address to, uint256 value) returns (bool)']
    const iface = parseAbi(ABI)
    const bridgeAmount = parseUnits(amount.toString(), 9) // Sol 的精度为9
    const paras = encodeFunctionData({
      abi: iface,
      functionName: 'transfer',
      args: [address, bridgeAmount],
    })
    const payloadPart = encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'bytes' }],
      [contractAddress, BigInt(0), bytesToHex(toBytes(paras))]
    )
    const txPayload = encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes' }],
      [userAddress, payloadPart]
    )

    // 发送交易
    const confirm = await sendSolanaWormholeTransaction({
      solanaPublicKey: new PublicKey(solPublicKey),
      txPayload,
    })
    console.log('confirm', confirm)

  }
  // 交易状态
  function transactionStatus(hash: string) {
    if (hash) {
      setLoadingState(false)
      handleTransactionSuccess(hash, getExplorerUrl(`tx/${hash}`), 'Transfer')
      setIsOpen(false)
    } else {
      toast.error('Transaction failed: ')
      setIsOpen(false)
    }
  }
  // 发送EVM转账
  const {
    ethereumTransferEthBalanceToSolana,
    ethereumTransferSplBalanceToEvm,
    ethereumTransferSolBalanceToSolana,
    ethereumTransferSolBalanceToEth,
  } = EthTransferFunc()

  // 2.1 发送EVM转账 eth -> eth
  const ethTransferToEvm = async (amount: number, address: string) => {
    const balanceInWei = parseEther(amount.toString()) // Convert ETH to wei
    const hash = await sendTransactionAsync({
      to: address as `0x${string}`,
      value: balanceInWei,
    })
    console.log('hash--发送EVM转账 eth -> eth--', hash)
    transactionStatus(hash)
  }
  // 2.2 发送EVM转账 usdt -> usdt  usdc -> usdc
  const ethTransferToUsdt = async (
    balance: number,
    to: string,
    token: CurrencyEnum.USDT | CurrencyEnum.USDC
  ) => {
    const hash = await ethereumTransferSplBalanceToEvm({
      balance,
      to,
      token,
    })
    console.log('hash--发送EVM转账 usdt -> usdt--', hash)
    transactionStatus(hash)
  }
  // 2.3 发送EVM转账 wsol -> wsol
  const ethTransferToWsol = async (amount: number, address: string) => {
    const hash = await ethereumTransferSolBalanceToEth({
      to: address,
      balance: amount,
    })
    console.log('hash--发送EVM转账 wsol -> wsol--', hash)
    transactionStatus(hash)
  }
  // 2.4 发送EVM跨桥转账 wsol -> sol
  const ethTransferToSol = (amount: number, address: string) => {
    // const hash = await
    ethereumTransferSolBalanceToSolana({
      balance: amount,
      to: address,
    })
    // console.log('hash--ethTransferToSol--', hash)
    // transactionStatus(hash as string)
  }

  // 提交表单
  const onSubmit = (data: {
    amount: number
    fromChain: string
    network: string
    address: string
  }) => {
    console.log('Form Data:', data)
    const { amount, fromChain, network, address } = data
    setLoadingState(true)
    // 全局判断 是solana还是evm
    const globalChainType = chainType == SupportChain.Ethereum
    const currentChainFrom = fromChain === CurrencyEnum.SOLANA
    const currentChainTo = network === CurrencyEnum.ETHEREUM
    if (globalChainType) {
      console.log('跨链转账--ETH')
      if (fromChain === CurrencyEnum.ETHEREUM && currentChainTo) {
        console.log('本链转账--ETH---ETH')
        ethTransferToEvm(amount, address)
      } else if (currentChainFrom && currentChainTo) {
        console.log('本链转账--ETH-wsol->wsol')
        ethTransferToWsol(amount, address)
      } else if (
        (fromChain === CurrencyEnum.USDT && currentChainTo) ||
        (fromChain === CurrencyEnum.USDC && currentChainTo)
      ) {
        console.log('当前ETH转账支持USDT和USDC')
        ethTransferToUsdt(amount, address, fromChain)
      } else if (
        fromChain === CurrencyEnum.SOLANA &&
        network === CurrencyEnum.SOLANA
      ) {
        console.log('跨链转账--SOL')
        console.log('currentBalance_sol', currentBalance_sol)
        if (currentBalance_sol == 0.01) {// 如果本链余额为0.01，则需要先转链
          //如果本链余额不足，则需要先转本链+跨链
          ethTransferToSol(amount, address)
        } else {
          //如果本链余额足够，则直接发送交易
          ethereumTransferEthBalanceToSolana({
            to: address,
            bridgeBalance: amount,
            evmAddress,
            currentBalance: currentBalance_sol
          })
        }

      }
    } else {
      console.log('本链转账--SOL---network---', network)
      if (currentChainFrom && network === CurrencyEnum.SOLANA) {
        console.log('本链转账--SOL')
        SolanaTransferToSol(amount, address)
      } else if (currentChainFrom && network === CurrencyEnum.ETHEREUM) {
        console.log('跨链转账--ETH')
        solanaToEth(amount, address)
      } else if (fromChain === CurrencyEnum.USDC && network === CurrencyEnum.SOLANA) {
        console.log('本链转账--USDC')
        solanaTransferSplBalanceToSolana({
          toPubkey: new PublicKey(address),
          balance: amount,
        })
      }
    }
  }

  const { sendTransaction: solanaSendTransaction } = useWallet()
  const { connection } = useConnection()
  // 发送Solana Wormhole交易 - 完成
  const {
    sendSolanaWormholeTransaction,
    approveWSol,
    SolanaTransferToSol,
    solanaTransferSplBalanceToSolana,
  } = WormHoleTransferFunc()

  const [loadingState, setLoadingState] = useState(false)
  const watchAmount = watch('amount', 0)
  const watchFromChain = watch('fromChain', initFromChain)
  // 计算当前余额
  const currentBalance = useMemo(() => {
    if (!accountBalance) return 0
    const {
      solBalance = 0,
      solUsdtBalance = 0,
      solUsdcBalance = 0,
      ethBalance = 0,
      ethUsdtBalance = 0,
      ethUsdcBalance = 0,
      ethSolBalance = 0,
      solEthBalance = 0,
    }: any = accountBalance
    if (watchFromChain === CurrencyEnum.SOLANA) {
      return solBalance + ethSolBalance
    } else if (watchFromChain === CurrencyEnum.ETHEREUM) {
      return ethBalance + solEthBalance
    } else if (watchFromChain === CurrencyEnum.USDT) {
      return solUsdtBalance + ethUsdtBalance
    } else if (watchFromChain === CurrencyEnum.USDC) {
      return solUsdcBalance + ethUsdcBalance
    }
  }, [watchFromChain, accountBalance])

  // 计算当前余额 sol
  const currentBalance_sol = useMemo(() => {
    if (!accountBalance) return 0
    const {
      solBalance = 0,
    }: any = accountBalance
    return solBalance
  }, [accountBalance])



  return (
    <div className="gap-y-4 mt-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        onReset={() => {
          console.log('onReset')
          setIsOpen(false)
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
              defaultValue={watch('fromChain')}
              onValueChange={(value: string) => setValue('fromChain', value)}
              {...register('fromChain', { required: true })}
            >
              <SelectTrigger className="flex-1 py-6 border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>

                {
                  SetFromChainLIst.map(item =>
                    <SelectItem value={item.value}>
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
                  )
                }
              </SelectContent>
            </Select>
            <div className="flex-1 border-l border-gray-500 gap-x-1 flex justify-end items-center">
              <Input
                id="amount"
                placeholder="0.0"
                className="text-md text-right pr-1 border-0 focus:border-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                step="any"
                type="number"
                {...register('amount', {
                  required: true,
                  min: 0,
                  max: currentBalance,
                  validate: (value: any) =>
                    value <= currentBalance || 'Insufficient balance',
                })}
              />
              <Label className="text-gray-500 text-md" htmlFor="amount">
                {watchFromChain.toUpperCase()}
              </Label>
            </div>
          </div>
          {/* 校验提示 */}
          <div>
            {errors.fromChain && (
              <span className="text-red-500 float-right">
                Please select a valid fromChain
              </span>
            )}
            {errors.amount && (
              <span className="text-red-500 float-right">
                {errors.amount.type === 'max' ||
                  errors.amount.type === 'validate'
                  ? 'Insufficient balance'
                  : 'Please enter a valid amount'}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-x-3 text-sm text-gray-500">
            <span>
              {'Balance: ' +
                currentBalance +
                ' ' +
                watchFromChain.toUpperCase()}
            </span>
            <span
              className="text-primary cursor-pointer"
              onClick={() => setValue('amount', currentBalance)}
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
            defaultValue={watch('network')}
            onValueChange={(value: string) => setValue('network', value)}
            {...register('network', { required: true })}
          >
            <SelectTrigger className="w-full py-6">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CurrencyEnum.SOLANA}>
                <div className="flex gap-x-3 items-center">
                  <div className="hidden xl:block p-2 rounded-full bg-secondary">
                    <Image
                      src="/solana.svg"
                      alt="sol"
                      width={16}
                      height={16}
                    />
                  </div>
                  <span className="text-lg">SOLANA</span>
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
                  <span className="text-lg">ETHEREUM</span>
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
            {...register('address', {
              required: true,
              validate: (value: any) => {
                const isSolana = watch('network') === 'sol';
                const isEvm = watch('network') === 'eth';

                if (isSolana) {
                  // 这里添加Solana地址的校验逻辑
                  return isSolanaAddress(value) || 'Invalid Solana address';
                } else if (isEvm) {
                  return isAddress(value) || 'Invalid EVM address';
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
            <span>Total fee</span>
            <span className="text-gray-500">
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
            disabled={loadingState}
          >
            {loadingState ? <Loading className="w-4 h-4 mr-1" /> : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TransferForm
