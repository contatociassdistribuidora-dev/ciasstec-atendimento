import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CIASSTEC Atendimento", template: "%s | CIASSTEC" },
  description: "Central de atendimento e gestão de assistência técnica da CIASSTEC.",
  manifest: "/manifest.webmanifest",
  applicationName: "CIASSTEC Atendimento",
};

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geist.variable} antialiased`}>{children}</body></html>;
}
