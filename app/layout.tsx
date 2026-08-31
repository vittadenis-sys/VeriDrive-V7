import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriDrive | La verifica che vale",
  description: "Verifiche auto certificate, trasparenti e semplici."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}