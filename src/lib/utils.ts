import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  PublicKey,
  AccountInfo,
  ParsedAccountData,
  Connection,
  Cluster,
  PublicKeyInitData,
} from "@solana/web3.js";
import { MintLayout } from "@solana/spl-token";
import { createHash } from "crypto";
import { isAddress } from "viem";
import * as anchor from "@coral-xyz/anchor";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { ChainId } from "@certusone/wormhole-sdk";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeSince(blockTime: number | null | undefined): string {
  if (blockTime === null || blockTime === undefined) {
    return "Unknown time";
  }

  const eventDate = new Date(blockTime * 1000);
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - eventDate.getTime()) / 1000
  );
  const diffInHours = diffInSeconds / 3600;
  const diffInDays = diffInHours / 24;

  if (diffInHours < 24) {
    return `${diffInHours.toFixed()} hours ago`;
  } else {
    return `${diffInDays.toFixed()} days ago`;
  }
}

export function ellipsify(str = "", len = 4) {
  if (str.length > 30) {
    return (
      str.substring(0, len) +
      "..." +
      str.substring(str.length - len, str.length)
    );
  }
  return str;
}

export type EnhancedAccount = {
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData>;
  isMintAuthority: boolean;
};

type TokenAccount = {
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData>;
};

export async function enhanceAccountsWithMintAuthority(
  accounts: TokenAccount[],
  connection: Connection,
  userAddress: PublicKey
): Promise<EnhancedAccount[]> {
  const enhancedAccounts = await Promise.all(
    accounts.map(async (account) => {
      const mintAddress = new PublicKey(account.account.data.parsed.info.mint);
      const mintAccountInfo = await connection.getAccountInfo(mintAddress);
      if (!mintAccountInfo) throw new Error("Failed to find mint account");

      const mintData = MintLayout.decode(mintAccountInfo.data);
      const isMintAuthority =
        mintData.mintAuthority &&
        new PublicKey(mintData.mintAuthority).equals(userAddress);

      // Ensure the returned object matches the EnhancedAccount type
      return {
        pubkey: account.pubkey,
        account: account.account,
        isMintAuthority,
      };
    })
  );

  return enhancedAccounts;
}

export function formatPercentage(value: string): string {
  const numericValue = parseFloat(value);

  // Round up if the third decimal digit is >= 5
  const roundedValue = Math.round(numericValue * 100) / 100;

  // Format with two decimal places and append the percentage symbol
  return `${roundedValue.toFixed(2)}%`;
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.startsWith("0x")) {
    hexString = hexString.slice(2);
  }

  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const byteArray = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < hexString.length; i += 2) {
    const hexPair = hexString.slice(i, i + 2);
    byteArray[i / 2] = parseInt(hexPair, 16);
  }

  return byteArray;
}

export function rightAlignBuffer(data: Buffer): Buffer {
  const buffer = Buffer.alloc(32);
  const dataLength = data.length;
  if (dataLength > 32) {
    throw new Error("Data exceeds 32 bytes");
  }
  data.copy(buffer, 32 - dataLength, 0, dataLength);
  return buffer;
}

export function sha256(input: string): Buffer {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest();
}

export function sliceBuffer(
  buffer: Buffer,
  start: number,
  end: number
): Buffer {
  // 转换为 Uint8Array
  const uint8Array = new Uint8Array(buffer);
  // 使用 subarray 切片
  const slicedArray = uint8Array.subarray(start, end);

  return Buffer.from(slicedArray);
}

export function writeBigUint64LE(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8); // 64 bits = 8 bytes
  const view = new DataView(buffer);
  view.setBigUint64(0, value, true); // true 表示小端序 (Little Endian)
  return new Uint8Array(buffer); // 将 ArrayBuffer 转换为 Uint8Array
}

export function writeUInt16LE(value: number): Uint8Array {
  // 检查 value 是否为合法的 16 位整数
  if (value < 0 || value > 0xffff) {
    throw new Error("Value is out of range for a 16-bit unsigned integer.");
  }

  // 创建一个 2 字节的 ArrayBuffer
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);

  // 写入 16 位无符号整数（小端）
  view.setUint16(0, value, true); // true 表示小端序

  // 返回一个 Uint8Array
  return new Uint8Array(buffer);
}

export function formatRecipientAddress(address: string) {
  // 去掉 '0x' 前缀（如果有）
  const cleanAddress = address.startsWith("0x") ? address.slice(2) : address;
  // 补齐 32 字节长度（64 个字符）
  const paddedAddress = cleanAddress.padStart(64, "0");
  console.log("paddedAddress", paddedAddress);
  return Buffer.from(paddedAddress, "hex");
}

const encodeURL = (baseUrl: string, searchParams: Record<string, string>) => {
  // This was a little new to me, but it's the
  // recommended way to build URLs with query params
  // (and also means you don't have to do any encoding)
  // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
  const url = new URL(baseUrl);
  url.search = new URLSearchParams(searchParams).toString();
  return url.toString();
};

export const getExplorerLink = (
  linkType: "transaction" | "tx" | "address" | "block",
  id: string,
  cluster: Cluster | "localnet" = "mainnet-beta"
): string => {
  const searchParams: Record<string, string> = {};
  if (cluster !== "mainnet-beta") {
    if (cluster === "localnet") {
      // localnet technically isn't a cluster, so requires special handling
      searchParams["cluster"] = "custom";
      searchParams["customUrl"] = "http://localhost:8899";
    } else {
      searchParams["cluster"] = cluster;
    }
  }
  let baseUrl: string = "";
  if (linkType === "address") {
    baseUrl = `https://explorer.solana.com/address/${id}`;
  }
  if (linkType === "transaction" || linkType === "tx") {
    baseUrl = `https://explorer.solana.com/tx/${id}`;
  }
  if (linkType === "block") {
    baseUrl = `https://explorer.solana.com/block/${id}`;
  }
  return encodeURL(baseUrl, searchParams);
};

export function isValidPublicKey(address: string | null | undefined): boolean {
  if (!address) return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export const isValidEvmAddress = (address?: string): boolean => {
  return address ? isAddress(address) : false;
};

export const getProvider = (wallet: any, connection: Connection) => {
  return new anchor.AnchorProvider(connection, wallet);
};

export const deriveEthAddressKey = (
  programId: PublicKeyInitData,
  chain: ChainId,
  address: PublicKey
) => {
  return deriveAddress(
    [
      Buffer.from("pda"),
      (() => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(chain);
        return buf;
      })(),
      address.toBuffer(),
    ],
    programId
  );
};

export const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  toast.error(message);
};

export const handleTransactionSuccess = (
  hash: string,
  url: string,
  msg: string = "Transaction "
) => {
  toast.success(`${msg} Successfull`, {
    description: ellipsify(hash),
    action: {
      label: "Explorer Link",
      onClick: () => window.open(url, "_blank"),
    },
    duration: 10000,
  });
};

export const wait = (time: number) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

export const isSolanaAddress = (address: string) => {
  try {
    // 尝试创建一个 PublicKey 实例
    const publicKey = new PublicKey(address);

    // 检查地址是否解码为32字节
    // return PublicKey.isOnCurve(publicKey.toBytes());
    return publicKey && true;
  } catch (error) {
    // 如果报错，说明不是有效的Solana地址
    return false;
  }
};
