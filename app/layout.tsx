import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WOD Tracker",
  description: "Pianifica gli allenamenti CrossFit e misura i tuoi progressi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "WOD Tracker", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
