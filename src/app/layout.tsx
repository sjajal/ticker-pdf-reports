import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticker PDF Reports",
  description: "Generate concise stock research PDFs from ticker symbols.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
