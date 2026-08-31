import type { Metadata } from "next";
import "./globals.css"; import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
export const metadata: Metadata = { title: "VeriDrive | La verifica che vale", description: "Verifiche auto certificate, trasparenti e semplici." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body><RegisterServiceWorker/>{children}</body></html>; }