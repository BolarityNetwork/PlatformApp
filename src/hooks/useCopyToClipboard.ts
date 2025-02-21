import { useState, useCallback } from "react";

export function useCopyToClipboard(resetDelay = 500) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), resetDelay);
      });
    },
    [resetDelay]
  );

  return { copiedText, copyToClipboard };
}
