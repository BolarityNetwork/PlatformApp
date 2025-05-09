"use client";
import { useEffect, useState, createContext, useContext } from "react";

import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { getUserAccountPublicKey } from "@/lib/utils";
import {
  DRIFT_PROGRAM_ID,
  DRIFT_ACCOUNT_ID,
  DRIFT_MARKET_INFO,
  CurrencyEnum,
  CLAIM_TOKEN_CONTRACT,
  // SOLANA_USDC_CONTRACT,
} from "@/config";
import { IDriftDataType } from "@/components/vaults/vaults-data";
import { decodeSpotMarket, decodeUser } from "@/lib/drift";
import { BN } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  AccountInfo,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import {
  // getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";

import { getSolTokenMintAddress } from "@/hooks/useAccount";
import { useCluster } from "@/providers/cluster-provider";
import { useConnection } from "@solana/wallet-adapter-react";

const defaultDriftBalance: IDriftDataType = {
  btc: 0,
  usdc: 0,
  sol: 0,
};
interface SolanaAccountBalanceContextType {
  solBalance: number;
  loading: boolean;
  error: string | null;
  solUsdcBalance: number;
  solBolBalance: number;
  solBtcBalance: number;
  driftBalance: IDriftDataType;
}

const SolanaAccountBalanceContext =
  createContext<SolanaAccountBalanceContextType>({
    solBalance: 0,
    loading: true,
    error: null,
    solUsdcBalance: 0,
    solBolBalance: 0,
    solBtcBalance: 0,
    driftBalance: defaultDriftBalance,
  });

export const useSolanaAccountBalance = () =>
  useContext(SolanaAccountBalanceContext);

type TokenListener = {
  mint: string;
  subscriptionId: number;
};

/**
 * 监听多个 SPL Token 的余额变化
 *
 * @param connection Solana 连接对象
 * @param walletAddress 用户的钱包地址
 * @param mintList 一组 mint 地址
 * @param onChange 回调函数，返回 { mint, amount } 对象
 * @returns 取消监听的清理函数
 */
export async function watchMultipleTokenBalances(
  connect: Connection,
  walletAddress: string,
  mintList: string[],
  onChange: (update: { mint: string; amount: number }) => void
): Promise<() => void> {
  const owner = new PublicKey(walletAddress);
  const listeners: TokenListener[] = [];
  console.log("connect", connect);
  for (const mintStr of mintList) {
    const mint = new PublicKey(mintStr);

    // const ata = await getAssociatedTokenAddress(mint, owner);
    const ata = getAssociatedTokenAddressSync(mint, owner, true);

    // 获取初始余额
    const accountInfo = await connect.getAccountInfo(ata);
    // console.log("accountInfo", accountInfo);
    if (accountInfo) {
      const parsed = unpackAccount(ata, accountInfo);
      onChange({ mint: mintStr, amount: Number(parsed.amount) });
    }

    // 设置 WebSocket 监听
    const subId = connect.onAccountChange(ata, (updatedAccountInfo) => {
      try {
        const parsed = unpackAccount(ata, updatedAccountInfo);
        onChange({ mint: mintStr, amount: Number(parsed.amount) });
      } catch (e) {
        console.error(`解析 ${mintStr} 时出错:`, e);
      }
    });

    listeners.push({ mint: mintStr, subscriptionId: subId });
  }

  // 返回取消所有监听的函数
  return () => {
    for (const { subscriptionId } of listeners) {
      connect.removeAccountChangeListener(subscriptionId);
    }
  };
}

export function UseSolanaAccountBalanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connection } = useConnection();

  const [solBalance, setSolBalance] = useState(0);
  const [solUsdcBalance, setSolUsdcBalance] = useState(0);
  const [solBolBalance, setSolBolBalance] = useState(0);
  const [solBtcBalance, setSolBtcBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { solAddress } = useBolarityWalletProvider();
  // const driftProgram = new PublicKey(DRIFT_PROGRAM_ID);
  const { cluster } = useCluster();

  const SOL_USDC_MINT_ADDRESS = getSolTokenMintAddress(
    CurrencyEnum.USDC,
    cluster.name
  );
  const SOL_BTC_MINT_ADDRESS = getSolTokenMintAddress(
    CurrencyEnum.BTC,
    cluster.name
  );

  const mintList = [
    // SOL_MINT_ADDRESS, // SOL (wrapped)
    SOL_USDC_MINT_ADDRESS,
    CLAIM_TOKEN_CONTRACT,
    SOL_BTC_MINT_ADDRESS,
  ];

  const [driftBalance, setDriftBalance] = useState(defaultDriftBalance);

  const getDriftUserStats = async (
    userInfo: AccountInfo<Buffer>,
    marketAddress: string
  ) => {
    try {
      const spots = decodeUser(userInfo?.data as Buffer);
      const market = await decodeSpotMarket(
        connection,
        new PublicKey(marketAddress)
      );
      console.log("spots", spots);
      console.log("market", market);
      // precision_decrease = 10^(19 - decimals)
      const precisionDecrease = new BN(10).pow(new BN(19 - market.decimals));
      const base = new BN(10).pow(new BN(market.decimals));

      // Compute final balances
      const results = spots
        .filter(
          (p) =>
            p.marketIndex === market.marketIndex && p.balanceType === "DEPOSIT"
        )
        .map((p) => {
          const interestAmount = p.scaledBalance
            .mul(market.cumulativeDepositInterest)
            .div(precisionDecrease);
          const whole = interestAmount.div(base);
          const frac = interestAmount
            .mod(base)
            .toString()
            .padStart(market.decimals, "0")
            .replace(/0+$/, "");
          const trueBalance = frac
            ? `${whole.toString()}.${frac}`
            : whole.toString();
          return {
            marketIndex: p.marketIndex,
            scaledBalance: p.scaledBalance.toString(),
            cumulativeDepositInterest:
              market.cumulativeDepositInterest.toString(),
            precisionDecrease: precisionDecrease.toString(),
            tokenAmount: interestAmount.toString(),
            trueBalance: trueBalance,
            openOrders: p.openOrders.toString(),
            openBids: p.openBids.toString(),
            openAsks: p.openAsks.toString(),
            cumulativeDeposits: p.cumulativeDeposits.toString(),
          };
        });
      return results;
    } catch (error) {
      console.error("Error decoding user account:", error);
      return [];
    }
  };

  const getDriftUserDeposit = async (userAccountInfo: AccountInfo<Buffer>) => {
    // Decode both
    const result_sol = await getDriftUserStats(
      userAccountInfo,
      DRIFT_MARKET_INFO.sol.market_pda
    );
    const result_btc = await getDriftUserStats(
      userAccountInfo,
      DRIFT_MARKET_INFO.btc.market_pda
    );
    const result_usdc = await getDriftUserStats(
      userAccountInfo,
      DRIFT_MARKET_INFO.usdc.market_pda
    );
    console.log("result_sol", result_sol);
    console.log("result_btc", result_btc);
    console.log("result_usdc", result_usdc);
    setDriftBalance({
      btc: parseFloat(result_btc?.[0]?.trueBalance) || 0,
      usdc: parseFloat(result_usdc?.[0]?.trueBalance) || 0,
      sol: parseFloat(result_sol?.[0]?.trueBalance) || 0,
    });
  };

  useEffect(() => {
    if (!solAddress) {
      setSolBalance(0);
      setSolUsdcBalance(0);
      setSolBolBalance(0);
      setSolBtcBalance(0);
      setDriftBalance(defaultDriftBalance);
      setLoading(false);
      return;
    }

    let subscriptionId: number | null = null;
    let subscriptionId2: number | null = null;
    let stopTokenWatching: (() => void) | null = null;
    let isMounted = true;

    setLoading(true);
    setError("");

    const fetchInitialBalances = async () => {
      try {
        const publicKey = new PublicKey(solAddress);
        const driftProgramKey = new PublicKey(DRIFT_PROGRAM_ID);
        const userAccount = await getUserAccountPublicKey(
          driftProgramKey,
          publicKey,
          DRIFT_ACCOUNT_ID
        );

        // SOL
        const initialBalance = await connection.getBalance(publicKey);
        if (!isMounted) return;
        setSolBalance(initialBalance / LAMPORTS_PER_SOL);

        // Drift
        const userAccountInfo = await connection.getAccountInfo(userAccount);
        if (!isMounted) return;
        if (!userAccountInfo) {
          setDriftBalance(defaultDriftBalance);
        } else {
          getDriftUserDeposit(userAccountInfo);
        }

        // 监听 SOL 余额
        subscriptionId = connection.onAccountChange(
          publicKey,
          (accountInfo) => {
            if (!isMounted) return;
            setSolBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
          }
        );

        // 监听 Drift 账户
        subscriptionId2 = connection.onAccountChange(userAccount, (res) => {
          if (!isMounted) return;
          getDriftUserDeposit(res);
        });

        // 监听 Token 余额
        stopTokenWatching = await watchMultipleTokenBalances(
          connection,
          solAddress,
          mintList,
          ({ mint, amount }) => {
            console.log("mint----", mint, "-----amount-----", amount);
            if (!isMounted) return;
            if (mint === SOL_USDC_MINT_ADDRESS) setSolUsdcBalance(amount / 1e6);
            if (mint === CLAIM_TOKEN_CONTRACT)
              setSolBolBalance(amount / LAMPORTS_PER_SOL);
            if (mint === SOL_BTC_MINT_ADDRESS) setSolBtcBalance(amount / 1e6);
          }
        );
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message ?? String(err));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialBalances();

    return () => {
      isMounted = false;
      if (subscriptionId != null)
        connection.removeAccountChangeListener(subscriptionId);
      if (subscriptionId2 != null)
        connection.removeAccountChangeListener(subscriptionId2);
      if (stopTokenWatching) stopTokenWatching();
    };
  }, [solAddress]);
  return (
    <SolanaAccountBalanceContext.Provider
      value={{
        solBalance,
        loading,
        error,
        driftBalance,
        solUsdcBalance,
        solBolBalance,
        solBtcBalance,
      }}
    >
      {children}
    </SolanaAccountBalanceContext.Provider>
  );
}
