"use client"

import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const LoadingVariants = cva(
  "w-10 h-10 border-2 border-border border-t-transparent rounded-full animate-spin"
)

const Loading = ({className}: {className?: string}) => {
  return (
    <div className="flex items-center justify-center">
      <div className={cn(LoadingVariants(), className)}></div>
    </div>
  );
};

export { Loading };
