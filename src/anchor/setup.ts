// import * as anchor from '@coral-xyz/anchor';
// import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

// export const IDL = require("./idl.json");
// export const NFT_VERIFICATION_IDL = require("./nft_verification.json");

// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Cluster, PublicKey } from "@solana/web3.js";
import DappInitIDL from "./idl.json";
import DappNFT_VERIFICATION_IDL from "./nft_verification.json";
import type { IDL_Init, IDL_NFT_Init } from "./type/idl";
import { BOLARITY_SOLANA_CONTRACT, NFT_VERIFICATION_CONTRACT } from "@/config";

// Re-export the generated IDL and type
export { DappInitIDL, DappNFT_VERIFICATION_IDL };

// The programId is imported from the program IDL.
export const DAPP_INIT_PROGRAM_ID = new PublicKey(DappInitIDL.address);
export const DAPP_NFT_PROGRAM_ID = new PublicKey(
  DappNFT_VERIFICATION_IDL.address
);

// This is a helper function to get the DappInit Anchor program.
export function getDappInitProgram(
  provider: AnchorProvider,
  address?: PublicKey
) {
  return new Program(
    {
      ...DappInitIDL,
      address: address ? address.toBase58() : DappInitIDL.address,
    } as IDL_Init,
    provider
  );
}
// This is a helper function to get the DappInit Anchor program.
export function getDappInitNFTProgram(
  provider: AnchorProvider,
  address?: PublicKey
) {
  return new Program(
    {
      ...DappNFT_VERIFICATION_IDL,
      address: address ? address.toBase58() : DappNFT_VERIFICATION_IDL.address,
    } as IDL_NFT_Init,
    provider
  );
}

// This is a helper function to get the program ID for the DappInit program depending on the cluster.
export function getDappInitProgramId(cluster: Cluster) {
  switch (cluster) {
    case "devnet":
      return new PublicKey(BOLARITY_SOLANA_CONTRACT);
    case "testnet":
    // This is the program ID for the DappInit program on devnet and testnet.
    // return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case "mainnet-beta":
    default:
      return DAPP_INIT_PROGRAM_ID;
  }
}
export function getDappInitNFTProgramId(cluster: Cluster) {
  switch (cluster) {
    case "devnet":
      return new PublicKey(NFT_VERIFICATION_CONTRACT);
    case "testnet":
    // This is the program ID for the DappInit program on devnet and testnet.
    // return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case "mainnet-beta":
    default:
      return DAPP_INIT_PROGRAM_ID;
  }
}
