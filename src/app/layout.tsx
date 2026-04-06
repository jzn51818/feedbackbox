// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FeedbackBox - Collect & Manage Feedback",
  description:
    "A simple, fast feedback collection tool. Submit bug reports, feature requests, and general feedback.",
  keywords: ["feedback", "bug report", "feature request"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
