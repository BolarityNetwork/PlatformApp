"use client";

import { Header } from "./header";

export function UiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <Header />
      {children}
    </div>
  );
}
