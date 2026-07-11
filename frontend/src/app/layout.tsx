import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledgerline — UPI Expense Dashboard",
  description:
    "Parse password-protected bank statements and track daily spend by UPI ID.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistSans.className} ${instrument.variable} ${jetbrains.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
