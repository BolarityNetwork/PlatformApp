'use client'
import { cn } from '@/lib/utils'
import Image from 'next/image'

import { useWidgetsProvider } from '@/providers/widgets-provider'
import { useEffect, useState } from 'react'
import { useLocalStorage } from '@solana/wallet-adapter-react'

const WalletLogo = ({ ChainType = null }: { ChainType: string | null }) => {
  const [getIcon, _] = useLocalStorage('BOLARITY_WALLET_ICON', null)
  const { getUrl } = useWidgetsProvider()
  const [useImg, setUserImg] = useState('/phantom.svg')

  useEffect(() => {
    if (getIcon) {
      setUserImg(getIcon)
    }
    if (getUrl) {
      setUserImg(getUrl)
    }
  }, [getIcon, getUrl])

  return (
    <div
      className={cn(
        'rounded-full w-[64px] h-[64px]  flex items-center justify-center ',
        !ChainType && 'opacity-60'
      )}
    >
      <Image
        src={useImg}
        alt="wallet_icon_bolarity"
        unoptimized
        width={40}
        height={40}
      />
    </div>
  )
}

export default WalletLogo
