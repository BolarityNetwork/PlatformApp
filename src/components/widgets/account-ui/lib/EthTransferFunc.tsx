import { serialize } from 'borsh'

import {
    BOLARITY_EVM_CONTRACT,
    BOLARITY_SOLANA_CONTRACT,
    CurrencyEnum,
    EVM_USDC_CONTRACT,
    EVM_USDT_CONTRACT,
    EVM_WSOL_CONTRACT,
    TOKEN_BRIDGE_RELAYER_CONTRACT,
    UNI_PROXY,
} from '@/config'
import { tryNativeToHexString } from '@certusone/wormhole-sdk'

import { deriveAddress } from '@certusone/wormhole-sdk/lib/cjs/solana'
import { toast } from 'sonner'

import {
    handleTransactionSuccess,
    hexStringToUint8Array,
    rightAlignBuffer,
    sha256,
    sliceBuffer,
    writeBigUint64LE,
    writeUInt16LE,
} from '@/lib/utils'

import { PublicKey } from '@solana/web3.js'

import { useWriteContract, Config, useConnectorClient } from 'wagmi'

import { encodeAbiParameters, parseUnits, toHex } from 'viem'

import { providers } from 'ethers'
import { useMemo } from 'react'
import type { Account, Chain, Client, Transport } from 'viem'
import {
    APPROVE_BRIDGE_RELAYER_ABI,
    ETH_TRANSFER_SOL_TO_SOL_ABI,
    ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
    TOKEN_BRIDGE_RELAYER_ABI,
} from '@/abis/EthSolBridgeSol'
import { useWidgetsProvider } from '@/providers/widgets-provider'
import { useCluster } from '@/providers/cluster-provider'
export function clientToSigner(client: Client<Transport, Chain, Account>) {
    const { account, chain, transport } = client
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    const provider = new providers.Web3Provider(transport, network)
    const signer = provider.getSigner(account.address)
    return signer
}

