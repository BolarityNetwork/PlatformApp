import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Copies text to clipboard
function CopyButton({ text, className }: { text: string; className?: string }) {
  const onCopy = async (text: string) => {
    if (!text || !navigator) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy");
    }
  };
  return (
    <CopyIcon
      onClick={() => onCopy(text)}
      className={cn(
        "text-muted-foreground cursor-pointer hover:text-foreground",
        className,
        !text && "hidden"
      )}
    />
  );
}

export default CopyButton;
