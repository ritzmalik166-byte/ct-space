import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Roboto } from "next/font/google";
import { Footer } from "@/components/shared/Footer";
import { Navbar } from "@/components/shared/Navbar";
import "./globals.css";

// Both are variable fonts: one self-hosted file per style covers every weight.
const heading = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const body = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CT Space — AI services beyond the horizon",
  description:
    "CT Space designs and ships AI agents, vision systems, LLM products and automation for ambitious teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} antialiased`}>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