/** Action to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { data: client } = useConnectorClient<Config>({ chainId })
    return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}

function EthTransferFunc() {
    const {
        data: ethToSolhash,
        isPending,
        writeContract,
        writeContractAsync,
    } = useWriteContract()
    const { getExplorerUrl } = useCluster()
    // 交易状态提示
    function transactionStatus(hash: string) {
        handleTransactionSuccess(hash, getExplorerUrl(`tx/${hash}`), 'Transfer')
    }

    const { setIsOpen } = useWidgetsProvider()

    // TODO: 发送ETH转账:  eth控制sol地址转sol
    const ethereumTransferEthBalanceToSolana = async ({
        to,
        bridgeBalance,
        evmAddress,
        currentBalance,
    }: {
        to: string
        bridgeBalance: number
        evmAddress: string
        currentBalance: number
    }) => {
        const STATIC_AMOUNT = 0.01
        const amount =
            bridgeBalance > currentBalance
                ? currentBalance - STATIC_AMOUNT
                : bridgeBalance

        const amount_sol = bridgeBalance - currentBalance + STATIC_AMOUNT
        const amountInWei = parseUnits(amount.toString(), 9) // Convert ETH to wei
        const destinationPublicKey = new PublicKey(to)

        // 2. 构建交易消息
        const HELLO_WORLD_PID = new PublicKey(BOLARITY_SOLANA_CONTRACT)
        const realForeignEmitterChain = 10002
        const paras = sliceBuffer(sha256('transfer'), 0, 8)
        const encodedParams = Buffer.concat([paras, writeBigUint64LE(amountInWei)])

        const ethAddress = rightAlignBuffer(
            Buffer.from(hexStringToUint8Array(evmAddress))
        )

        const AccountMeta = {
            array: {
                type: { struct: { writeable: 'bool', is_signer: 'bool' } },
            },
        }
        const RawDataSchema = {
            struct: {
                chain_id: 'u16',
                caller: { array: { type: 'u8', len: 32 } },
                programId: { array: { type: 'u8', len: 32 } },
                acc_count: 'u8',
                accounts: {
                    array: {
                        type: {
                            struct: {
                                key: { array: { type: 'u8', len: 32 } },
                                isWritable: 'bool',
                                isSigner: 'bool',
                            },
                        },
                    },
                },
                paras: { array: { type: 'u8' } },
                acc_meta: { array: { type: 'u8' } },
            },
        }

        const encodeMeta = serialize(AccountMeta, [
            { writeable: true, is_signer: true },
            { writeable: true, is_signer: false },
        ])
        const realForeignEmitter = deriveAddress(
            [
                Buffer.from('pda'),
                (() => {
                    return writeUInt16LE(realForeignEmitterChain)
                })(),
                ethAddress,
            ],
            HELLO_WORLD_PID
        )
        const RawData = {
            chain_id: realForeignEmitterChain,
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
        }
        const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData))

        // 3. 发送交易
        writeContract(
            {
                address: BOLARITY_EVM_CONTRACT,
                abi: UNI_PROXY.abi,
                functionName: 'sendMessage',
                args: [toHex(RawDataEncoded)],
            },
            {
                onSuccess: (hash) => {
                    console.log('hash--ethereumTransferEthBalanceToSolana--', hash)
                    console.log('isPending---', isPending)
                    console.log('ethToSolhash', ethToSolhash)
                    handleTransactionSuccess(
                        hash,
                        `https://sepolia.etherscan.io/tx/${hash}`
                    )
                    if (bridgeBalance - currentBalance > 0) {
                        console.log('amount - bridgeBalance > 0')
                        console.log('执行第二步')
                        console.log('执行第二步----', amount_sol)

                        ethereumTransferSolBalanceToSolana({
                            to,
                            balance: amount_sol,
                        })
                    } else if (bridgeBalance - currentBalance < 0) {
                        console.log('执行第三步')
                        console.log('执行第三步----', amount)
                        setIsOpen(false)
                    }
                },
                onError: (error) => {
                    toast.error('Transaction failed: ' + error.toString().substring(0, 100))
                    setIsOpen(false)
                },

            }
        )
    }

    // 发送ETH转账: Eth Token(USDT/USDC) > EVM
    const ethereumTransferSplBalanceToEvm = async ({
        token,
        to,
        balance,
    }: {
        token: CurrencyEnum.USDT | CurrencyEnum.USDC
        to: string
        balance: number
    }) => {
        // 判断余额是否足够
        let tokenContract
        switch (token) {
            case CurrencyEnum.USDC:
                tokenContract = EVM_USDC_CONTRACT
                break
            case CurrencyEnum.USDT:
            default:
                tokenContract = EVM_USDT_CONTRACT
                break
        }

        // 2. 发送交易
        const hash = await writeContractAsync({
            abi: ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI,
            address: tokenContract,
            functionName: 'transfer',
            args: [to, parseUnits(balance.toString(), 6)],
        })
        console.log('hash--ethereumTransferSplBalanceToEvm--', hash)
        return hash
    }
    //  发送ETH转账: Sol -> solana  Wormhole交易 - 完成

    async function ethereumTransferSolBalanceToSolana({
        to,
        balance,
    }: {
        to: string
        balance: number
    }) {
        const amount = parseUnits(balance.toString(), 9) // Convert ETH to wei
        const byte32Address = tryNativeToHexString(to, 1)
        const targetRecipient = encodeAbiParameters(
            [{ type: 'bytes32' }],
            [toHex(Buffer.from(hexStringToUint8Array(byte32Address)))]
        )

        // 每次跨桥交易前，都需要approve
        writeContract(
            {
                address: EVM_WSOL_CONTRACT,
                abi: APPROVE_BRIDGE_RELAYER_ABI,
                functionName: 'approve',
                args: [TOKEN_BRIDGE_RELAYER_CONTRACT, amount],
            },
            {
                onSuccess: (approeveHash) => {
                    console.log('approeveHash--approve--', approeveHash)

                    if (approeveHash) {
                        writeContract(
                            {
                                address: TOKEN_BRIDGE_RELAYER_CONTRACT,
                                abi: TOKEN_BRIDGE_RELAYER_ABI,
                                functionName: 'transferTokensWithRelay',
                                args: [EVM_WSOL_CONTRACT, amount, 0, 1, targetRecipient, 0],
                            },
                            {
                                onSuccess: (hash) => {
                                    console.log('hash--跨桥交易--', hash)
                                    transactionStatus(hash.toString())
                                    setIsOpen(false)
                                },
                                onError: (error) => {
                                    console.log('error--跨桥交易--', error)
                                    setIsOpen(false)
                                    toast.error('Transaction failed: ' + error.toString().substring(0, 100))
                                },
                            }
                        )
                    }
                },
                onError: (error) => {
                    console.log('error--approve--', error)
                    setIsOpen(false)
                    toast.error('Transaction failed: ' + error.toString().substring(0, 100))
                },
            }
        )
    }

    // 发送ETH转账: wsol -> wsol
    async function ethereumTransferSolBalanceToEth({
        to,
        balance,
    }: {
        to: string
        balance: number
    }) {
        // 2. 发送交易
        const hash = await writeContractAsync({
            abi: ETH_TRANSFER_SOL_TO_SOL_ABI,
            address: EVM_WSOL_CONTRACT,
            functionName: 'transfer',
            args: [to, parseUnits(balance.toString(), 9)],
        })
        console.log('hash--ethereumTransferSplBalanceToEvm--', hash)
        return hash
    }

    return {
        ethereumTransferEthBalanceToSolana,
        ethereumTransferSplBalanceToEvm,
        ethereumTransferSolBalanceToSolana,
        ethereumTransferSolBalanceToEth,
    }
}

export default EthTransferFunc
