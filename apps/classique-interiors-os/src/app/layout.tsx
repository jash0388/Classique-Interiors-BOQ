import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: { default: "Classique Interiors OS", template: "%s · Classique Interiors OS" },
  description: "Internal operations app for Classique Interiors — quotation phase.",
  appleWebApp: { capable: true, title: "CI OS", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
