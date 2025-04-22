import { sha256 } from "@/lib/utils";

// Define proper types for NFT items
export interface NFTItem {
  name: string;
  description: string;
  price: string;
  currency: string;
  symbol: string;
  imgUrl: string;
  contract: string;
}

export const functionSig = sha256("global:process_wormhole_message").slice(
    0,
    8
  ),
  payloadSchema = {
    struct: {
      payload: { array: { type: "u8" } },
    },
  };

const Bolarity_NFT_CONTRACT = "0x9198A303ac94DDf8a74aF0352147A8C1097cba5a";
const Wormhole_NFT_CONTRACT = "0x8a952A532B52bf611a7E3D574B09E37798CEe107";
const Encode_NFT_CONTRACT = "0xd0Bf8b619Db691327d51F9B28Ed9d33720338F6F";
const BuFi_NFT_CONTRACT = "0xAc93fD7981E0361B08536aeab979204f1356763F";
const ZK_Loco_NFT_CONTRACT = "0x624D0d0343d1dD088c6aD9fcDdAb4ac2de6c033d";
const Polyquest_NFT_CONTRACT = "0xAd3dC1E9ea788875F627463489C71A05E9D1095F";
const Sherry_NFT_CONTRACT = "0x0753e3291FE2d6876f2Bb26E342D31445AEBEC78";

// Sample NFT data with proper structure

export const initialNFTs: NFTItem[] = [
  {
    // id: "001",
    name: "Bolarity Network",
    description: `Bolarity is a next-generation chain abstraction solution designed to address fragmentation in today’s multi-chain ecosystems. By unifying blockchain interactions, it empowers any chain to interoperate seamlessly, bringing cohesion to the blockchain world and eliminating fragmentation.

Based on our chain abstraction tech stack, we’re also developing a consumer DeFi superapp to make crypto asset management easy.`,
    price: "0.25",
    currency: "ETH",
    symbol: "Bolarity",
    imgUrl: "/nft/1.webp",
    contract: Bolarity_NFT_CONTRACT,
  },

  {
    // id: "002",
    name: "Wormhole",
    description:
      "Wormhole is the leading interoperability platform powering multichain applications and bridges at scale.",
    price: "0.25",
    currency: "ETH",
    symbol: "Wormhole",
    imgUrl: "/nft/wormhole.jpg",
    contract: Wormhole_NFT_CONTRACT,
  },

  // {
  //   // id: "003",
  //   name: "Elipsys",
  //   description: `Elipsys is a decentralized verification network that streamlines on-chain verification for critical blockchain components such as interoperability protocol. By providing an optimized layer for Wormhole, Elipsys significantly reduces on-chain costs and minimizes the footprint of group signatures`,
  //   price: "0.25",
  //   currency: "ETH",
  //   symbol: "Elipsys",
  //   imgUrl: "/nft/3.webp",
  //   contract: "",
  // },

  {
    // id: "003",
    name: "Encode",
    description:
      "Learn, build and advance your career in Emerging Tech with our community of 500,000 talented professionals worldwideLearn, build and advance your career in Emerging Tech with our community of 500,000 talented professionals worldwide",
    price: "0.25",
    currency: "ETH",
    symbol: "Encode",
    imgUrl: "/nft/encode.jpg",
    contract: Encode_NFT_CONTRACT,
  },
  {
    // id: "002",
    name: "Bu Finance",
    description: `Bu empowers freelancers, SMEs, and remote teams in emerging markets with an integrated financial, accounting and project management platform leveraging stablecoins and decentralized finance (DeFi)`,
    price: "0.25",
    currency: "ETH",
    symbol: "Bu",
    imgUrl: "/nft/2.webp",
    contract: BuFi_NFT_CONTRACT,
  },
  //   {
  //     // id: "004",
  //     name: "Peridot Protocol",
  //     description: `Peridot Protocol is a Cross-Chain DeFi Protocol which enables users to gain fractions of their favourite RWA's & NFT's, either as ERC1155's or as ERC20's
  // These can be then later on redeemed for the original asset.

  // Peridot also features a Lend & Borrow Market for these fractionalized assets.`,
  //     price: "0.25",
  //     currency: "ETH",
  //     symbol: "Peridot",
  //     imgUrl: "/nft/4.webp",
  //     contract: "",
  //   },
  {
    // id: "005",
    name: "Polyquest",
    description: `Polyquest is the fastest cross-chain prediction market on Solana, powered by Wormhole, enabling seamless interoperability across multiple blockchains. It supports custom tokens, including meme coins, providing a dynamic platform for diverse token-based prediction markets.`,
    price: "0.25",
    currency: "ETH",
    symbol: "Polyquest",
    imgUrl: "/nft/5.webp",
    contract: Polyquest_NFT_CONTRACT,
  },
  // {
  //   // id: "006",
  //   name: "PumpOut",
  //   description: `Cross-chain, cult-oriented meme token launcher designed with future AI-agent compatibility in mind – perfectly aligned with the surging meme supercycle trend and the growing influence of AI.`,
  //   price: "0.25",
  //   currency: "ETH",
  //   symbol: "PumpOut",
  //   imgUrl: "/nft/6.webp",
  //   contract: "",
  // },
  // ------------------------------
  // {
  //   // id: "007",
  //   name: "Refuel Bot",
  //   description: `The fastest telegram bridge bot. Refuelbot is a telegram bot that allows you bridge from EVM <> SOLANA. Utilizing wormhole tech it focuses on speed and reduced fees `,
  //   price: "0.25",
  //   currency: "ETH",
  //   symbol: "Refuel Bot",
  //   imgUrl: "/nft/7.webp",
  //   contract: "",
  // },
  // {
  //   // id: "008",
  //   name: "SearchBox",
  //   description: `SearchBox. A multichain token launchpad and aggregator. Find, Launch, Buy, and Sell tokens across multiple chains without bridging.`,
  //   price: "0.25",
  //   currency: "ETH",
  //   symbol: "SearchBox",
  //   imgUrl: "/nft/8.webp",
  //   contract: "",
  // },
  {
    // id: "009",
    name: "Sherry",
    description: `Sherry is the social bridge to Web3, enabling protocols and creators to deploy interactive mini-apps (Slinks) on social media. With Sherry, users can seamlessly perform on-chain actions—mint NFTs, stake tokens, or join campaigns—without leaving their favorite platforms.`,
    price: "0.25",
    currency: "ETH",
    symbol: "Sherry",
    imgUrl: "/nft/9.webp",
    contract: Sherry_NFT_CONTRACT,
  },
  // {
  //   // id: "010",
  //   name: "Whitehole",
  //   description: `Whitehole is a blockchain wallet and Card payment platform that empowers underserved communities through Circle's and Wormhole's technologies.`,
  //   price: "0.25",
  //   currency: "ETH",
  //   symbol: "Whitehole",
  //   imgUrl: "/nft/10.gif",
  //   contract: "",
  // },
  {
    // id: "011",
    name: "zk-lokomotive",
    description: `zk-lokomotive is an advanced, zero-knowledge proof-based file transfer system designed to operate seamlessly across multiple blockchain networks`,
    price: "0.25",
    currency: "ETH",
    symbol: "zk-lokomotive",
    imgUrl: "/nft/11.webp",
    contract: ZK_Loco_NFT_CONTRACT,
  },
];
