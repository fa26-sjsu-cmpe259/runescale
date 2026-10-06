import type { Metadata } from "next";
import { Alegreya, Uncial_Antiqua } from "next/font/google";
import "./globals.css";

const uncial = Uncial_Antiqua({
  variable: "--font-uncial",
  weight: "400",
  subsets: ["latin"],
});

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Runescale",
  description: "Check whether a D&D 5e encounter is actually balanced, grounded in the SRD and the 2014 DMG math.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${uncial.variable} ${alegreya.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
