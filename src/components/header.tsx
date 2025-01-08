"use client";

import { Disclosure } from "@headlessui/react";
import { X, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./widgets/mode-toggle";
import dynamic from "next/dynamic";
// import WalletButton from "./widgets/wallet-ui";
const WalletButton = dynamic(() => import("./widgets/wallet-ui"), {
  ssr: false, // 可选：禁用 SSR
});

const pages: { label: string; path: string }[] = [
  { label: "Portfolio", path: "/portfolio" },
  { label: "Vaults", path: "/vaults" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "AVS", path: "/avs" },
  { label: "Operator", path: "/operator" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <Disclosure as="nav" className="bg-background">
      {({ open }: { open: boolean }) => (
        <>
          <div className="container flex h-24 justify-between">
            <div className="flex flex-1">
              <div className="-ml-2 mr-2 flex items-center md:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-primary hover:bg-secondary hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="hidden md:flex flex-shrink-0 items-center">
                <Link
                  className="flex items-center space-x-3 rtl:space-x-reverse"
                  href="/"
                >
                  <Image alt="Logo" src="/logo.png" width={143} height={40} />
                </Link>
              </div>
              <div className="hidden md:flex md:flex-1 md:justify-center md:items-center md:gap-x-6 xl:gap-x-10">
                {pages.map(({ label, path }) => (
                  <Link
                    key={path}
                    className={
                      pathname.startsWith(path)
                        ? "text-lg font-bold text-primary"
                        : "text-lg font-bold hover:text-primary"
                    }
                    href={path}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <WalletButton />
              </div>
              <div className="flex-shrink-0">
                <ModeToggle />
              </div>
            </div>
          </div>

          <Disclosure.Panel className="md:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {pages.map(({ label, path }) => (
                <Link
                  key={path}
                  className={
                    pathname.startsWith(path)
                      ? "block border-l-4 border-primary bg-secondary py-2 pl-3 pr-4 text-base font-medium text-primary sm:pl-5 sm:pr-6"
                      : "block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-primary hover:border-primary hover:bg-secondary hover:text-gray-500 sm:pl-5 sm:pr-6"
                  }
                  href={path}
                >
                  {label}
                </Link>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
