import { ethers} from "hardhat";
import fs from 'fs';
import {
  PublicKey,
  PublicKeyInitData,
} from "@solana/web3.js";
import { createHash } from 'crypto';
const borsh = require('borsh');

function deriveAddress(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKeyInitData
): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, new PublicKey(programId))[0];
}

function deriveWormholeEmitterKey(
  emitterProgramId: PublicKeyInitData
): PublicKey {
  return deriveAddress([Buffer.from("emitter")], emitterProgramId);
}

function sha256(input: string): Buffer {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest();
}
function rightAlignBuffer(data: Buffer): Buffer {
  const buffer = Buffer.alloc(32);
  const dataLength = data.length;
  if (dataLength > 32) {
      throw new Error("Data exceeds 32 bytes");
  }
  data.copy(buffer, 32 - dataLength, 0, dataLength);
  return buffer;
}

function hexStringToUint8Array(hexString: string): Uint8Array {
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

function deriveEthAddressKey(
  programId: PublicKeyInitData,
  chain: ChainId,
  address: PublicKey,
) {
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
}
async function main() {
  // const UniProxy = await ethers.deployContract("UniProxy", ["0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78", 200]);

  // await UniProxy.waitForDeployment();

  // console.log(
  //   `deployed to ${UniProxy.target}`
  // );


  // const targetContractAddressHex = deriveWormholeEmitterKey("CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs")
  //     .toBuffer()
  //     .toString("hex")
  //     console.log(targetContractAddressHex)
  // const receipt = await UniProxy.setRegisteredSender(1, targetContractAddressHex);
  // console.log(receipt.hash)
  // const uniProxy_factory = await ethers.getContractFactory("UniProxy");
  // const UniProxy = await uniProxy_factory.attach('0xDd212d65D93dD4Da7CB4d12Fc604306fA325B3C5');
  // const targetContractAddressHex = "0xaac824d6e431b2a5021ab896d74701cc5fbf5ef13744e48f91fc8c7b3fc70292";
  // const receipt = await UniProxy.setRegisteredSender(1, targetContractAddressHex);
  // console.log(receipt.hash)

  // =============solana控制eth合约=========================================
//   const coder = ethers.AbiCoder.defaultAbiCoder();
//       const USDT_CONTRACT_ADDRESS = "0xDB5492265f6038831E89f495670FF909aDe94bd9";
// const USDT_ABI = [
//     "function completeTransfer(bytes memory encodedVm) external",
// ];
// const signer = await ethers.provider.getSigner();
// const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
// const vaa = hexStringToUint8Array("010000000001004bee4678b1f72515e8a13a34106891588bd371a67ced8544ad3e3e8b79ca0a5739af6ac5ffebc736c9ad77f9dbcc3f2eef7d8ed1a2c186b13dccfb533fd81004016729d70e00010f3a00013b26409f8aaded3f5ddca184695aa6a0fa829b0c85caf84856324896d214ca9800000000000073c120010000000000000000000000000000000000000000000000000000000005f5e100069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f000000000010001000000000000000000000000a550c6011dfba4925abeb0b48104062682870bb827120000000000000000000000000000000000000000000000000000000000000000");
// const encodeVaa = coder.encode(["bytes"],[vaa]);
// console.log(encodeVaa);
// const tx = await usdtContract.completeTransfer(vaa);
// console.log(tx.hash)
  // // 查询地址
  // const uniProxy_factory = await ethers.getContractFactory("UniProxy");
  // const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
  // const sourceChain = 1;// solana
  // const userAddress = ethers.zeroPadValue(new PublicKey("7XoxoZhZRbBKuSTTHkZJ5NasRbP7rAPqPWkGJdsRDvdU").toBytes(), 32);
  // const proxyAddress = await UniProxy.proxys(sourceChain, userAddress);
  // console.log(proxyAddress);

  // // 激活地址,需要在solana端操作,拼装数据
  // const contractAddress = new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes();
  // const sourceAddress = coder.encode(["bytes32"],[Buffer.from(contractAddress)]);
  // const payload = coder.encode(["bytes32", "bytes"], [sourceAddress, Buffer.from([0])])
  // console.log(payload)

  // // 给某个地址转账
  // const sourceContract = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);
  // const other_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x049B426457B5A75e0e25F0b692dF581a06035647')), 32)])
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [other_address,BigInt(10000000000000000), Buffer.from([0])])
  // const txPayload = coder.encode(["bytes32", "bytes"], [sourceContract, payload_part])
  // console.log(txPayload)

  // // 调用合约方法
  // const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("HD4ktk6LUewd5vMePdQF6ZtvKi3mC41AD3ZM3qJW8N8e").toBytes())]);
  // const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from([0x8B,0xA7,0x60,0x8b,0x74,0x13,0x75,0x7F,0x01,0x1d,0x76,0x3a,0x19,0xfE,0x17,0xcd,0x58,0x18,0xcD,0xE3]), 32)])
  // let ABI = ["function store(uint256 num)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("store", [666]);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address,0, paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)

  // 以上生成的palyload传递给message
      // // get sequence
    // const message2 = await getProgramSequenceTracker(provider.connection, program.programId, CORE_BRIDGE_PID)
    //     .then((tracker) =>
    //         deriveAddress(
    //             [
    //               Buffer.from("sent"),
    //               (() => {
    //                 const buf = Buffer.alloc(8);
    //                 buf.writeBigUInt64LE(tracker.sequence + 1n);
    //                 return buf;
    //               })(),
    //             ],
    //             HELLO_WORLD_PID
    //         )
    //     );
    // const wormholeAccounts2 = getPostMessageCpiAccounts(
    //     program.programId,
    //     CORE_BRIDGE_PID,
    //     adminKeypair.publicKey,
    //     message2
    // );

  //  const message = hexStringToUint8Array("")
  //   const ix3 = program.methods
  //       .sendMessage(Buffer.from(message))
  //       .accounts({
  //         config: realConfig,
  //         wormholeProgram: CORE_BRIDGE_PID,
  //         ...wormholeAccounts2,
  //       })
  //       .instruction();
  //   const tx3 = new Transaction().add(await ix3);
  //   try {
  //     let commitment: Commitment = 'confirmed';
  //     await sendAndConfirmTransaction(provider.connection, tx3, [adminKeypair], {commitment});
  //   }
  //   catch (error: any) {
  //     console.log(error);
  //   }

//     // 获取usdt的余额
//     const USDT_CONTRACT_ADDRESS = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
// const USDT_ABI = [
//     "function balanceOf(address owner) view returns (uint256)",
//     "function transfer(address to, uint256 value) returns (bool)",
// ];
// const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, ethers.provider);

// // 获取余额
// const balance = await usdtContract.balanceOf("0xD00c212f8Cc24CdB897D5CE4eD1962Ca0A52f709");//自己的地址
// console.log(balance)
// // 转账usdt
// const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);//solanda对应的eth地址
//   const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0')), 32)])//usdt合约地址
//   let ABI = ["function transfer(address to, uint256 value) returns (bool)"];
//   let iface = new ethers.Interface(ABI);
//   let paras = iface.encodeFunctionData("transfer", ['0xa550C6011DfBA4925abEb0B48104062682870BB8', BigInt('100000000')]);//100usdt, usdt 6位精度
//   let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0 , paras])
//   const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
//   console.log(payload)

  //   // 查询Deposit的usdt
  //   const AAVE_CONTRACT_ADDRESS = "0x69529987fa4a075d0c00b0128fa848dc9ebbe9ce";
  //   const AAVE_ABI = [{"inputs":[{"internalType":"contract IPoolAddressesProvider","name":"provider","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"getUserReservesData","outputs":[{"components":[{"internalType":"address","name":"underlyingAsset","type":"address"},{"internalType":"uint256","name":"scaledATokenBalance","type":"uint256"},{"internalType":"bool","name":"usageAsCollateralEnabledOnUser","type":"bool"},{"internalType":"uint256","name":"stableBorrowRate","type":"uint256"},{"internalType":"uint256","name":"scaledVariableDebt","type":"uint256"},{"internalType":"uint256","name":"principalStableDebt","type":"uint256"},{"internalType":"uint256","name":"stableBorrowLastUpdateTimestamp","type":"uint256"}],"internalType":"struct IUiPoolDataProviderV3.UserReserveData[]","name":"","type":"tuple[]"},{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  // {"inputs":[{"internalType":"contract IPoolAddressesProvider","name":"provider","type":"address"}],"name":"getReservesData","outputs":[{"components":[{"internalType":"address","name":"underlyingAsset","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint256","name":"decimals","type":"uint256"},{"internalType":"uint256","name":"baseLTVasCollateral","type":"uint256"},{"internalType":"uint256","name":"reserveLiquidationThreshold","type":"uint256"},{"internalType":"uint256","name":"reserveLiquidationBonus","type":"uint256"},{"internalType":"uint256","name":"reserveFactor","type":"uint256"},{"internalType":"bool","name":"usageAsCollateralEnabled","type":"bool"},{"internalType":"bool","name":"borrowingEnabled","type":"bool"},{"internalType":"bool","name":"stableBorrowRateEnabled","type":"bool"},{"internalType":"bool","name":"isActive","type":"bool"},{"internalType":"bool","name":"isFrozen","type":"bool"},{"internalType":"uint128","name":"liquidityIndex","type":"uint128"},{"internalType":"uint128","name":"variableBorrowIndex","type":"uint128"},{"internalType":"uint128","name":"liquidityRate","type":"uint128"},{"internalType":"uint128","name":"variableBorrowRate","type":"uint128"},{"internalType":"uint128","name":"stableBorrowRate","type":"uint128"},{"internalType":"uint40","name":"lastUpdateTimestamp","type":"uint40"},{"internalType":"address","name":"aTokenAddress","type":"address"},{"internalType":"address","name":"stableDebtTokenAddress","type":"address"},{"internalType":"address","name":"variableDebtTokenAddress","type":"address"},{"internalType":"address","name":"interestRateStrategyAddress","type":"address"},{"internalType":"uint256","name":"availableLiquidity","type":"uint256"},{"internalType":"uint256","name":"totalPrincipalStableDebt","type":"uint256"},{"internalType":"uint256","name":"averageStableRate","type":"uint256"},{"internalType":"uint256","name":"stableDebtLastUpdateTimestamp","type":"uint256"},{"internalType":"uint256","name":"totalScaledVariableDebt","type":"uint256"},{"internalType":"uint256","name":"priceInMarketReferenceCurrency","type":"uint256"},{"internalType":"address","name":"priceOracle","type":"address"},{"internalType":"uint256","name":"variableRateSlope1","type":"uint256"},{"internalType":"uint256","name":"variableRateSlope2","type":"uint256"},{"internalType":"uint256","name":"stableRateSlope1","type":"uint256"},{"internalType":"uint256","name":"stableRateSlope2","type":"uint256"},{"internalType":"uint256","name":"baseStableBorrowRate","type":"uint256"},{"internalType":"uint256","name":"baseVariableBorrowRate","type":"uint256"},{"internalType":"uint256","name":"optimalUsageRatio","type":"uint256"},{"internalType":"bool","name":"isPaused","type":"bool"},{"internalType":"bool","name":"isSiloedBorrowing","type":"bool"},{"internalType":"uint128","name":"accruedToTreasury","type":"uint128"},{"internalType":"uint128","name":"unbacked","type":"uint128"},{"internalType":"uint128","name":"isolationModeTotalDebt","type":"uint128"},{"internalType":"bool","name":"flashLoanEnabled","type":"bool"},{"internalType":"uint256","name":"debtCeiling","type":"uint256"},{"internalType":"uint256","name":"debtCeilingDecimals","type":"uint256"},{"internalType":"uint8","name":"eModeCategoryId","type":"uint8"},{"internalType":"uint256","name":"borrowCap","type":"uint256"},{"internalType":"uint256","name":"supplyCap","type":"uint256"},{"internalType":"uint16","name":"eModeLtv","type":"uint16"},{"internalType":"uint16","name":"eModeLiquidationThreshold","type":"uint16"},{"internalType":"uint16","name":"eModeLiquidationBonus","type":"uint16"},{"internalType":"address","name":"eModePriceSource","type":"address"},{"internalType":"string","name":"eModeLabel","type":"string"},{"internalType":"bool","name":"borrowableInIsolation","type":"bool"}],"internalType":"struct IUiPoolDataProviderV3.AggregatedReserveData[]","name":"","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"marketReferenceCurrencyUnit","type":"uint256"},{"internalType":"int256","name":"marketReferenceCurrencyPriceInUsd","type":"int256"},{"internalType":"int256","name":"networkBaseTokenPriceInUsd","type":"int256"},{"internalType":"uint8","name":"networkBaseTokenPriceDecimals","type":"uint8"}],"internalType":"struct IUiPoolDataProviderV3.BaseCurrencyInfo","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}];
  //   const aavetContract = new ethers.Contract(AAVE_CONTRACT_ADDRESS, AAVE_ABI, ethers.provider);
  //   try {
  //     const reserves = await aavetContract.getUserReservesData("0x012bac54348c0e635dcac9d5fb99f06f24136c9a","0xa550C6011DfBA4925abEb0B48104062682870BB8");//自己的地址
  //     let scaledATokenBalance;
  //     let liquidityIndex ;
  //     let liquidityRate;
  //     for (const item of reserves[0]) {
  //       if (item[0]=="0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0") {
  //         console.log(item);
  //         scaledATokenBalance = item[1];
  //       }
  //     }
  //     const reservesData = await aavetContract.getReservesData("0x012bac54348c0e635dcac9d5fb99f06f24136c9a");
  //     for (const item of reservesData[0]) {
  //       if (item[0]=="0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0") {
  //         console.log(item);
  //         liquidityIndex= item[13]
  //         liquidityRate = item[15]
  //       }
  //     }
  //     const tenToThe27: BigInt = BigInt(10 ** 27);
  //     const balance: BigInt = (scaledATokenBalance * liquidityIndex) / tenToThe27;
  //     console.log(balance)//usdt 6位精度,自行修改显示
  //     // const RAY = BigInt(10**27) // 10 to the power 27
  //     // const SECONDS_PER_YEAR = 31536000

  //     // const depositAPR = liquidityRate/RAY
  //     // console.log(depositAPR);
  //     // // const depositAPY = ((1 + (depositAPR / SECONDS_PER_YEAR)) ^ SECONDS_PER_YEAR) - 1
  //     // const depositAPRNumber = Number(depositAPR) / Number(SECONDS_PER_YEAR);
  //     // const depositAPY = (Math.pow(1 + depositAPRNumber, Number(SECONDS_PER_YEAR)) - 1);
  //     // console.log(depositAPY)
  //   } catch (error) {
  //       console.error('Error fetching reserves data:', error);
  //   }


  // // 调用aave的合约
  // const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);//自己的solana地址
  // const proxyAddress = '0xD00c212f8Cc24CdB897D5CE4eD1962Ca0A52f709';//自己生成的eth地址
  //   // Approve USDT
  // const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0')), 32)])
  // let ABI = ["function approve(address to, uint256 tokenId)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("approve", ['0x6ae43d3271ff6888e7fc43fd7321a503ff738951', BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")]);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)

  //   // Deposit USDT,使用前需要approve usdt
  //   const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951')), 32)])
  //   let ABI = ["function supply(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)"];
  //   let iface = new ethers.Interface(ABI);
  //   let paras = iface.encodeFunctionData("supply", ['0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0', 100000000, proxyAddress, 0]);//100usdt, usdt 6位精度
  //   let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
  //   const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  //   console.log(payload)

  //   // withdraw USDT
  // const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951')), 32)])
  // let ABI = ["function withdraw(address asset,uint256 amount,address to)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("withdraw", ['0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0', BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), proxyAddress]);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)


  // // Deposit ETH
  //   const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x387d311e47e80b498169e6fb51d3193167d89F7D')), 32)])
  // let ABI = ["function depositETH(address ,address onBehalfOf,uint16 referralCode)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("depositETH", ['0x6ae43d3271ff6888e7fc43fd7321a503ff738951', '0xD00c212f8Cc24CdB897D5CE4eD1962Ca0A52f709', 0]);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address,BigInt(100000000000000000), paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)
  // // approve
  // const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830')), 32)])
  // let ABI = ["function approve(address spender,uint256 amount)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("approve", ['0x387d311e47e80b498169e6fb51d3193167d89f7d', BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")]);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)

  // // withdrawETH
  // const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x387d311e47e80b498169e6fb51d3193167d89F7D')), 32)])
  // let ABI = ["function withdrawETH(address ,uint256 amount,address to)"];
  // let iface = new ethers.Interface(ABI);
  // let paras = iface.encodeFunctionData("withdrawETH", ['0x6ae43d3271ff6888e7fc43fd7321a503ff738951', BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), '0xD00c212f8Cc24CdB897D5CE4eD1962Ca0A52f709']);
  // let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
  // const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
  // console.log(payload)


  //=================================eth控制solana合约============================================================
  // // 获取地址,计算得到eth对应的solana地址
  // const HELLO_WORLD_PID = new PublicKey("CLErExd7gNADvu5rDFmkFD1uAt7zksJ3TDfXsJqJ4QTs");
  // const realForeignEmitterChain = 10002;
  // const ethAddress = rightAlignBuffer(Buffer.from(hexStringToUint8Array('0x049B426457B5A75e0e25F0b692dF581a06035647')));
  // const addressKey = await deriveEthAddressKey(HELLO_WORLD_PID, realForeignEmitterChain, new PublicKey(ethAddress));
  // console.log(addressKey.toBase58())
  // // //获取余额
  // // try {
  // //     const balance = await anchor.getProvider().connection.getBalance(addressKey);
  // //     console.log(`${balance / 1e9} SOL`);
  // // }
  // // catch (error: any) {
  // //     console.log(error);
  // // }
 
  // const myParametersSchema ={ struct: {'value1':'u8', 'value2':'u8'}}
  // class MyParameters {
  //   value1: number;
  //   value2: number;
  
  //   constructor(value1: number, value2: number) {
  //       this.value1 = value1;
  //       this.value2 = value2;
  //   }
  // }
  // const AccountMeta = {
  //   array: {
  //       type: {struct:{writeable:'bool', is_signer:'bool'}},
  //   }
  // }
  // const RawDataSchema = {
  //   struct:{
  //       chain_id:'u16',
  //       caller:{array: {type:'u8', len:32}},
  //       programId:{array: {type:'u8', len:32}},
  //       acc_count:'u8',
  //       accounts:{
  //           array: {
  //               type: {
  //                   struct:{
  //                       key:{array: {type:'u8', len:32}},
  //                       isWritable:'bool',
  //                       isSigner:'bool'
  //                   }
  //               },
  //           }
  //       },
  //       paras: {array: {type:'u8'}},
  //       acc_meta: {array: {type:'u8'}},
  //   }
  // };
  // //激活地址
//   const paras = sha256("active").slice(0, 8);
//   const encodedParams = Buffer.concat([paras]);
//   console.log(encodedParams)

//   const encodeMeta = borsh.serialize(AccountMeta, [{writeable:true, is_signer:false}]);
//   const realForeignEmitter = deriveAddress(
//     [
//         Buffer.from("pda"),
//         (() => {
//             const buf = Buffer.alloc(2);
//             buf.writeUInt16LE(realForeignEmitterChain);
//             return buf;
//         })(),
//         ethAddress,
//     ],
//     HELLO_WORLD_PID
// );
//   const RawData = {
//       chain_id: realForeignEmitterChain,
//       caller: ethAddress,
//       programId:new PublicKey(HELLO_WORLD_PID).toBuffer(),
//       acc_count:1,
//       accounts:[
//           {
//               key: realForeignEmitter.toBuffer(),
//               isWritable:true,
//               isSigner: false,
//           }
//       ],
//       paras:encodedParams,
//       acc_meta:Buffer.from(encodeMeta),
//   };
//   const RawDataEncoded = Buffer.from(borsh.serialize(RawDataSchema, RawData));
//   console.log(RawDataEncoded);
//   const uniProxy_factory = await ethers.getContractFactory("UniProxy");
//   const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
//   const receipt = await UniProxy.sendMessage(RawDataEncoded);
//   console.log(receipt.hash)

//   //转账
//   const paras = sha256("transfer").slice(0, 8);
//   const buf = Buffer.alloc(8);
//   buf.writeBigUint64LE(BigInt(100000000),0);
//   const encodedParams = Buffer.concat([paras, buf]);
//   console.log(encodedParams)

//   const encodeMeta = borsh.serialize(AccountMeta, [{writeable:true, is_signer:true},{writeable:true, is_signer:false}]);
//   const realForeignEmitter = deriveAddress(
//     [
//         Buffer.from("pda"),
//         (() => {
//             const buf = Buffer.alloc(2);
//             buf.writeUInt16LE(realForeignEmitterChain);
//             return buf;
//         })(),
//         ethAddress,
//     ],
//     HELLO_WORLD_PID
// );
//   const RawData = {
//       chain_id: realForeignEmitterChain,
//       caller: ethAddress,
//       programId:HELLO_WORLD_PID.toBuffer(),
//       acc_count:2,
//       accounts:[
//           {
//               key: realForeignEmitter.toBuffer(),
//               isWritable:true,
//               isSigner: true,
//           },
//           {
//             key: new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBuffer(),
//             isWritable:true,
//             isSigner: false,
//         }
//       ],
//       paras:encodedParams,
//       acc_meta:Buffer.from(encodeMeta),
//   };
//   const RawDataEncoded = Buffer.from(borsh.serialize(RawDataSchema, RawData));
//   console.log(RawDataEncoded);
//     const exp_RawData = borsh.deserialize(RawDataSchema, Buffer.from(hexStringToUint8Array('0x122700000000000000000000000052389e164444e68178abfa97d32908f00716a408a85e402aa40a85284f7e23509fe379cf48d3a6528e26241440ddee0a6b17001a02020000002c19689fa8ee4a1829b415d4835d26f1d9cf8bb4cc6ca0b1a26610be1952950101017f738048a7e6a5b9943df2948edd24a657fb34c361acc31973689bf487aa9da001001000000027f576cafbb263ed0000b2d3595bf006080000000200000001010100000000000000000000000000000000000000000000')));
//     console.log(exp_RawData);
//     const exp_RawDataq = borsh.deserialize(RawDataSchema, Buffer.from(hexStringToUint8Array('0x1227000000000000000000000000049b426457b5a75e0e25f0b692df581a06035647a85e402aa40a85284f7e23509fe379cf48d3a6528e26241440ddee0a6b17001a02020000003b73ede3ba0dc14a93a5fca3af0f201b45a82ef8bf9885921a17cd29ac8c47d9010157e7e02bc1a9d9b0df22583439844e903278aecd801bf6d8415984099a1be8b201001000000027f576cafbb263ed00e1f50500000000080000000200000001010100000000000000000000000000000000000000000000')));
//     console.log(exp_RawDataq);


//   const uniProxy_factory = await ethers.getContractFactory("UniProxy");
//   const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
//   const receipt = await UniProxy.sendMessage(RawDataEncoded);
//   console.log(receipt.hash)

// 调用合约1
//   const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
//   const paras = sha256("global:tet").slice(0, 8);
//   const encodedParams = Buffer.concat([paras]);

//   const encodeMeta = borsh.serialize(AccountMeta, [{writeable:true, is_signer:true}]);
//   const realForeignEmitter = deriveAddress(
//     [
//         Buffer.from("pda"),
//         (() => {
//             const buf = Buffer.alloc(2);
//             buf.writeUInt16LE(realForeignEmitterChain);
//             return buf;
//         })(),
//         ethAddress,
//     ],
//     HELLO_WORLD_PID
// );
//   const RawData = {
//       chain_id: realForeignEmitterChain,
//       caller: ethAddress,
//       programId:new PublicKey(programTest).toBuffer(),
//       acc_count:1,
//       accounts:[
//           {
//               key: realForeignEmitter.toBuffer(),
//               isWritable:true,
//               isSigner: true,
//           }
//       ],
//       paras:encodedParams,
//       acc_meta:Buffer.from(encodeMeta),
//   };
//   const RawDataEncoded = Buffer.from(borsh.serialize(RawDataSchema, RawData));
//   console.log(RawDataEncoded);
//   const uniProxy_factory = await ethers.getContractFactory("UniProxy");
//   const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
//   const receipt = await UniProxy.sendMessage(RawDataEncoded);
//   console.log(receipt.hash)

//   // 调用合约2
//   const programTest = "DViLwexyLUuKRRXWCQgFYqzoVLWktEbvUVhzKNZ7qTSF";
//   const [myStorage, _bump] = PublicKey.findProgramAddressSync([], new PublicKey(programTest));
//   const params = new MyParameters(2, 2);
//   const encoded = borsh.serialize(myParametersSchema, params);
//   const paras = sha256("global:set").slice(0, 8);
//   const encodedParams = Buffer.concat([paras, encoded]);

//   const encodeMeta = borsh.serialize(AccountMeta, [{writeable:true, is_signer:false}]);
//   const realForeignEmitter = deriveAddress(
//     [
//         Buffer.from("pda"),
//         (() => {
//             const buf = Buffer.alloc(2);
//             buf.writeUInt16LE(realForeignEmitterChain);
//             return buf;
//         })(),
//         ethAddress,
//     ],
//     HELLO_WORLD_PID
// );
//   const RawData = {
//       chain_id: realForeignEmitterChain,
//       caller: ethAddress,
//       programId:new PublicKey(programTest).toBuffer(),
//       acc_count:1,
//       accounts:[
//           {
//               key: myStorage.toBuffer(),
//               isWritable:true,
//               isSigner: false,
//           }
//       ],
//       paras:encodedParams,
//       acc_meta:Buffer.from(encodeMeta),
//   };
//   const RawDataEncoded = Buffer.from(borsh.serialize(RawDataSchema, RawData));
//   console.log(RawDataEncoded);
//   const uniProxy_factory = await ethers.getContractFactory("UniProxy");
//   const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
//   const receipt = await UniProxy.sendMessage(RawDataEncoded);
//   console.log(receipt.hash)


  // =============solana控制eth合约 Intent-centric transaction=========================================
  //  const coder = ethers.AbiCoder.defaultAbiCoder();
  // // 查询地址
  // const uniProxy_factory = await ethers.getContractFactory("UniProxy");
  // const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
  // const sourceChain = 1;// solana
  // const userPadAddress = ethers.zeroPadValue(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes(), 32);//自己的solana地址
  // const proxyAddress = await UniProxy.proxys(sourceChain, userPadAddress);// 对应的eth地址
  // console.log(proxyAddress);
  //================Using RBT to transfer SOL to an address on Solana devnet==================
  // const TOKEN_BRIDGE_RELAYER_CONTRACT = "0x7Fb0D63258caF51D8A35130d3f7A7fd1EE893969";
  // // 查询以太坊上封装token WSOL的余额
  // const WSOL_CONTRACT_ADDRESS = "0x824cb8fc742f8d3300d29f16ca8bee94471169f5";
  // const ERC20_ABI = [
  //     "function balanceOf(address owner) view returns (uint256)",
  //     "function transfer(address to, uint256 value) returns (bool)",
  //     "function approve(address spender,uint256 amount)",
  // ];
  // const signer = await ethers.provider.getSigner();
  // const wsolContract = new ethers.Contract(WSOL_CONTRACT_ADDRESS, ERC20_ABI, signer);
  // // const wsolBalance = await wsolContract.balanceOf(proxyAddress); // 精度为9
  // const wsolBalance = await wsolContract.balanceOf("0x049B426457B5A75e0e25F0b692dF581a06035647")
  // console.log(wsolBalance)

//   const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);//自己的solana地址
//   // approve wsol,这个操作不是每次都需要
//   const byte32WsolContract = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array(WSOL_CONTRACT_ADDRESS)), 32)])
//   let approveABI = ["function approve(address spender,uint256 amount)"];
//   let approveIface = new ethers.Interface(approveABI);
//   let approveParas = approveIface.encodeFunctionData("approve", [TOKEN_BRIDGE_RELAYER_CONTRACT, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")]);
//   let approvePayloadPart = coder.encode(["bytes32","uint256", "bytes"], [byte32WsolContract, 0, approveParas])
//   const approvePayload = coder.encode(["bytes32", "bytes"], [userAddress, approvePayloadPart])
//   console.log(approvePayload)

//   // Using RBT to transfer SOL to an address on Solana devnet
//   const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array(TOKEN_BRIDGE_RELAYER_CONTRACT)), 32)]) //  以太坊上token bridge relayer合约地址
//   // targetRecipient的算法
//   // import {tryNativeToHexString,
//   // } from "@certusone/wormhole-sdk";
//   // const byte32Address = tryNativeToHexString(
//   //     '6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF', // solana上的地址
//   //     1
//   // );
// const targetRecipient = coder.encode(["bytes32"],[Buffer.from(hexStringToUint8Array('f0d2355406cfc953e64d44f046262a2e5639cea31d940e840347820218eb6437'))]);
//   let ABI = ["function transferTokensWithRelay(\
//         address token,\
//         uint256 amount,\
//         uint256 toNativeTokenAmount,\
//         uint16 targetChain,\
//         bytes32 targetRecipient,\
//         uint32 batchId\
//     )"];
//   let iface = new ethers.Interface(ABI);
//   let paras = iface.encodeFunctionData("transferTokensWithRelay", [WSOL_CONTRACT_ADDRESS,100000000, 0, 1, targetRecipient , 0]);// sol精度为9位,100000000=0.1sol
//   let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0, paras])
//   const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
//   console.log(payload)

  // Using LBT to transfer SOL to an address on the Ethereum testnet

  // // approve wsol,这个操作不是每次都需要
  // const approveWsolTx = await wsolContract.approve(TOKEN_BRIDGE_RELAYER_CONTRACT, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
  // console.log(approveWsolTx.hash)

  // transfer SOL

  // const TOKEN_BRIDGE_RELAYER_ABI = [
  //   // {"type":"function","name":"transferTokensWithRelay","inputs":[{"name":"token","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"toNativeTokenAmount","type":"uint256","internalType":"uint256"},{"name":"targetChain","type":"uint16","internalType":"uint16"},{"name":"targetRecipient","type":"bytes32","internalType":"bytes32"},{"name":"batchId","type":"uint32","internalType":"uint32"}],"outputs":[{"name":"messageSequence","type":"uint64","internalType":"uint64"}],"stateMutability":"payable"}
  // "function transferTokensWithRelay(\
  //       address token,\
  //       uint256 amount,\
  //       uint256 toNativeTokenAmount,\
  //       uint16 targetChain,\
  //       bytes32 targetRecipient,\
  //       uint32 batchId\
  //   ) public payable returns (uint64 messageSequence)"
  // ];

  // const tokenBridgeRelayerContract = new ethers.Contract(TOKEN_BRIDGE_RELAYER_CONTRACT, TOKEN_BRIDGE_RELAYER_ABI, signer);
  // const transferTokensWithRelayTx = await tokenBridgeRelayerContract.transferTokensWithRelay(
  //   WSOL_CONTRACT_ADDRESS,
  //   100000000,   //wsol精度为9,100000000=0.1sol
  //   0,
  //   1,
  //   targetRecipient,
  //   0,
  // );
  // console.log(transferTokensWithRelayTx.hash)


//   // 转账wsol
//   const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);//solanda对应的eth地址
//   const contract_address = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array('0x824cb8fc742f8d3300d29f16ca8bee94471169f5')), 32)])//wsol合约地址
//   let ABI = ["function transfer(address to, uint256 value) returns (bool)"];
//   let iface = new ethers.Interface(ABI);
//   let paras = iface.encodeFunctionData("transfer", [evm地址, BigInt('100000000')]);//0.1swol, wsol 9位精度
//   let payload_part = coder.encode(["bytes32","uint256", "bytes"], [contract_address, 0 , paras])
//   const payload = coder.encode(["bytes32", "bytes"], [userAddress, payload_part])
//   console.log(payload)
//   // solana上调用发送消息

  // =============solana控制eth账户操作lido=========================================
  const coder = ethers.AbiCoder.defaultAbiCoder();
  // 查询地址
  const uniProxy_factory = await ethers.getContractFactory("UniProxy");
  const UniProxy = await uniProxy_factory.attach('0x438aCC4fB994D97A052d225f0Ca3BF720a3552A9');
  const sourceChain = 1;// solana
  const userPadAddress = ethers.zeroPadValue(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes(), 32);//自己的solana地址
  const proxyAddress = await UniProxy.proxys(sourceChain, userPadAddress);// 对应的eth地址
  console.log(proxyAddress);


  // stake eth
  const PROXY_LIDO_CONTRACT_ADDRESS = '0xA8FeCA710468a5Bce62bE5d5d9f21De2b625fA5e'; // Sepolia链 proxy lido合约地址
  const userAddress = coder.encode(["bytes32"],[Buffer.from(new PublicKey("6v9YRMJbiXSjwco3evS2XdNuqPbwzKf3ykmn5iQJ4UyF").toBytes())]);//自己的solana地址
  const byte32WsolContract = coder.encode(["bytes32"],[ethers.zeroPadValue(Buffer.from(hexStringToUint8Array(PROXY_LIDO_CONTRACT_ADDRESS)), 32)])
  let stakeABI = ["function stake(uint256 lockTime) external payable"];
  let stakeIface = new ethers.Interface(stakeABI);
  let stakeParas = stakeIface.encodeFunctionData("stake", [60]); // 60 代表60s
  let stakePayloadPart = coder.encode(["bytes32","uint256", "bytes"], [byte32WsolContract, BigInt(10000000000000000), stakeParas]) // stake 0.01eth
  const stakePayload = coder.encode(["bytes32", "bytes"], [userAddress, stakePayloadPart])
  console.log(stakePayload)
  // solana发送跨链消息

  // 查询stake信息
  const ProxyContractLido_factory = await ethers.getContractFactory("EthToStethStaking");
  const ProxyContractLido = await ProxyContractLido_factory.attach(PROXY_LIDO_CONTRACT_ADDRESS);
  const [withdrawable, locked] = await ProxyContractLido.getStEthBalance(proxyAddress);
  console.log(`Withdrawable: ${withdrawable}, Locked: ${locked}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
