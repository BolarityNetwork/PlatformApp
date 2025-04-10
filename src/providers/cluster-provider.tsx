import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { createContext, ReactNode, useContext } from "react";

export interface Cluster {
  name: string;
  endpoint: string;
  network?: ClusterNetwork;
  active?: boolean;
}

export enum ClusterNetwork {
  Mainnet = "mainnet-beta",
  Testnet = "testnet",
  Devnet = "devnet",
  Custom = "custom",
}

export function toWalletAdapterNetwork(cluster?: ClusterNetwork): WalletAdapterNetwork | undefined {
  switch (cluster) {
    case ClusterNetwork.Mainnet:
      return WalletAdapterNetwork.Mainnet;
    case ClusterNetwork.Testnet:
      return WalletAdapterNetwork.Testnet;
    case ClusterNetwork.Devnet:
      return WalletAdapterNetwork.Devnet;
    default:
      return undefined;
  }
}

// 这里用环境变量优先，如果没有就 fallback 到 clusterApiUrl()
const devnetEndpoint = process.env.NEXT_PUBLIC_SOLANA_DEVNET_WSS || clusterApiUrl("devnet");
const testnetEndpoint = process.env.NEXT_PUBLIC_SOLANA_TESTNET_WSS || clusterApiUrl("testnet");
const mainnetEndpoint = process.env.NEXT_PUBLIC_SOLANA_MAINNET_WSS || clusterApiUrl("mainnet-beta");

export const defaultClusters: Cluster[] = [
  {
    name: "devnet",
    endpoint: devnetEndpoint,
    network: ClusterNetwork.Devnet,
  },
  {
    name: "testnet",
    endpoint: testnetEndpoint,
    network: ClusterNetwork.Testnet,
  },
  {
    name: "local",
    endpoint: "ws://localhost:8900", // 本地节点 websocket
  },
  {
    name: "mainnet",
    endpoint: mainnetEndpoint,
    network: ClusterNetwork.Mainnet,
  },
];

// 下面这些不用改！
const clusterAtom = atomWithStorage<Cluster>("solana-cluster", defaultClusters[0]);
const clustersAtom = atomWithStorage<Cluster[]>("solana-clusters", defaultClusters);

const activeClustersAtom = atom<Cluster[]>((get) => {
  const clusters = get(clustersAtom);
  const cluster = get(clusterAtom);
  return clusters.map((item) => ({
    ...item,
    active: item.name === cluster.name,
  }));
});

const activeClusterAtom = atom<Cluster>((get) => {
  const clusters = get(activeClustersAtom);
  return clusters.find((item) => item.active) || clusters[0];
});

export interface ClusterProviderContext {
  cluster: Cluster;
  clusters: Cluster[];
  addCluster: (cluster: Cluster) => void;
  deleteCluster: (cluster: Cluster) => void;
  setCluster: (cluster: Cluster) => void;
  getExplorerUrl(path: string): string;
}

const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext);

export const ClusterProvider = ({ children }: { children: ReactNode }) => {
  const cluster = useAtomValue(activeClusterAtom);
  const clusters = useAtomValue(activeClustersAtom);
  const setCluster = useSetAtom(clusterAtom);
  const setClusters = useSetAtom(clustersAtom);

  const value: ClusterProviderContext = {
    cluster,
    clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
    addCluster: (cluster: Cluster) => {
      try {
        new Connection(cluster.endpoint);
        setClusters([...clusters, cluster]);
      } catch (err) {
        console.error(err);
      }
    },
    deleteCluster: (cluster: Cluster) => {
      setClusters(clusters.filter((item) => item.name !== cluster.name));
    },
    setCluster: (cluster: Cluster) => setCluster(cluster),
    getExplorerUrl: (path: string) => `https://explorer.solana.com/${path}${getClusterUrlParam(cluster)}`,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useCluster = () => {
  return useContext(Context);
}

function getClusterUrlParam(cluster: Cluster): string {
  let suffix = "";
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = "devnet";
      break;
    case ClusterNetwork.Mainnet:
      suffix = "";
      break;
    case ClusterNetwork.Testnet:
      suffix = "testnet";
      break;
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`;
      break;
  }
  return suffix.length ? `?cluster=${suffix}` : "";
}
