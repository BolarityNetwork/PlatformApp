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
export const TableHeaderArr = [
  "Name",
  "Price/24h change",
  "Value",
  "Amount",
  "Network",
  "",
];
