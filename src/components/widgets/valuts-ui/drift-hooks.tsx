import { DRIFT_ACCOUNT_ID, DRIFT_PROGRAM_ID } from "@/config";
import { useBolarityWalletProvider } from "@/providers/bolarity-wallet-provider";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getUserAccountPublicKey,
  getUserStatsAccountPublicKey,
} from "@/lib/utils";
import { BOLARITY_SOLANA_CONTRACT } from "@/config";
import { SEPOLIA_CHAIN_ID } from "@/config/solala";

export const DriftHooks = () => {
  const { solAddress, evmAddress } = useBolarityWalletProvider();
  const { connection } = useConnection();
  const driftProgram = new PublicKey(DRIFT_PROGRAM_ID);

  //   check drift account init state
  const CheckDriftUserStats = async () => {
    const solPublicKey = new PublicKey(solAddress);
    const driftUserStats = getUserStatsAccountPublicKey(
      driftProgram,
      solPublicKey
    );
    console.log("driftUserStats---", driftUserStats);
    console.log("driftUserStats--tobase58-", driftUserStats.toBase58());

    const userAccount = getUserAccountPublicKey(
      driftProgram,
      solPublicKey,
      DRIFT_ACCOUNT_ID
    );

    const receiverAccountInfo = await connection.getAccountInfo(driftUserStats);

    const receiverAccountInfo2 = await connection.getAccountInfo(userAccount);
    console.log("receiverAccountInfo---", receiverAccountInfo);
    console.log("receiverAccountInfo2---", receiverAccountInfo2);

    if (!receiverAccountInfo || !receiverAccountInfo2) {
      return false;
    }
    return true;
  };

  //   drift init object
  const DriftInitObj = {
    address: evmAddress,
    relayer_solana_contract: BOLARITY_SOLANA_CONTRACT,
    emitter_chain: SEPOLIA_CHAIN_ID,
  };

  return {
    CheckDriftUserStats,
    DriftInitObj,
  };
};
