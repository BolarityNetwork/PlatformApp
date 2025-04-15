export type IDL_Init = {
  address: "5tFEXwUwpAzMXBWUSjQNWVfEh7gKbTc5hQMqBwi8jQ7k";
  metadata: {
    name: "hackathon";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  docs: [
    "# Hello World (Scaffolding Example #1)",
    "",
    "A Cross-Chain Hello World application. This contract uses Wormhole's",
    "generic messaging to send an arbitrary message to registered emitters on",
    "foreign networks.",
    "",
    "## Program Instructions",
    "* [`initialize`](initialize)",
    "* [`register_emitter`](register_emitter)",
    "* [`send_message`](send_message)",
    "* [`receive_message`](receive_message)",
    "",
    "## Program Accounts",
    "* [Config]",
    "* [ForeignEmitter]",
    "* [Received]",
    "* [WormholeEmitter]"
  ];
  instructions: [
    {
      name: "active";
      discriminator: [70, 87, 112, 115, 9, 21, 167, 144];
      accounts: [
        {
          name: "owner";
          docs: [
            "Owner of the program set in the [`Config`] account. Signer for creating",
            "the [`ForeignEmitter`] account."
          ];
          writable: true;
          signer: true;
        },
        {
          name: "pda";
          writable: true;
        },
        {
          name: "system_program";
          docs: ["System program."];
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "chain";
          type: "u16";
        },
        {
          name: "address";
          type: {
            array: ["u8", 32];
          };
        }
      ];
    },
    {
      name: "initialize";
      docs: [
        "This instruction initializes the program config, which is meant",
        "to store data useful for other instructions. The config specifies",
        "an owner (e.g. multisig) and should be read-only for every instruction",
        "in this example. This owner will be checked for designated owner-only",
        "instructions like [`register_emitter`](register_emitter).",
        "",
        "# Arguments",
        "",
        "* `ctx` - `Initialize` context"
      ];
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "owner";
          docs: [
            "Whoever initializes the config will be the owner of the program. Signer",
            "for creating the [`Config`] account and posting a Wormhole message",
            "indicating that the program is alive."
          ];
          writable: true;
          signer: true;
        },
        {
          name: "config";
          docs: [
            "Config account, which saves program data useful for other instructions.",
            "Also saves the payer of the [`initialize`](crate::initialize) instruction",
            "as the program's owner."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "wormhole_program";
          docs: ["Wormhole program."];
          address: "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        },
        {
          name: "wormhole_bridge";
          docs: [
            "Wormhole bridge data account (a.k.a. its config).",
            "[`wormhole::post_message`] requires this account be mutable."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [66, 114, 105, 100, 103, 101];
              }
            ];
          };
        },
        {
          name: "wormhole_fee_collector";
          docs: [
            "Wormhole fee collector account, which requires lamports before the",
            "program can post a message (if there is a fee).",
            "[`wormhole::post_message`] requires this account be mutable."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  102,
                  101,
                  101,
                  95,
                  99,
                  111,
                  108,
                  108,
                  101,
                  99,
                  116,
                  111,
                  114
                ];
              }
            ];
          };
        },
        {
          name: "wormhole_emitter";
          docs: [
            "This program's emitter account. We create this account in the",
            "[`initialize`](crate::initialize) instruction, but",
            "[`wormhole::post_message`] only needs it to be read-only."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 109, 105, 116, 116, 101, 114];
              }
            ];
          };
        },
        {
          name: "wormhole_sequence";
          docs: [
            "message is posted, so it needs to be an [UncheckedAccount] for the",
            "[`initialize`](crate::initialize) instruction.",
            "[`wormhole::post_message`] requires this account be mutable."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [83, 101, 113, 117, 101, 110, 99, 101];
              },
              {
                kind: "account";
                path: "wormhole_emitter";
              }
            ];
          };
        },
        {
          name: "wormhole_message";
          docs: [
            "account, which requires this program's signature.",
            "[`wormhole::post_message`] requires this account be mutable."
          ];
          writable: true;
        },
        {
          name: "clock";
          docs: ["Clock sysvar."];
          address: "SysvarC1ock11111111111111111111111111111111";
        },
        {
          name: "rent";
          docs: ["Rent sysvar."];
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "system_program";
          docs: ["System program."];
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "receive_message";
      docs: [
        "This instruction reads a posted verified Wormhole message and verifies",
        "that the payload is of type [HelloWorldMessage::Hello] (payload ID == 1). HelloWorldMessage",
        "data is stored in a [Received] account.",
        "",
        "See [HelloWorldMessage] enum for deserialization implementation.",
        "",
        "# Arguments",
        "",
        "* `vaa_hash` - Keccak256 hash of verified Wormhole message"
      ];
      discriminator: [38, 144, 127, 225, 31, 225, 238, 25];
      accounts: [
        {
          name: "payer";
          docs: [
            "Payer will initialize an account that tracks his own message IDs."
          ];
          writable: true;
          signer: true;
        },
        {
          name: "config";
          docs: [
            "Config account. Wormhole PDAs specified in the config are checked",
            "against the Wormhole accounts in this context. Read-only."
          ];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "wormhole_program";
          address: "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        },
        {
          name: "posted";
          docs: [
            "Verified Wormhole message account. The Wormhole program verified",
            "signatures and posted the account data here. Read-only."
          ];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [80, 111, 115, 116, 101, 100, 86, 65, 65];
              },
              {
                kind: "arg";
                path: "vaa_hash";
              }
            ];
          };
        },
        {
          name: "foreign_emitter";
          docs: [
            "Foreign emitter account. The posted message's `emitter_address` must",
            "agree with the one we have registered for this message's `emitter_chain`",
            "(chain ID). Read-only."
          ];
        },
        {
          name: "received";
          docs: [
            "Received account. [`receive_message`](crate::receive_message) will",
            "deserialize the Wormhole message's payload and save it to this account.",
            "This account cannot be overwritten, and will prevent Wormhole message",
            "replay with the same sequence."
          ];
          writable: true;
        },
        {
          name: "system_program";
          docs: ["System program."];
          address: "11111111111111111111111111111111";
        },
        {
          name: "program_account";
        }
      ];
      args: [
        {
          name: "vaa_hash";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "bump";
          type: "u8";
        },
        {
          name: "chain";
          type: "u16";
        },
        {
          name: "address";
          type: {
            array: ["u8", 32];
          };
        }
      ];
    },
    {
      name: "register_emitter";
      docs: [
        "This instruction registers a new foreign emitter (from another network)",
        "and saves the emitter information in a ForeignEmitter account. This",
        "instruction is owner-only, meaning that only the owner of the program",
        "(defined in the [Config] account) can add and update emitters.",
        "",
        "# Arguments",
        "",
        "* `ctx`     - `RegisterForeignEmitter` context",
        "* `chain`   - Wormhole Chain ID",
        "* `address` - Wormhole Emitter Address"
      ];
      discriminator: [217, 153, 40, 34, 190, 121, 144, 105];
      accounts: [
        {
          name: "owner";
          docs: [
            "Owner of the program set in the [`Config`] account. Signer for creating",
            "the [`ForeignEmitter`] account."
          ];
          writable: true;
          signer: true;
          relations: ["config"];
        },
        {
          name: "config";
          docs: [
            "Config account. This program requires that the `owner` specified in the",
            "context equals the pubkey specified in this account. Read-only."
          ];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "foreign_emitter";
          docs: [
            "Foreign Emitter account. Create this account if an emitter has not been",
            "registered yet for this Wormhole chain ID. If there already is an",
            "emitter address saved in this account, overwrite it."
          ];
          writable: true;
        },
        {
          name: "system_program";
          docs: ["System program."];
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "chain";
          type: "u16";
        },
        {
          name: "address";
          type: {
            array: ["u8", 32];
          };
        }
      ];
    },
    {
      name: "send_message";
      docs: [
        "This instruction posts a Wormhole message of some arbitrary size",
        "in the form of bytes ([Vec<u8>]). The message is encoded as",
        "[HelloWorldMessage::Hello], which serializes a payload ID (1) before the message",
        "specified in the instruction. Instead of using the native borsh",
        "serialization of [Vec] length (little endian u32), length of the",
        "message is encoded as big endian u16 (in EVM, bytes for numerics are",
        "natively serialized as big endian).",
        "",
        "See [HelloWorldMessage] enum for serialization implementation.",
        "",
        "# Arguments",
        "",
        "* `message` - Arbitrary message to send out"
      ];
      discriminator: [57, 40, 34, 178, 189, 10, 65, 26];
      accounts: [
        {
          name: "payer";
          docs: ["Payer will pay Wormhole fee to post a message."];
          writable: true;
          signer: true;
        },
        {
          name: "config";
          docs: [
            "Config account. Wormhole PDAs specified in the config are checked",
            "against the Wormhole accounts in this context. Read-only."
          ];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "wormhole_program";
          docs: ["Wormhole program."];
          address: "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        },
        {
          name: "wormhole_bridge";
          docs: [
            "Wormhole bridge data. [`wormhole::post_message`] requires this account",
            "be mutable."
          ];
          writable: true;
        },
        {
          name: "wormhole_fee_collector";
          docs: [
            "Wormhole fee collector. [`wormhole::post_message`] requires this",
            "account be mutable."
          ];
          writable: true;
        },
        {
          name: "wormhole_emitter";
          docs: ["Program's emitter account. Read-only."];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 109, 105, 116, 116, 101, 114];
              }
            ];
          };
        },
        {
          name: "wormhole_sequence";
          docs: [
            "Emitter's sequence account. [`wormhole::post_message`] requires this",
            "account be mutable."
          ];
          writable: true;
        },
        {
          name: "wormhole_message";
          docs: ["account be mutable."];
          writable: true;
        },
        {
          name: "system_program";
          docs: ["System program."];
          address: "11111111111111111111111111111111";
        },
        {
          name: "clock";
          docs: ["Clock sysvar."];
          address: "SysvarC1ock11111111111111111111111111111111";
        },
        {
          name: "rent";
          docs: ["Rent sysvar."];
          address: "SysvarRent111111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "message";
          type: "bytes";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "Config";
      discriminator: [155, 12, 170, 224, 30, 250, 204, 130];
    },
    {
      name: "ForeignEmitter";
      discriminator: [209, 139, 241, 247, 96, 178, 159, 2];
    },
    {
      name: "PDAAccount";
      discriminator: [45, 144, 246, 42, 88, 234, 93, 2];
    },
    {
      name: "Received";
      discriminator: [227, 186, 72, 102, 0, 233, 222, 41];
    },
    {
      name: "WormholeEmitter";
      discriminator: [34, 95, 161, 132, 226, 225, 31, 11];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidWormholeConfig";
      msg: "InvalidWormholeConfig";
    },
    {
      code: 6001;
      name: "InvalidWormholeFeeCollector";
      msg: "InvalidWormholeFeeCollector";
    },
    {
      code: 6002;
      name: "InvalidWormholeEmitter";
      msg: "InvalidWormholeEmitter";
    },
    {
      code: 6003;
      name: "InvalidWormholeSequence";
      msg: "InvalidWormholeSequence";
    },
    {
      code: 6004;
      name: "InvalidSysvar";
      msg: "InvalidSysvar";
    },
    {
      code: 6005;
      name: "OwnerOnly";
      msg: "OwnerOnly";
    },
    {
      code: 6006;
      name: "InvalidForeignEmitter";
      msg: "InvalidForeignEmitter";
    },
    {
      code: 6007;
      name: "BumpNotFound";
      msg: "BumpNotFound";
    },
    {
      code: 6008;
      name: "InvalidMessage";
      msg: "InvalidMessage";
    }
  ];
  types: [
    {
      name: "Config";
      docs: ["Config account data."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            docs: ["Program's owner."];
            type: "pubkey";
          },
          {
            name: "wormhole";
            docs: ["Wormhole program's relevant addresses."];
            type: {
              defined: {
                name: "WormholeAddresses";
              };
            };
          },
          {
            name: "batch_id";
            docs: [
              "AKA nonce. Just zero, but saving this information in this account",
              "anyway."
            ];
            type: "u32";
          },
          {
            name: "finality";
            docs: [
              "AKA consistency level. u8 representation of Solana's",
              "[Finality](wormhole_anchor_sdk::wormhole::Finality)."
            ];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "ForeignEmitter";
      docs: ["Foreign emitter account data."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "chain";
            docs: ["Emitter chain. Cannot equal `1` (Solana's Chain ID)."];
            type: "u16";
          },
          {
            name: "address";
            docs: ["Emitter address. Cannot be zero address."];
            type: {
              array: ["u8", 32];
            };
          }
        ];
      };
    },
    {
      name: "PDAAccount";
      type: {
        kind: "struct";
        fields: [
          {
            name: "chain";
            type: "u16";
          },
          {
            name: "address";
            type: {
              array: ["u8", 32];
            };
          }
        ];
      };
    },
    {
      name: "Received";
      docs: ["Received account."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "batch_id";
            docs: [
              "AKA nonce. Should always be zero in this example, but we save it anyway."
            ];
            type: "u32";
          },
          {
            name: "wormhole_message_hash";
            docs: ["Keccak256 hash of verified Wormhole message."];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "message";
            docs: [
              "HelloWorldMessage from [HelloWorldMessage::Hello](crate::message::HelloWorldMessage)."
            ];
            type: "bytes";
          }
        ];
      };
    },
    {
      name: "WormholeAddresses";
      docs: ["Wormhole program related addresses."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "bridge";
            docs: [
              "[BridgeData](wormhole_anchor_sdk::wormhole::BridgeData) address."
            ];
            type: "pubkey";
          },
          {
            name: "fee_collector";
            docs: [
              "[FeeCollector](wormhole_anchor_sdk::wormhole::FeeCollector) address."
            ];
            type: "pubkey";
          },
          {
            name: "sequence";
            docs: [
              "[SequenceTracker](wormhole_anchor_sdk::wormhole::SequenceTracker) address."
            ];
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "WormholeEmitter";
      docs: ["Wormhole emitter account."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            docs: ["PDA bump."];
            type: "u8";
          }
        ];
      };
    }
  ];
};

