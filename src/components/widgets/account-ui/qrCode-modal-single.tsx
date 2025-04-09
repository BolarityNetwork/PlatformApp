import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { QRCodeCanvas } from "qrcode.react";
import { cn } from "@/lib/utils";

function QrCodeModalSingle({
  open,
  onOpenChange,
  address,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  title: string;
}) {
  const { copiedText, copyToClipboard } = useCopyToClipboard();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={cn("w-[30%] md:w-[48%] font-bold")}>{title}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive</DialogTitle>
          <DialogDescription>
            Share your address to request funds
          </DialogDescription>
        </DialogHeader>
        <div className="">
          <QRCodeCanvas value={address} size={208} className="mx-auto" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm p-2 overflow-hidden text-ellipsis text-white border border-[#333333] bg-secondary rounded-xl">
            {address}
          </div>
          <Button
            type="submit"
            size="sm"
            className="px-3"
            onClick={() => copyToClipboard(address)}
          >
            <span className="sr-only">Copy</span>
            {copiedText == address ? <Check /> : <Copy />}
          </Button>
        </div>
        <DialogFooter className="flex justify-end">
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

export default QrCodeModalSingle;
