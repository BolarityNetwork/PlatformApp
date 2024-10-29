"use client";

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import {
  getSolTokenMintAddress,
  useAccountBalance,
  useTransferSol,
  useTransferSolToken,
} from "@/hooks/useAccount";
import { toast } from "sonner";
import { Send, HandCoins, Check, Copy, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Dialog,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ellipsify,
  getExplorerLink,
  hexStringToUint8Array,
  rightAlignBuffer,
  sha256,
  sliceBuffer,
  writeBigUint64LE,
  writeUInt16LE,
} from "@/lib/utils";
import { Buffer } from "buffer";
import {
  encodeAbiParameters,
  toBytes,
  pad,
  parseUnits,
  toHex,
  encodeFunctionData,
  bytesToHex,
  parseEther,
} from "viem";
import * as anchor from "@coral-xyz/anchor";

import { CONTRACTS } from "@certusone/wormhole-sdk";
import {
  getPostMessageCpiAccounts,
  getProgramSequenceTracker,
} from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { useBolarity } from "@/hooks/useBolarity";
import { useFeedsData } from "@/hooks/useFeedsData";
import {
  CurrencyEnum,
  EVM_CONTRACT_ADDRESS,
  SupportChain,
  UNI_PROXY,
} from "@/config";
import { useCluster } from "@/providers/cluster-provider";
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { serialize } from "borsh";
import { IDL } from "@/anchor/setup";

const CONSTANTS = {
  MIN_DESTINATION_LENGTH: 32,
  DEFAULT_BALANCE: "0.00",
  TOAST_DURATION: 10000,
};

const showTransactionSuccessToast = (hash: string, explorerUrl: string) => {
  toast.success("Transaction Successful", {
    description: ellipsify(hash),
    action: {
      label: "Explorer Link",
      onClick: () => window.open(explorerUrl, "_blank"),
    },
    duration: 10000,
  });
};

const showErrorToast = (message: string) => {
  toast.error(`transaction failed: ${message}`);
};

const encodeWormholeMessage = (sourceAddress: `0x${string}`, payload: `0x${string}`) => {
  return encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bytes" }],
    [sourceAddress, payload]
  );
};

const encodeRawData = (
  chainId: number,
  caller: Buffer,
  programId: Buffer,
  accounts: Array<{ key: Buffer; isWritable: boolean; isSigner: boolean }>,
  paras: Buffer,
  accMeta: Buffer
) => {
  const RawDataSchema = {
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
  };

  const RawData = {
    chain_id: chainId,
    caller,
    programId,
    acc_count: accounts.length,
    accounts,
    paras,
    accMeta,
  };

  return Buffer.from(serialize(RawDataSchema, RawData));
};

const sendWormholeMessage = async (
  program: anchor.Program,
  connection: Connection,
  solPublicKey: PublicKey,
  message: Buffer
) => {
  const NETWORK = "TESTNET";
  const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
  const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
  const HELLO_WORLD_PID = program.programId;

  const realConfig = deriveAddress([Buffer.from("config")], HELLO_WORLD_PID);

  const message2 = await getProgramSequenceTracker(
    connection,
    program.programId,
    CORE_BRIDGE_PID
  ).then((tracker) =>
    deriveAddress(
      [
        Buffer.from("sent"),
        writeBigUint64LE(tracker.sequence + BigInt(1)),
      ],
      HELLO_WORLD_PID
    )
  );

  const wormholeAccounts2 = getPostMessageCpiAccounts(
    program.programId,
    CORE_BRIDGE_PID,
    solPublicKey,
    message2
  );

  const params = {
    config: realConfig,
    wormholeProgram: CORE_BRIDGE_PID,
    ...wormholeAccounts2,
  };

  const ix = await program.methods.sendMessage(message).accountsStrict(params).instruction();
  const tx = new Transaction().add(ix);
  tx.feePayer = solPublicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return tx;
};

