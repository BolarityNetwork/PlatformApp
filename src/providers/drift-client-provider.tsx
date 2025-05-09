"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { DriftClient, DriftClientConfig, IWallet } from "@drift-labs/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

import { getAssociatedTokenAddress } from "@solana/spl-token";

export const getTokenAddress = (
  mintAddress: string,
  userPubKey: string
): Promise<PublicKey> => {
  return getAssociatedTokenAddress(
    new PublicKey(mintAddress),
    new PublicKey(userPubKey)
  );
};

interface DriftClientProviderContextType {
  driftClient: DriftClient | null;
  initializing: boolean;
  error: string | null;
  checkDriftUserStats: () => Promise<boolean>;
  createDriftUserAccount: () => Promise<string>;
}
const DriftClientProviderContext =
  createContext<DriftClientProviderContextType>({
    driftClient: null,
    initializing: false,
    error: null,
    createDriftUserAccount: async () => "",
    checkDriftUserStats: async () => false,
  });

export const useDriftClientProviderContext = () =>
  useContext(DriftClientProviderContext);
const env = "devnet"; // or "mainnet-beta"

export function DriftClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [driftClient, setDriftClient] = useState<DriftClient | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initDrift = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      if (
        !wallet?.publicKey ||
        !wallet?.signTransaction ||
        !wallet?.signAllTransactions
      ) {
        setError("钱包未完全连接或未授权签名功能");
        setInitializing(false);
        return;
      }

      const driftWallet: IWallet = {
        publicKey: wallet.publicKey,
        signTransaction: async (tx: Transaction) => {
          return await wallet.signTransaction!(tx);
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return await wallet.signAllTransactions!(txs);
        },
      };

      const config: DriftClientConfig = {
        connection: connection,
        wallet: driftWallet,
        env,
      };

      const drift = new DriftClient(config);
      await drift.subscribe();
      console.log("drift-init", drift);

      if (!drift) {
        return;
      }
      setDriftClient(drift);
    } catch (e: any) {
      setError(e?.message || "Drift Client 初始化失败");
    } finally {
      setInitializing(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet?.connected) {
      initDrift();
    } else {
      setDriftClient(null);
    }
  }, [wallet]);
  // 检查 Drift 用户账号是否存在（不自动创建）
  const checkDriftUserStats = async () => {
    if (!driftClient) return false;
    try {
      const userAccount = await driftClient.getUserAccount();
      console.log("driftClient---userAccount---", userAccount);
      console.log("用户是否存在：", !!userAccount);
      return !!userAccount;
    } catch (e) {
      return false;
    }
  };

  // 主动创建 Drift 用户账号
  const createDriftUserAccount = async () => {
    if (!driftClient) throw new Error("DriftClient 未初始化");
    try {
      const [sig] = await driftClient.initializeUserAccount(0, "Main Account");
      return sig;
    } catch (e) {
      throw e;
    }
  };

  // return { client, initializing, error };
  return (
    <DriftClientProviderContext.Provider
      value={{
        driftClient,
        initializing,
        error,
        checkDriftUserStats,
        createDriftUserAccount,
      }}
    >
      {children}
    </DriftClientProviderContext.Provider>
  );
}