export type IDL_NFT_Init = {
  address: "6QBQwCw7gYQGb4aTW5Hxexcms24AnJRyU9pBCKhDLNSq";
  metadata: {
    name: "nft_verification";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "claim_tokens";
      docs: [
        "Allows eligible users to claim tokens for verified NFTs",
        "@param ctx The context for claiming tokens"
      ];
      discriminator: [108, 216, 210, 231, 0, 212, 42, 64];
      accounts: [
        {
          name: "receiver";
          writable: true;
          signer: true;
        },
        {
          name: "state";
        },
        {
          name: "token_vault";
          writable: true;
        },
        {
          name: "receiver_token_account";
          writable: true;
        },
        {
          name: "proof_record";
          writable: true;
        },
        {
          name: "token_program";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [];
    },
    {
      name: "create_proof_record";
      discriminator: [28, 172, 129, 151, 152, 98, 33, 59];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "state";
        },
        {
          name: "proof_record";
          writable: true;
        },
        {
          name: "system_program";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "payload";
          type: "bytes";
        }
      ];
    },
    {
      name: "initialize";
      docs: [
        "Initialize the program with required configurations",
        "@param ctx The context for initialization",
        "@param token_amount_per_nft The amount of tokens to distribute per verified NFT"
      ];
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "token_mint";
        },
        {
          name: "token_vault";
        },
        {
          name: "state";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "system_program";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "token_amount_per_nft";
          type: "u64";
        }
      ];
    },
    {
      name: "process_wormhole_message";
      docs: [
        "Processes a Wormhole message containing NFT ownership proof",
        "@param ctx The context for processing the message",
        "@param vaa_hash The VAA hash used to locate the Wormhole message"
      ];
      discriminator: [165, 62, 143, 153, 42, 226, 107, 202];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 100, 97];
              },
              {
                kind: "account";
                path: "proof_record.chain_id";
                account: "ProofRecord";
              },
              {
                kind: "account";
                path: "proof_record.proxy_account";
                account: "ProofRecord";
              }
            ];
            program: {
              kind: "account";
              path: "proof_record.relayer_account";
              account: "ProofRecord";
            };
          };
        },
        {
          name: "proof_record";
          writable: true;
        }
      ];
      args: [
        {
          name: "payload";
          type: "bytes";
        }
      ];
    },
    {
      name: "set_approved_nft";
      docs: [
        "Sets the approval status for an NFT contract",
        "@param ctx The context for the action",
        "@param nft_contract The Ethereum NFT contract address (20 bytes)",
        "@param status Whether to approve or disapprove the NFT contract"
      ];
      discriminator: [42, 246, 187, 93, 115, 76, 56, 168];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "state";
          writable: true;
        }
      ];
      args: [
        {
          name: "nft_contract";
          type: {
            array: ["u8", 20];
          };
        },
        {
          name: "status";
          type: "bool";
        }
      ];
    },
    {
      name: "update_admin";
      docs: [
        "Updates the admin of the program",
        "@param ctx The context for updating the admin",
        "@param new_admin The public key of the new admin"
      ];
      discriminator: [161, 176, 40, 213, 60, 184, 179, 228];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "state";
          writable: true;
        }
      ];
      args: [
        {
          name: "new_admin";
          type: "pubkey";
        }
      ];
    },
    {
      name: "update_token_amount";
      docs: [
        "Updates the token amount distributed per verified NFT",
        "@param ctx The context for the action",
        "@param new_token_amount The new token amount to set"
      ];
      discriminator: [114, 183, 112, 206, 155, 246, 62, 189];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "state";
          writable: true;
        }
      ];
      args: [
        {
          name: "new_token_amount";
          type: "u64";
        }
      ];
    },
    {
      name: "withdraw_tokens";
      docs: [
        "Allows the admin to withdraw tokens from the vault",
        "@param ctx The context for withdrawing tokens",
        "@param amount The amount of tokens to withdraw"
      ];
      discriminator: [2, 4, 225, 61, 19, 182, 106, 170];
      accounts: [
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "state";
        },
        {
          name: "token_vault";
          writable: true;
        },
        {
          name: "admin_token_account";
          writable: true;
        },
        {
          name: "token_program";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "ProofRecord";
      discriminator: [237, 59, 155, 172, 204, 117, 87, 44];
    },
    {
      name: "StateAccount";
      discriminator: [142, 247, 54, 95, 85, 133, 249, 103];
    }
  ];
  events: [
    {
      name: "AdminUpdated";
      discriminator: [69, 82, 49, 171, 43, 3, 80, 161];
    },
    {
      name: "ApprovedNftUpdated";
      discriminator: [191, 31, 88, 176, 156, 99, 222, 185];
    },
    {
      name: "ProgramInitialized";
      discriminator: [43, 70, 110, 241, 199, 218, 221, 245];
    },
    {
      name: "ProofRecorded";
      discriminator: [55, 159, 128, 127, 158, 254, 93, 145];
    },
    {
      name: "TokenAmountUpdated";
      discriminator: [229, 117, 180, 93, 161, 129, 235, 236];
    },
    {
      name: "TokensClaimed";
      discriminator: [25, 128, 244, 55, 241, 136, 200, 91];
    },
    {
      name: "TokensWithdrawn";
      discriminator: [30, 116, 110, 147, 87, 89, 9, 158];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "Unauthorized";
      msg: "Unauthorized access";
    },
    {
      code: 6001;
      name: "InvalidEmitter";
      msg: "Invalid Wormhole emitter";
    },
    {
      code: 6002;
      name: "InvalidPayload";
      msg: "Invalid payload format";
    },
    {
      code: 6003;
      name: "UnapprovedNftContract";
      msg: "NFT contract not in approved list";
    },
    {
      code: 6004;
      name: "ProofAlreadyRecorded";
      msg: "Proof already recorded";
    },
    {
      code: 6005;
      name: "ProofNotFound";
      msg: "Proof not found";
    },
    {
      code: 6006;
      name: "AlreadyClaimed";
      msg: "Token already claimed";
    },
    {
      code: 6007;
      name: "InvalidReceiver";
      msg: "Invalid receiver";
    },
    {
      code: 6008;
      name: "InvalidTokenAccount";
      msg: "Invalid token account";
    },
    {
      code: 6009;
      name: "InvalidVaultOwner";
      msg: "Invalid vault owner";
    },
    {
      code: 6010;
      name: "InsufficientFunds";
      msg: "Insufficient funds in vault";
    },
    {
      code: 6011;
      name: "InvalidAdminAddress";
      msg: "Invalid admin address";
    },
    {
      code: 6012;
      name: "BumpNotFound";
      msg: "Bump seed not found";
    },
    {
      code: 6013;
      name: "InvalidConsistencyLevel";
      msg: "Invalid Wormhole consistency level";
    }
  ];
  types: [
    {
      name: "AdminUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "old_admin";
            type: "pubkey";
          },
          {
            name: "new_admin";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "ApprovedNftUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "nft_contract";
            type: "pubkey";
          },
          {
            name: "status";
            type: "bool";
          }
        ];
      };
    },
    {
      name: "ProgramInitialized";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: "pubkey";
          },
          {
            name: "token_mint";
            type: "pubkey";
          },
          {
            name: "token_amount_per_nft";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "ProofRecord";
      type: {
        kind: "struct";
        fields: [
          {
            name: "proxy_account";
            docs: ["The Ethereum proxy account that owns the NFT"];
            type: "pubkey";
          },
          {
            name: "nft_contract";
            docs: ["The Ethereum NFT contract address"];
            type: "pubkey";
          },
          {
            name: "token_id";
            docs: ["The NFT token ID"];
            type: "u64";
          },
          {
            name: "solana_receiver";
            docs: ["The Solana account that will receive tokens"];
            type: "pubkey";
          },
          {
            name: "claimed";
            docs: ["Whether the tokens have been claimed"];
            type: "bool";
          },
          {
            name: "initialized";
            docs: ["Whether this proof record has been initialized"];
            type: "bool";
          },
          {
            name: "timestamp";
            docs: ["The timestamp when the proof was recorded"];
            type: "i64";
          },
          {
            name: "claim_timestamp";
            docs: [
              "The timestamp when the tokens were claimed (0 if not claimed)"
            ];
            type: "i64";
          },
          {
            name: "chain_id";
            type: "u16";
          },
          {
            name: "relayer_account";
            type: "pubkey";
          },
          {
            name: "reserved";
            docs: ["Reserved space for future upgrades"];
            type: {
              array: ["u8", 32];
            };
          }
        ];
      };
    },
    {
      name: "ProofRecorded";
      type: {
        kind: "struct";
        fields: [
          {
            name: "proxy_account";
            type: "pubkey";
          },
          {
            name: "nft_contract";
            type: "pubkey";
          },
          {
            name: "token_id";
            type: "u64";
          },
          {
            name: "solana_receiver";
            type: "pubkey";
          },
          {
            name: "sequence";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "StateAccount";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            docs: ["The administrator of the program"];
            type: "pubkey";
          },
          {
            name: "token_mint";
            docs: ["The mint address of the token to be distributed"];
            type: "pubkey";
          },
          {
            name: "token_vault";
            docs: ["The token vault that holds the tokens to be distributed"];
            type: "pubkey";
          },
          {
            name: "token_amount_per_nft";
            docs: ["The amount of tokens to distribute per verified NFT"];
            type: "u64";
          },
          {
            name: "approved_nfts";
            docs: ["List of approved NFT contracts"];
            type: {
              vec: "pubkey";
            };
          },
          {
            name: "bump";
            docs: ["PDA bump seed"];
            type: "u8";
          },
          {
            name: "init_timestamp";
            docs: ["Program initialization timestamp"];
            type: "i64";
          },
          {
            name: "reserved";
            docs: ["Reserved space for future upgrades"];
            type: {
              array: ["u8", 64];
            };
          }
        ];
      };
    },
    {
      name: "TokenAmountUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "old_amount";
            type: "u64";
          },
          {
            name: "new_amount";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "TokensClaimed";
      type: {
        kind: "struct";
        fields: [
          {
            name: "receiver";
            type: "pubkey";
          },
          {
            name: "nft_contract";
            type: "pubkey";
          },
          {
            name: "token_id";
            type: "u64";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "timestamp";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "TokensWithdrawn";
      type: {
        kind: "struct";
        fields: [
          {
            name: "receiver";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "timestamp";
            type: "i64";
          }
        ];
      };
    }
  ];
};