const getTokenContractAddress = (tokenSymbol: string): `0x${string}` => {
  switch (tokenSymbol) {
    case CurrencyEnum.USDC:
      return "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    case CurrencyEnum.USDT:
    default:
      return "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
  }
};

export const AccountBalance = () => {
  const { isConnected, wallet } = useBolarity();
  const [evmAddress, setEvmAddress] = useState<string>("");
  const [solPublicKey, setSolPublicKey] = useState<PublicKey>();
  const {
    accountBalance,
    isLoading,
    refetch: fetchBalance,
  } = useAccountBalance({ solPublicKey, evmAddress });
  const { feedsData } = useFeedsData();

  const balanceAmount = useMemo(() => {
    if (!isConnected || !accountBalance || !feedsData.sol || !feedsData.eth) {
      return "0.00";
    }

    const {
      solBalance,
      solUsdcBalance,
      solUsdtBalance,
      ethBalance,
      ethUsdcBalance,
      ethUsdtBalance,
    } = accountBalance;
    const totalBalance =
      solBalance * feedsData.sol.price +
      solUsdcBalance +
      solUsdtBalance +
      ethBalance * feedsData.eth.price +
      ethUsdcBalance +
      ethUsdtBalance;

    return totalBalance.toFixed(2);
  }, [isConnected, accountBalance, feedsData]);

  useEffect(() => {
    if (isConnected) {
      if (wallet.address) {
        setSolPublicKey(new PublicKey(wallet.address));
      }
      if (wallet.evmAddress) {
        setEvmAddress(wallet.evmAddress);
      }
    }
  }, [isConnected, wallet.address, wallet.evmAddress]);

  return (
    <h3
      className="text-1xl font-bold tracking-tight sm:text-2xl cursor-pointer"
      onClick={() => fetchBalance()}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <span className="text-sm">$ </span>
          {balanceAmount}
        </>
      )}
    </h3>
  );
};

const getProvider = (wallet: any, connection: Connection) => {
  const provider = new anchor.AnchorProvider(connection, wallet);
  return provider;
};

export const ActiveEvmAccountButton = () => {
  const { wallet, signTransaction, signAllTransactions, sendTransaction } =
    useWallet();
  const { connection } = useConnection();
  const boliarity = useBolarity();
  const [solPublicKey, setSolPublicKey] = useState<PublicKey>();

  useEffect(() => {
    if (boliarity.isConnected) {
      if (boliarity.wallet.chain === SupportChain.Solana) {
        setSolPublicKey(new PublicKey(boliarity.wallet.address));
      }
    }
  }, [boliarity]);

  const handleActiveAccount = async () => {
    if (
      !wallet ||
      !signTransaction ||
      !signAllTransactions ||
      !sendTransaction ||
      !connection ||
      !solPublicKey
    ) {
      console.log("wallet not connected");
      return;
    }

    const contractAddress = solPublicKey.toBytes();
    const sourceAddress = encodeAbiParameters(
      [{ type: "bytes32" }],
      [toHex(Buffer.from(contractAddress))]
    );

    const payload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [sourceAddress, toHex(Buffer.from([0]))]
    );
    console.log("payload:", payload);

    const provider = getProvider(
      {
        signTransaction,
        signAllTransactions,
        publicKey: solPublicKey,
      },
      connection
    );

    const program = new anchor.Program(IDL!, provider);

    try {
      const tx = await sendWormholeMessage(program, connection, solPublicKey, Buffer.from(payload));
      const signature = await sendTransaction(tx, connection);
      const latestBlockhash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

      showTransactionSuccessToast(signature, getExplorerLink("tx", signature, "devnet"));
    } catch (error: any) {
      showErrorToast(error.message);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleActiveAccount}
      disabled={!solPublicKey}
    >
      <AtSign className="h-5 w-5 pr-1" />
      Activate
    </Button>
  );
};

