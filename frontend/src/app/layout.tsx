import type { Metadata } from "next";
import { Geist, Geist_Mono, Courier_Prime } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  variable: "--font-courier-prime",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karu - The Film Workspace for Storytellers",
  description: "Write, organize, and bring your screenplays to life in one beautiful, focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-neutral-800 dark:selection:text-neutral-100"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
