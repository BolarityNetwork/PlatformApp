import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

// Read unsigned little-endian 64-bit as BN
function readUnsignedBigInt64LE(buffer: Buffer, offset: number): BN {
  return new BN(buffer.slice(offset, offset + 8), "le");
}
// Read signed little-endian 64-bit as BN
function readSignedBigInt64LE(buffer: Buffer, offset: number): BN {
  const uv = new BN(buffer.slice(offset, offset + 8), "le");
  return uv.testn(63) ? uv.sub(new BN(1).ushln(64)).toTwos(64) : uv;
}
// Read unsigned little-endian 128-bit as BN
function readU128LE(buffer: Buffer, offset: number): BN {
  const low = buffer.readBigUInt64LE(offset);
  const high = buffer.readBigUInt64LE(offset + 8);
  return new BN(high.toString()).ushln(64).iadd(new BN(low.toString()));
}

// Decode user PDA
export function decodeUser(buffer: Buffer) {
  let offset = 8;
  offset += 32 + 32 + 32; // skip authority, delegate, name
  const spots = [];
  for (let i = 0; i < 8; i++) {
    const scaledBalance = readUnsignedBigInt64LE(buffer, offset);
    const openOrders = buffer.readUInt8(offset + 35);
    if (!scaledBalance.isZero() || openOrders !== 0) {
      const openBids = readSignedBigInt64LE(buffer, offset + 8);
      const openAsks = readSignedBigInt64LE(buffer, offset + 16);
      const cumulativeDeposits = readSignedBigInt64LE(buffer, offset + 24);
      const marketIndex = buffer.readUInt16LE(offset + 32);
      const balanceType =
        buffer.readUInt8(offset + 34) === 0 ? "DEPOSIT" : "BORROW";
      spots.push({
        scaledBalance,
        openBids,
        openAsks,
        cumulativeDeposits,
        marketIndex,
        balanceType,
        openOrders,
      });
    }
    offset += 40;
  }
  return spots;
}

// Decode SpotMarket account
export async function decodeSpotMarket(
  conn: Connection,
  marketPubkey: PublicKey
) {
  const info = await conn.getAccountInfo(marketPubkey);
  if (!info) throw new Error("Market account not found");
  const data = info.data;
  const decimals = data.readUInt32LE(680);
  const marketIndex = data.readUInt16LE(684);
  const depositBalance = readU128LE(data, 432);
  const cumulativeDepositInterest = readU128LE(data, 432 + 32);
  return { decimals, marketIndex, cumulativeDepositInterest };
}
