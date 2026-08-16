import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://ciasstec.com.br"),
  title: { default: "CIASSTEC | Assistência Técnica em Informática", template: "%s | CIASSTEC" },
  description: "Assistência técnica em computadores, notebooks, impressoras, redes e suporte em informática.",
  manifest: "/manifest.webmanifest",
  applicationName: "CIASSTEC",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://ciasstec.com.br",
    siteName: "CIASSTEC",
    title: "CIASSTEC | Assistência Técnica em Informática",
    description: "Assistência técnica em computadores, notebooks, impressoras, redes e suporte em informática.",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "CIASSTEC — Assistência Técnica em Informática" }],
  },
};

export const viewport: Viewport = { themeColor: "#102a43" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geist.variable} antialiased`}>{children}</body></html>;
}
