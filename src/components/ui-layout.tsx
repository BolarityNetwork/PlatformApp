"use client";

import { ReactNode } from "react";
import { Header } from "./header";

export function UiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <Header />
      {children}
    </div>
  );
}
