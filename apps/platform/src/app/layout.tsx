import type { Metadata } from "next";
import { Courgette, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/motion/MotionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cursive font for the business name in the sidebars (font-script).
const courgette = Courgette({
  variable: "--font-courgette",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Business Platform",
  description: "Manage your business website content from one dashboard.",
  icons: {
    icon: "logo.svg"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${courgette.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
