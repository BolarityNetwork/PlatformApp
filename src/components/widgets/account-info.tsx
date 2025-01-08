import { SupportChain } from '@/config'
import { ellipsify } from '@/lib/utils'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Send, HandCoins } from 'lucide-react'

import {
  WalletLogo,
  CopyButton,
  AccountBalance,
  ActiveEvmAccountButton,
  ActiveSolanaAccountBtn,

  SendModal,
  QrCodeModal,
} from './account-ui'
import { Separator } from '../ui/separator'
import { useBolarityWalletProvider } from '@/providers/bolarity-wallet-provider'
import { useGetBalance } from '@/hooks/useAccount'
import { useWidgetsProvider } from '@/providers/widgets-provider'
import { useState } from 'react'

export const AccountInfo = () => {
  const { ChainType, solAddress, evmAddress } = useBolarityWalletProvider()
  const { setIsOpen } = useWidgetsProvider()

  const activeSolanaAccount = useMemo(() => {
    if (ChainType === SupportChain.Ethereum && !solAddress) return true
    return false
  }, [solAddress, ChainType]),
    activeEvmAccount = useMemo(() => {
      if (ChainType === SupportChain.Solana && !evmAddress) return true
      return false
    }, [evmAddress, ChainType])

  const { data: accountBalance } = useGetBalance()
  const [isReceive, setIsReceive] = useState(false);

  return (
    <div className="h-auto lg:h-16 flex flex-col lg:flex-row items-center gap-y-4 gap-x-4 md:gap-x-6 xl:gap-x-12">
      <div className="flex flex-row gap-x-4 items-center">
        <WalletLogo
          ChainType={ChainType || null}
          isShow={ChainType == SupportChain.Ethereum}
        />
        <div className="flex flex-col items-center lg:items-start gap-y-2">
          <p className="text-sm text-muted-foreground">Total portfolio value</p>
          <AccountBalance />
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Solana address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {(solAddress && ellipsify(solAddress)) || '-'}
          </p>
          <CopyButton text={solAddress || ''} />
        </div>
      </div>
      <Separator orientation="vertical" className="hidden md:block" />
      <div className="flex flex-col items-center lg:items-start gap-y-2">
        <p className="text-sm text-muted-foreground text-center lg:text-left">
          Evm address
        </p>
        <div className="flex items-center gap-x-3">
          <p className="text-2xl font-bold">
            {(evmAddress && ellipsify(evmAddress)) || '-'}
          </p>
          <CopyButton text={evmAddress || ''} />
        </div>
      </div>

      <div className="flex-1 flex justify-between lg:justify-end gap-x-4">
        {/* 激活evm账户 */}
        {activeEvmAccount && <ActiveEvmAccountButton solAddress={solAddress} />}

        {/* 激活sol账户 */}
        {activeSolanaAccount && (
          <ActiveSolanaAccountBtn evmAddress={evmAddress} />
        )}


        {
          ChainType &&

          <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              <Send className="h-5 w-5 pr-1" />
              Send
            </Button>

            <Button variant="outline" size="sm" onClick={() => setIsReceive(true)}>
              <HandCoins className="h-5 w-5 pr-1" />
              Receive
            </Button>
          </>
        }
        <SendModal
          accountBalance={accountBalance}
          ChainType={ChainType}
          solAddress={solAddress}
          evmAddress={evmAddress}
        />


        {
          // 二维码
          ChainType &&
          <QrCodeModal
            address={ChainType == SupportChain.Ethereum ? evmAddress : solAddress}
            open={isReceive}
            onOpenChange={(open) => {
              setIsReceive(open);
            }}
          />
        }
      </div>
    </div>
  )
}