export const ActiveSolanaAccountBtn = () => {
  const { isConnected, wallet } = useBolarity();
  const { data: hash, isPending, writeContract } = useWriteContract();

  const handleActiveAccount = async () => {
    if (!isConnected || !wallet) {
      toast.error("Wallet not connected!");
      return;
    }

    const { evmAddress } = wallet;
    const HELLO_WORLD_PID = new PublicKey(
      "CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs"
    );
    const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
    const realForeignEmitterChain = 10002;
    const ethAddress = rightAlignBuffer(
      Buffer.from(hexStringToUint8Array(evmAddress))
    );

    const AccountMeta = {
      array: {
        type: { struct: { writeable: "bool", is_signer: "bool" } },
      },
    };
    const RawDataSchema = {
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
    };

    const paras = sliceBuffer(sha256("active"), 0, 8);
    const encodedParams = Buffer.concat([paras]);
    console.log("encodedParams:", encodedParams);

    const encodeMeta = serialize(AccountMeta, [
      { writeable: true, is_signer: false },
    ]);

    const realForeignEmitter = deriveAddress(
      [
        Buffer.from("pda"),
        (() => {
          // const buf = Buffer.alloc(2);
          // buf.writeUInt16LE(realForeignEmitterChain);
          // return buf;
          return writeUInt16LE(realForeignEmitterChain);
        })(),
        ethAddress,
      ],
      HELLO_WORLD_PID
    );
    const RawData = {
      chain_id: realForeignEmitterChain,
      caller: ethAddress,
      programId: new PublicKey(programTest).toBuffer(),
      acc_count: 1,
      accounts: [
        {
          key: realForeignEmitter.toBuffer(),
          isWritable: true,
          isSigner: false,
        },
      ],
      paras: encodedParams,
      acc_meta: Buffer.from(encodeMeta),
    };
    const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));
    console.log("RawDataEncoded:", RawDataEncoded);

    const evmContractAddress = EVM_CONTRACT_ADDRESS;
    writeContract({
      address: evmContractAddress,
      abi: UNI_PROXY.abi,
      functionName: "sendMessage",
      args: [toHex(RawDataEncoded)],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Confirming...", {
        id: hash,
      });
    }
    if (isConfirmed) {
      toast.success("Transaction Successfull", {
        description: ellipsify(hash),
        action: {
          label: "Explorer Link",
          onClick: () =>
            window.open(`https://sepolia.etherscan.io/tx/${hash}`, "_blank"),
        },
        duration: 10000,
      });
    }
  }, [hash, isConfirmed, isConfirming]);

  return (
    <Button variant="outline" size="sm" onClick={handleActiveAccount}>
      <AtSign className="h-5 w-5 pr-1" />
      Activate
    </Button>
  );
};


