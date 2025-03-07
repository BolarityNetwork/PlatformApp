import { ellipsify } from "@/lib/utils";
import { PublicKey } from "@solana/web3.js";

export type Asset = {
  icon: string;
  symbol: string;
  price: string;
  change24h: number;
  value: number;
  amount: number;
  network: string;
  networkIcon?: React.ReactNode;
};

export const genFinalTxPDAAccount = (programId: PublicKey, epoch: number) => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(epoch), 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("final_tx"), buf],
      programId
    )[0];
  },
  genBallotBoxPDAAccount = async (
    programId: PublicKey,
    ncn: PublicKey,
    epoch: number
  ) => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(epoch), 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("ballot_box"), ncn.toBuffer(), buf],
      programId
    )[0];
  },
  // Helper function for PDAs
  genPDAAccount = async (prefix: string, programId: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(prefix)],
      programId
    )[0];
  };

export const NcnTableHeaderArr = [
    "OPERATOR",
    "Online Rate",
    "Stake Valut",
    "Recent Vote",
  ],
  invoices = [
    {
      operator: "C29LRgV8mDqYXuDbpaaG5LH4TVbPSRkrHebfTBrk9og7",
      online_rate: 100,
      stake_vault: 1,
      recent_vote: 9,
    },
    {
      operator: "0x715BFFb9a0Ac608a24840C7373429B8C0342d6A8",
      online_rate: 98,
      stake_vault: 19,
      recent_vote: 7,
    },
    {
      operator: "0x7Fb0D63258caF51D8A35130d3f7A7fd1EE893969",
      online_rate: 89,
      stake_vault: 79,
      recent_vote: 4,
    },
  ];

// ncn schema
export const NcnSchema = {
    struct: {
      discriminators: { array: { type: "u8", len: 8 } },
      base: { array: { type: "u8", len: 32 } },
      admin: { array: { type: "u8", len: 32 } },
      operator_admin: { array: { type: "u8", len: 32 } },
      vault_admin: { array: { type: "u8", len: 32 } },
      slasher_admin: { array: { type: "u8", len: 32 } },
      delegate_admin: { array: { type: "u8", len: 32 } },
      metadata_admin: { array: { type: "u8", len: 32 } },
      weight_table_admin: { array: { type: "u8", len: 32 } },
      ncn_program_admin: { array: { type: "u8", len: 32 } },
      index: "u64",
      operator_count: "u64",
      vault_count: "u64",
      slasher_count: "u64",
      bump: "u8",
      reserved: { array: { type: "u8", len: 263 } },
    },
  },
  RelayerInfoSchema = {
    struct: {
      discriminators: { array: { type: "u8", len: 8 } },
      number: "u16",
      relayer_list: {
        array: { type: { array: { type: "u8", len: 32 } }, len: 100 },
      },
    },
  },
  FinalTransactionSchema = {
    struct: {
      discriminators: { array: { type: "u8", len: 8 } },
      sequence: "u64",
      state_root: { array: { type: "u8", len: 32 } },
      epoch: "u64",
      accepted: "bool",
      acvotescepted: "u8",
    },
  },
  BallotBoxSchema = {
    struct: {
      discriminators: { array: { type: "u8", len: 8 } },
      ncn: { array: { type: "u8", len: 32 } },
      epoch: "u64",
      bump: "u8",
      slot_created: "u64",
      slot_consensus_reached: "u64",
      reserved: { array: { type: "u8", len: 128 } },
      operators_voted: "u64",
      unique_ballots: "u64",
      winning_ballot: {
        struct: {
          meta_merkle_root: { array: { type: "u8", len: 32 } },
          is_initialized: "u8",
          reserved: { array: { type: "u8", len: 63 } },
        },
      },
      operator_votes: {
        array: {
          type: {
            struct: {
              operator: { array: { type: "u8", len: 32 } },
              slot_voted: "u64",
              stake_weights: {
                struct: {
                  stake_weight: "u128",
                  ncn_fee_group_stake_weights: {
                    array: {
                      type: {
                        struct: {
                          weight: "u128",
                        },
                      },
                      len: 8,
                    },
                  },
                },
              },
              ballot_index: "u16",
              reserved: { array: { type: "u8", len: 64 } },
            },
          },
          len: 256,
        },
      },
      ballot_tallies: {
        array: {
          type: {
            struct: {
              index: "u16",
              ballot: {
                struct: {
                  meta_merkle_root: { array: { type: "u8", len: 32 } },
                  is_initialized: "u8",
                  reserved: { array: { type: "u8", len: 63 } },
                },
              },
              stake_weights: {
                struct: {
                  stake_weight: "u128",
                  ncn_fee_group_stake_weights: {
                    array: {
                      type: {
                        struct: {
                          weight: "u128",
                        },
                      },
                      len: 8,
                    },
                  },
                },
              },
              tally: "u64",
            },
          },
          len: 256,
        },
      },
      votes: "u8",
    },
  };

export type Payment = {
  operator: string;
  online_rate: number;
  stake_vault: string;
  recent_vote: string;
};

const operator1 = "J7Wer3xmA1osWfgx8va22v7ZeCC3MtU8QAr6u8FNGfCw";
const operator2 = "FqkWuntfHqjXsBN3vmRKwPApKrTGXBCEXn9nQsvP9JjQ";
const operator3 = "3u8gESkwKs7nCiQEFZcycZvRU4DheoAe8bW1tHcKvUce";
export const NcnTableData: Payment[] = [
  {
    recent_vote: operator1,
    operator: ellipsify(operator1),
    online_rate: 100,
    stake_vault: "SOL",
  },
  {
    recent_vote: operator2,
    operator: ellipsify(operator2),
    online_rate: 100,
    stake_vault: "SOL",
  },
  {
    recent_vote: operator3,
    operator: ellipsify(operator3),
    online_rate: 100,
    stake_vault: "SOL",
  },
];
