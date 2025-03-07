import Image from "next/image";
import { Button } from "@/components/ui/button";

export interface WalletConnectionProps {
  name: string;
  iconUrl?: string;
  connected?: boolean;
  onConnectRequest: () => unknown;
  disabled?: boolean;
}

export const WalletConnectButton = (props: WalletConnectionProps) => {
  return (
    <div className="bg-black rounded-md p-2 md:py-3 md:px-4 flex justify-start items-center gap-2 md:gap-3">
      <Image
        src={props.iconUrl as string}
        unoptimized
        alt={props.name}
        width={20}
        height={20}
      />
      <span className="flex-1 text-lg text-white text-left">{props.name}</span>
      <Button className="w-[80px]" onClick={props.onConnectRequest} disabled={props.disabled}>
        Connect
      </Button>
    </div>
  );
};