import { cn } from "@/lib/utils";
import Image from "next/image";

const WalletLogo = ({
  ChainType = null,
  isShow,
}: {
  ChainType: string | null;
  isShow: boolean;
}) => {
  return (
    <div
      className={cn(
        "rounded-full w-[64px] h-[64px] bg-[#ab9ff2] flex items-center justify-center ",
        !ChainType && "opacity-60"
      )}
    >
      <Image
        src={(isShow && "/ethereum.svg") || "/phantom.svg"}
        alt="phantom"
        width={40}
        height={40}
      />
    </div>
  );
};

export default WalletLogo;
