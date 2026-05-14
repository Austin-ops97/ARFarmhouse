import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "AR Farmhouse",
  description: "Private family property network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${display.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full overflow-x-hidden bg-background text-foreground antialiased">
        <Script id="ar-theme-boot" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('ar-theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
