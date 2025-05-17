import { CONTRACTS } from "@certusone/wormhole-sdk";
import { serialize } from "borsh";

export const RawDataSchema = {
    struct: {
      chain_id: "u16",
      caller: { array: { type: "u8", len: 32 } },
      programId: { array: { type: "u8", len: 32 } },
      acc_count: "u8",
      accounts: {
        array: {
          type: {
            struct: {
              key: { array: { type: "u8", len: 32 } },
              isWritable: "bool",
              isSigner: "bool",
            },
          },
        },
      },
      paras: { array: { type: "u8" } },
      acc_meta: { array: { type: "u8" } },
    },
  },
  AccountMeta = {
    array: {
      type: { struct: { writeable: "bool", is_signer: "bool" } },
    },
  },
  SEPOLIA_CHAIN_ID = 10002, //wormhole sepolia chain id
  accountMetaList = [
    { writeable: true, is_signer: true },
    { writeable: true, is_signer: false },
  ],
  encodeMeta = serialize(AccountMeta, accountMetaList);

//   wormhole config
const NETWORK = "TESTNET";
export const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];

export const SolanaAccountMetaList = [
    { writeable: true, is_signer: false }, // ata
    { writeable: false, is_signer: false }, // mint
    { writeable: true, is_signer: false }, // dst
    { writeable: true, is_signer: true }, // signer
    { writeable: true, is_signer: true }, // signer
  ],
  AtaAccountMeta = [
    { writeable: true, is_signer: true }, // payer
    { writeable: true, is_signer: false }, // associatedToken
    { writeable: false, is_signer: false }, // owner
    { writeable: false, is_signer: false }, // mint
    { writeable: false, is_signer: false }, // SystemProgram
    { writeable: false, is_signer: false }, // token programId
  ],
  AtaEncodeMeta = serialize(AccountMeta, AtaAccountMeta);
