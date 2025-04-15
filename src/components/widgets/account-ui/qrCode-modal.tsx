import { Copy, Check } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import { SiSolana } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { QRCodeCanvas } from "qrcode.react";

function QrCodeModal({
  open,
  onOpenChange,
  address,
  solAddress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  solAddress: string;
}) {
  const { copiedText, copyToClipboard } = useCopyToClipboard();

  const onChange = (open: boolean) => {
    onOpenChange(open);
    copyToClipboard("");
  };

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive</DialogTitle>
          <DialogDescription>
            Share your address to request funds
          </DialogDescription>
        </DialogHeader>
        <div className="flex md:items-center md:justify-between flex-col space-x-2">
          <div className="space-x-2">
            {/* solana */}
            <QRCodeCanvas
              value={solAddress}
              size={208}
              marginSize={2}
              fgColor="#fff"
              bgColor="#000"
              className="mx-auto"
              title="solana"
            />
            <div className="text-center md:text-lg text-base">Solana</div>
          </div>
          {/* ETH */}
          <div className=" space-x-2">
            <QRCodeCanvas
              value={address}
              size={208}
              marginSize={2}
              fgColor="#fff"
              bgColor="#000"
              className="mx-auto"
              title="SOL"
            />
            <div className="text-center md:text-lg text-base">Ethereum</div>
          </div>
        </div>
        {/* solana */}
        <div className="flex items-center  space-x-2">
          <div className="grid flex-1 gap-2">
            <div className="text-xs p-2 overflow-hidden text-ellipsis text-foreground border border-ring bg-secondary rounded-xl">
              {solAddress}
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="px-3"
            onClick={() => copyToClipboard(solAddress)}
          >
            <span className="sr-only">Copy</span>
            {copiedText == solAddress ? (
              <Check />
            ) : (
              <>
                <Copy /> <SiSolana />
              </>
            )}
          </Button>
        </div>
        {/* ETH */}
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <div className="text-xs p-2 overflow-hidden text-ellipsis text-foreground border border-ring bg-secondary rounded-xl">
              {address}
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="px-3"
            onClick={() => copyToClipboard(address)}
          >
            <span className="sr-only">Copy</span>
            {copiedText == address ? (
              <Check />
            ) : (
              <>
                <Copy /> <FaEthereum />
              </>
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
}

export default QrCodeModal;
