import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "DatSanVN",
    template: "%s | DatSanVN",
  },
  description: "Nền tảng đặt sân bóng đá với trải nghiệm tìm kiếm nhanh và giao diện mobile-first.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        <ClerkProvider>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
