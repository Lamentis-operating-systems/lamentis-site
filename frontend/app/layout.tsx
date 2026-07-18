import type { Metadata } from "next";
import {
  Cousine,
  Inter,
  Noto_Serif_JP,
} from "next/font/google";
import { siteName, siteUrl } from "@/domain/site/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const productMono = Cousine({
  variable: "--font-product-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const productSerifJp = Noto_Serif_JP({
  variable: "--font-product-serif-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description:
    "Lamentis is a personal portfolio and project overview for Elias Papavlassopoulos.",
  authors: [{ name: "Elias Papavlassopoulos" }],
  creator: "Elias Papavlassopoulos",
  publisher: siteName,
  category: "personal portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${productMono.variable} ${productSerifJp.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
