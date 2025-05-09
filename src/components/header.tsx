"use client";

import { Disclosure, Transition } from "@headlessui/react";
import { X, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./widgets/mode-toggle";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const WalletButton = dynamic(() => import("./widgets/wallet-ui"), {
  ssr: false, // 可选：禁用 SSR
});

const pages: { label: string; path: string }[] = [
  { label: "Portfolio", path: "/portfolio" },
  { label: "Vaults", path: "/vaults" },
  { label: "🔥 Campaign", path: "/campaign" },
  { label: "NCN", path: "/ncn" },

  { label: "Dashboard", path: "/dashboard" },
  // { label: "AVS", path: "/avs" },
  // { label: "NCN", path: "/ncn" },
  // { label: "Operator", path: "/operator" },
];
// const pages: { label: string; path: string }[] = [
//   { label: "Portfolio", path: "/portfolio" },
//   { label: "Vaults", path: "/vaults" },
//   // { label: "Campaign", path: "/campaign" },
//   { label: "Dashboard", path: "/dashboard" },
//   // { label: "AVS", path: "/avs" },
//   { label: "NCN", path: "/ncn" },
//   { label: "Operator", path: "/operator" },
// ];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 只在客户端挂载后处理主题
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取基于当前主题的 logo
  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/logo_default.png"
      : "/logo_light.png";

  // Add scroll event listener to detect when page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    // Add event listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Call handler right away to check initial scroll position
    handleScroll();

    // Clean up event listener
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  return (
    <>
      {/* Add placeholder div when header is fixed to prevent content jump */}
      {scrolled && <div className="h-24" />}

      <Disclosure
        as="nav"
        className={cn(
          "bg-background",
          scrolled &&
            "fixed top-0 left-0 right-0 w-full shadow-md z-50 transition-all duration-300"
        )}
      >
        {({ open, close }: { open: boolean; close: () => void }) => (
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
                    <Image alt="Logo" src={logoSrc} width={160} height={50} />
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

            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel static className="md:hidden">
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
                      onClick={close}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
    </>
  );
}
