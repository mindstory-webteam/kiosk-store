import type { Metadata } from "next";
import { Newsreader, Archivo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

// Product names and prices. Optical sizing keeps it readable small and
// characterful large; the italic is used once, in the headline.
const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

// Everything else: labels, buttons, body copy, form controls.
const sans = Archivo({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kiosk Stores — ceramics for coffee and tea",
    template: "%s · Kiosk Stores",
  },
  description:
    "Cups, pots and saucers from kiosks near you, with stock counts taken straight off the shelf.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}