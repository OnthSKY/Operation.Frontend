import type { Metadata, Viewport } from "next";
import { APP_MOBILE_LIKE_SHELL_MAX_CLASS } from "@/config/mobile.config";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Operations",
  description: "Operations management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafafa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="overflow-x-hidden bg-zinc-300/45 text-zinc-900 sm:bg-zinc-200/80">
        <Providers>
          <div
            className={`relative z-0 mx-auto min-h-[100dvh] w-full ${APP_MOBILE_LIKE_SHELL_MAX_CLASS} bg-zinc-50 pb-[max(0rem,env(safe-area-inset-bottom,0px))] shadow-[0_0_0_1px_rgb(0_0_0/0.05)] sm:min-h-[100dvh] sm:shadow-[0_20px_50px_-12px_rgb(0_0_0/0.18)]`}
          >
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
