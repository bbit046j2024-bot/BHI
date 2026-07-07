import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BHI Revision | KASNEB CPA & CIFA Past Papers",
  description:
    "Bishop Hannington Institute — the leading KASNEB CPA Foundation Level tutoring institution. Access Economics, Financial Accounting and Quantitative Analysis past papers with model answers.",
  keywords: [
    "KASNEB",
    "CPA Foundation",
    "CIFA",
    "Economics past papers",
    "Financial Accounting",
    "Quantitative Analysis",
    "BHI",
    "Bishop Hannington Institute",
  ],
  openGraph: {
    title: "BHI Revision | KASNEB CPA & CIFA",
    description: "Study smarter with BHI's past paper revision platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-slate-50 antialiased">
        <ClerkProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