export const SendSolModal = ({
  open = false,
  onOpenChange,
  withButton = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const { isConnected, wallet } = useBolarity();
  const [solPublicKey, setSolPublicKey] = useState<PublicKey | undefined>();
  const { mutateAsync: transferSol } = useTransferSol({ solPublicKey });
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    if (
      destination.length >= 32 &&
      parseFloat(amount) > 0 &&
      isConnected &&
      solPublicKey
    ) {
      setIsSendDisabled(false);
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount, isConnected, solPublicKey]);

  useMemo(() => {
    if (isConnected) {
      const { address } = wallet;
      if (address) {
        setSolPublicKey(new PublicKey(address));
      }
    }
  }, [isConnected, wallet]);

  const handleSend = async () => {
    console.log(`Send ${amount} to ${destination}`);

    if (!solPublicKey) {
      toast.error("Wallet not connected");
      return;
    }

    // Determine if the destination address is SOL or ETH
    if (destination.startsWith("0x")) {
      // Convert amount to wei
      const amountInWei = parseUnits(amount.toString(), 18); // Convert ETH to wei

      const contractAddress = solPublicKey.toBytes();
      const sourceAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(contractAddress))]
      );

      // Convert EVM address to bytes array
      const evmAddressBytes = toBytes(destination); // Convert to bytes array

      // Pad the EVM address to 32 bytes
      const otherAddressPadded = pad(toHex(evmAddressBytes), {
        size: 32,
        dir: "left",
      }); // Left pad to ensure length is 32 bytes
      const otherAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [otherAddressPadded]
      );

      // Use array directly as bytes parameter
      const payloadPart = encodeAbiParameters(
        [
          { type: "bytes32" }, // other_address
          { type: "uint256" }, // amount in wei
          { type: "bytes" }, // custom payload
        ],
        [
          otherAddress, // other_address
          amountInWei, // Converted amount in wei
          toHex(Buffer.from([0])), // Use array [0] directly as custom payload and convert to hex
        ]
      );

      // Calculate the final txPayload
      const txPayload = encodeAbiParameters(
        [
          { type: "bytes32" }, // sourceContract
          { type: "bytes" }, // payload_part
        ],
        [
          sourceAddress, // sourceContract
          payloadPart, // payload_part
        ]
      );

      // Output txPayload as a hexadecimal string
      const provider = getProvider(
        {
          signTransaction,
          signAllTransactions,
          publicKey: solPublicKey,
        },
        connection
      );

      const program = new anchor.Program(IDL!, provider);

      const NETWORK = "TESTNET";
      const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
      const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
      const HELLO_WORLD_PID = program.programId;
      // console.log("CORE_BRIDGE_PID:", CORE_BRIDGE_PID.toString());
      // console.log("HELLO_WORLD_PID:", HELLO_WORLD_PID.toString());

      const realConfig = deriveAddress(
        [Buffer.from("config")],
        HELLO_WORLD_PID
      );
      // console.log("realConfig:", realConfig.toString());

      const message2 = await getProgramSequenceTracker(
        connection,
        program.programId,
        CORE_BRIDGE_PID
      )
        .then((tracker) =>
          deriveAddress(
            [
              Buffer.from("sent"),
              (() => {
                // const buf = Buffer.alloc(8);
                // buf.writeBigUInt64LE(tracker.sequence + BigInt(1));
                // return buf;
                return writeBigUint64LE(tracker.sequence + BigInt(1));
              })(),
            ],
            HELLO_WORLD_PID
          )
        )
        .catch((err) => {
          toast.error("Failed to get program sequence tracker");
          console.log("err:", err);
        });

      if (!message2) {
        return;
      }

      const wormholeAccounts2 = getPostMessageCpiAccounts(
        program.programId,
        CORE_BRIDGE_PID,
        solPublicKey,
        message2
      );
      console.log("wormholeAccounts2:", wormholeAccounts2);

      const message = hexStringToUint8Array(txPayload);
      try {
        const params = {
          config: realConfig,
          wormholeProgram: CORE_BRIDGE_PID,
          ...wormholeAccounts2,
        };
        const ix1 = program.methods.sendMessage(Buffer.from(message));
        const ix2 = ix1.accountsStrict(params);
        const ix3 = await ix2.instruction();
        const tx3 = new Transaction().add(ix3);
        tx3.feePayer = solPublicKey;
        tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signature = await sendTransaction(tx3, connection);
        const latestBlockhash = await connection.getLatestBlockhash();

        // Send transaction and await for signature
        await connection.confirmTransaction(
          { signature, ...latestBlockhash },
          "confirmed"
        );

        onChange(false);
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet")
        );
      } catch (error: any) {
        onChange(false);
        toast.error(`Transaction failed: ${error.message}`);
      }
    } else {
      transferSol({
        destination: new PublicKey(destination),
        amount: parseFloat(amount),
      })
        .then(() => {
          setDestination("");
          setAmount("");
        })
        .finally(() => {
          onChange(false);
        });
    }
  };

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Send className="h-5 w-5 pr-1" />
            Send
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>
            Send SOL or ETH to anyone on the network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={destination}
              onChange={(e) => setDestination(e.target.value.trim())}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled}
                >
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SendSolanaTokenModal = ({
  tokenSymbol,
  open = false,
  onOpenChange,
  withButton = true,
}: {
  tokenSymbol: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const { isConnected, wallet } = useBolarity();
  const [solPublicKey, setSolPublicKey] = useState<PublicKey | undefined>();
  const { mutateAsync: transferSolToken } = useTransferSolToken({
    solPublicKey,
  });
  const { signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  useEffect(() => {
    if (
      destination.length >= 32 &&
      parseFloat(amount) > 0 &&
      isConnected &&
      solPublicKey
    ) {
      setIsSendDisabled(false);
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount, isConnected, solPublicKey]);

  useMemo(() => {
    if (isConnected) {
      const { address } = wallet;
      if (address) {
        setSolPublicKey(new PublicKey(address));
      }
    }
  }, [isConnected, wallet]);

  const handleSend = async () => {
    console.log(`Send ${amount} to ${destination}`);

    if (!solPublicKey) {
      toast.error("Wallet not connected");
      return;
    }

    // Determine if the destination address is SOL or ETH
    if (destination.startsWith("0x")) {
      // Convert amount to wei
      const amountInWei = parseUnits(amount.toString(), 6); // Convert ETH to wei
      const userAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [toHex(Buffer.from(solPublicKey.toBytes()))]
      );
      // 2. USDT contract address, ensure it's 32 bytes
      let tokenContractAddress;
      switch (tokenSymbol) {
        case CurrencyEnum.USDC:
          tokenContractAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
          break;
        case CurrencyEnum.USDT:
        default:
          tokenContractAddress = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
          break;
      }
      const contractAddressPadded = pad(toHex(toBytes(tokenContractAddress)), {
        size: 32,
        dir: "left",
      });
      const contractAddress = encodeAbiParameters(
        [{ type: "bytes32" }],
        [contractAddressPadded]
      );
      // 3. Define ERC20 ABI, transfer function
      const ABI = [
        {
          type: "function",
          name: "transfer",
          inputs: [
            {
              name: "to",
              type: "address",
            },
            {
              name: "value",
              type: "uint256",
            },
          ],
          outputs: [{ type: "bool" }],
        },
      ];
      // 4. Use viem's encodeFunctionData to encode transfer call
      const encodedFunction = encodeFunctionData({
        abi: ABI,
        functionName: "transfer",
        args: [destination, amountInWei], // 100 USDT, 6 decimal precision
      });
      // 5. Encode payload_part
      const payloadPart = encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes" }],
        [contractAddress, BigInt(0), bytesToHex(toBytes(encodedFunction))]
      );
      // 6. Encode the final payload
      const txPayload = encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes" }],
        [userAddress, payloadPart]
      );

      // Output txPayload as a hexadecimal string
      const provider = getProvider(
        {
          signTransaction,
          signAllTransactions,
          publicKey: solPublicKey,
        },
        connection
      );

      const program = new anchor.Program(IDL!, provider);

      const NETWORK = "TESTNET";
      const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
      const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
      const HELLO_WORLD_PID = program.programId;
      console.log("CORE_BRIDGE_PID:", CORE_BRIDGE_PID.toString());
      console.log("HELLO_WORLD_PID:", HELLO_WORLD_PID.toString());

      const realConfig = deriveAddress(
        [Buffer.from("config")],
        HELLO_WORLD_PID
      );
      console.log("realConfig:", realConfig.toString());

      const message2 = await getProgramSequenceTracker(
        connection,
        program.programId,
        CORE_BRIDGE_PID
      )
        .then((tracker) =>
          deriveAddress(
            [
              Buffer.from("sent"),
              (() => {
                // const buf = Buffer.alloc(8);
                // buf.writeBigUInt64LE(tracker.sequence + BigInt(1));
                // return buf;
                return writeBigUint64LE(tracker.sequence + BigInt(1));
              })(),
            ],
            HELLO_WORLD_PID
          )
        )
        .catch((err) => {
          toast.error("Failed to get program sequence tracker");
          console.log("err:", err);
        });

      if (!message2) {
        return;
      }

      const wormholeAccounts2 = getPostMessageCpiAccounts(
        program.programId,
        CORE_BRIDGE_PID,
        solPublicKey,
        message2
      );
      console.log("wormholeAccounts2:", wormholeAccounts2);

      const message = hexStringToUint8Array(txPayload);
      try {
        const params = {
          config: realConfig,
          wormholeProgram: CORE_BRIDGE_PID,
          ...wormholeAccounts2,
        };
        const ix1 = program.methods.sendMessage(Buffer.from(message));
        const ix2 = ix1.accountsStrict(params);
        const ix3 = await ix2.instruction();
        const tx3 = new Transaction().add(ix3);
        tx3.feePayer = solPublicKey;
        tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signature = await sendTransaction(tx3, connection);
        const latestBlockhash = await connection.getLatestBlockhash();

        // Send transaction and await for signature
        await connection.confirmTransaction(
          { signature, ...latestBlockhash },
          "confirmed"
        );

        onChange(false);
        handleTransactionSuccess(
          signature,
          getExplorerLink("tx", signature, "devnet")
        );
      } catch (error: any) {
        onChange(false);
        toast.error(`Transaction failed! ${error.message}`);
      }
    } else {
      const tokenMintAddress = getSolTokenMintAddress(
        tokenSymbol,
        cluster.name
      );
      transferSolToken({
        tokenMintPublicKey: new PublicKey(tokenMintAddress),
        destination: new PublicKey(destination),
        amount: parseFloat(amount),
      })
        .then(() => {
          setDestination("");
          setAmount("");
        })
        .finally(() => {
          onChange(false);
        });
    }
  };

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Send className="h-5 w-5 pr-1" />
            Send Token
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>
            Send USDT or USDC to anyone on the network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={tokenSymbol.toUpperCase()}
              readOnly
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={destination}
              onChange={(e) => setDestination(e.target.value.trim())}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled}
                >
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const ReceiveModal = ({
  address,
  open = false,
  onOpenChange,
  withButton = true,
}: {
  address: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text?: string) => {
    if (!text || !navigator) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      console.log(`Copied ${text} to clipboard`);
      // wait 2 seconds and then reset the button
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
      // alert("Copied to clipboard"); // Optionally, show some feedback
      // Toast this shit!
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <HandCoins className="h-5 w-5 pr-1" />
            Receive
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive</DialogTitle>
          <DialogDescription>
            Share your address to request funds
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" defaultValue={address} readOnly />
          </div>
          <Button type="submit" size="sm" className="px-3">
            <span className="sr-only">Copy</span>
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy
                className="h-4 w-4"
                onClick={() => copyToClipboard(address)}
              />
            )}
          </Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SendEthModal = ({
  open = false,
  onOpenChange,
  withButton = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const { isConnected, wallet } = useBolarity();
  const { sendTransaction } = useSendTransaction();
  const { data: hash, isPending, writeContract } = useWriteContract();

  useEffect(() => {
    if (destination.length >= 32 && parseFloat(amount) > 0) {
      setIsSendDisabled(false);
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount]);

  const handleSend = async () => {
    console.log(`Send ${amount} to ${destination}`);

    if (!wallet) {
      toast.error("Wallet not connected");
      return;
    }

    // Determine if the destination address is SOL or ETH
    if (destination.startsWith("0x")) {
      const amountInWei = parseEther(amount); // Convert ETH to wei
      // Transfer to ETH address
      sendTransaction(
        {
          to: destination as `0x${string}`,
          value: amountInWei,
        },
        {
          onSuccess: (hash) => {
            onChange(false);
            handleTransactionSuccess(
              hash,
              `https://sepolia.etherscan.io/tx/${hash}`
            );
          },
          onError: (error) => {
            onChange(false);
            toast.error(`Transaction failed: ${error.message}`);
          },
        }
      );
    } else {
      const amountInWei = parseUnits(amount, 9); // Convert ETH to wei
      // Transfer to Solana address
      const { address: solAddress } = wallet;
      const destinationPublicKey = new PublicKey(destination);
      if (!solAddress) {
        toast.error("You need to activate Solana account first");
        return;
      }
      const HELLO_WORLD_PID = new PublicKey(
        "CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs"
      );
      const realForeignEmitterChain = 10002;
      const paras = sliceBuffer(sha256("transfer"), 0, 8);
      // const buf = Buffer.alloc(8);
      // buf.writeBigUint64LE(amountInWei, 0);
      const encodedParams = Buffer.concat([
        paras,
        writeBigUint64LE(amountInWei),
      ]);
      const { evmAddress } = wallet;
      const ethAddress = rightAlignBuffer(
        Buffer.from(hexStringToUint8Array(evmAddress))
      );
      console.log(encodedParams);

      const AccountMeta = {
        array: {
          type: { struct: { writeable: "bool", is_signer: "bool" } },
        },
      };
      const RawDataSchema = {
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
      };

      const encodeMeta = serialize(AccountMeta, [
        { writeable: true, is_signer: true },
        { writeable: true, is_signer: false },
      ]);
      const realForeignEmitter = deriveAddress(
        [
          Buffer.from("pda"),
          (() => {
            return writeUInt16LE(realForeignEmitterChain);
          })(),
          ethAddress,
        ],
        HELLO_WORLD_PID
      );
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
      };
      const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));

      const evmContractAddress = EVM_CONTRACT_ADDRESS;
      writeContract(
        {
          address: evmContractAddress,
          abi: UNI_PROXY.abi,
          functionName: "sendMessage",
          args: [toHex(RawDataEncoded)],
        },
        {
          onSuccess: (hash) => {
            onChange(false);
            handleTransactionSuccess(
              hash,
              `https://sepolia.etherscan.io/tx/${hash}`
            );
          },
          onError: (error) => {
            onChange(false);
            toast.error(`Transaction failed: ${error.message}`);
          },
        }
      );
    }
  };

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Confirming...", {
        id: hash,
      });
    }
    if (isConfirmed && hash) {
      handleTransactionSuccess(
        hash as string,
        `https://sepolia.etherscan.io/tx/${hash}`
      );
    }
  }, [hash, isConfirmed, isConfirming]);

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Send className="h-5 w-5 pr-1" />
            Send
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>
            Send SOL or ETH to anyone on the network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={destination}
              onChange={(e) => setDestination(e.target.value.trim())}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled}
                >
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SendEthTokenModal = ({
  tokenSymbol,
  open = false,
  onOpenChange,
  withButton = true,
}: {
  tokenSymbol: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withButton?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isSendDisabled, setIsSendDisabled] = useState(true);
  const { isConnected, wallet } = useBolarity();
  const { writeContract } = useWriteContract();

  useEffect(() => {
    if (destination.length >= 32 && parseFloat(amount) > 0) {
      setIsSendDisabled(false);
    } else {
      setIsSendDisabled(true);
    }
  }, [destination, amount]);

  const handleSend = async () => {
    console.log(`Send ${amount} to ${destination}`);

    if (!isConnected || !wallet) {
      toast.error("Wallet not connected.");
      return;
    }

    // Determine if the destination address is SOL or ETH
    if (destination.startsWith("0x")) {
      const TOKEN_ADDRESS =
        tokenSymbol === CurrencyEnum.USDC
          ? "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
          : "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
      const USDT_ABI = [
        {
          constant: false,
          inputs: [
            { name: "_to", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ name: "", type: "bool" }],
          type: "function",
        },
      ];

      writeContract(
        {
          abi: USDT_ABI,
          address: TOKEN_ADDRESS,
          functionName: "transfer",
          args: [destination, parseUnits(amount.toString(), 6)],
        },
        {
          onSuccess: (hash) => {
            onChange(false);
            handleTransactionSuccess(
              hash,
              `https://sepolia.etherscan.io/tx/${hash}`
            );
          },
          onError: (error) => {
            onChange(false);
            toast.error(`Transaction failed: ${error.message}`);
          },
          onSettled: (hash) => {
            toast.loading("Transaction submitted");
          },
        }
      );
    } else {
      // Transfer to Solana address
      const amountInWei = parseUnits(amount.toString(), 6);
      const { address: solAddress } = wallet;
      const destinationPublicKey = new PublicKey(destination);

      if (!solAddress) {
        toast.error("You need to activate Solana account first");
        return;
      }

      const HELLO_WORLD_PID = new PublicKey(
        "CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs"
      );
      const realForeignEmitterChain = 10002;
      const { evmAddress } = wallet;
      const ethAddress = rightAlignBuffer(
        Buffer.from(hexStringToUint8Array(evmAddress))
      );

      const AccountMeta = {
        array: {
          type: { struct: { writeable: "bool", is_signer: "bool" } },
        },
      };
      const RawDataSchema = {
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
      };
      const myParametersSchema = { struct: { value1: "u8", value2: "u8" } };
      class MyParameters {
        value1: number;
        value2: number;
        constructor(value1: number, value2: number) {
          this.value1 = value1;
          this.value2 = value2;
        }
      }

      const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
      const [myStorage, _bump] = PublicKey.findProgramAddressSync(
        [],
        new PublicKey(programTest)
      );
      const params = new MyParameters(2, 2);
      const encoded = serialize(myParametersSchema, params);
      const paras = sliceBuffer(sha256("global:set"), 0, 8);
      const encodedParams = Buffer.concat([paras, encoded]);
      const encodeMeta = serialize(AccountMeta, [
        { writeable: true, is_signer: false },
      ]);
      const RawData = {
        chain_id: realForeignEmitterChain,
        caller: ethAddress,
        programId: new PublicKey(programTest).toBuffer(),
        acc_count: 1,
        accounts: [
          {
            key: myStorage.toBuffer(),
            isWritable: true,
            isSigner: false,
          },
        ],
        paras: encodedParams,
        acc_meta: Buffer.from(encodeMeta),
      };
      const RawDataEncoded = Buffer.from(serialize(RawDataSchema, RawData));
      console.log(RawDataEncoded);

      const evmContractAddress = EVM_CONTRACT_ADDRESS;
      writeContract(
        {
          address: evmContractAddress,
          abi: UNI_PROXY.abi,
          functionName: "sendMessage",
          args: [toHex(RawDataEncoded)],
        },
        {
          onSuccess: (hash) => {
            onChange(false);
            handleTransactionSuccess(
              hash,
              `https://sepolia.etherscan.io/tx/${hash}`
            );
          },
          onError: (error) => {
            onChange(false);
            toast.error(`Transaction failed: ${error.message}`);
          },
        }
      );
    }
  };

  const onChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      {withButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Send className="h-5 w-5 pr-1" />
            Send Token
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send</DialogTitle>
          <DialogDescription>
            Send USDT or USDC to anyone on the network
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={tokenSymbol.toUpperCase()}
              readOnly
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Input destination address"
              className="col-span-3"
              value={destination}
              onChange={(e) => setDestination(e.target.value.trim())}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              type="number"
              step="any"
              id="amount"
              placeholder="amount"
              className="col-span-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  onClick={handleSend}
                  disabled={isSendDisabled}
                >
                  Send
                </Button>
              </TooltipTrigger>
              {isSendDisabled && (
                <TooltipContent>
                  <p>Invalid Input</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
