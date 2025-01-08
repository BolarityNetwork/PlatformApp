import { Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { QRCodeCanvas } from "qrcode.react";


function QrCodeModal({ open, onOpenChange, address }: { open: boolean, onOpenChange: (open: boolean) => void, address: string }) {

  const { copiedText, copyToClipboard } = useCopyToClipboard();

  const onChange = (open: boolean) => {
    onOpenChange(open);
  };


  return (
    <Dialog open={open} onOpenChange={onChange}>

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

          <div className="grid flex-1 gap-2">

            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input
              id="link"
              defaultValue={address}
              readOnly
            />
          </div>
          <Button type="submit" size="sm" className="px-3" onClick={() => copyToClipboard(address)}>
            <span className="sr-only">Copy</span>
            {copiedText == address ? <Check /> : <Copy />}
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
  )
}


export default QrCodeModal;