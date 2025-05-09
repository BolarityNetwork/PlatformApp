import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata } from "next";
import { DM_Sans as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import { UiLayout } from "@/components/ui-layout";
// import { ReactQueryProvider } from "@/providers/react-query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { BolarityProvider } from "@/providers/bolarity-provider";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bolarity Network",
  description:
    "Bolarity is a next-generation abstract blockchain solution focused on addressing the fragmentation in today’s multi-chain ecosystems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-sans antialiased", fontSans.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* <ReactQueryProvider> */}
          <BolarityProvider>
            <UiLayout>{children}</UiLayout>
            <Toaster richColors />
          </BolarityProvider>
          {/* </ReactQueryProvider> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
