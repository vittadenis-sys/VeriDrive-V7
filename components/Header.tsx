"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

export function Header(){
  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="logo" aria-label="VeriDrive home">veri<span>drive</span></Link>
        <input id="veridrive-menu" className="mobile-menu-toggle" type="checkbox" aria-label="Apri menu" />
        <label htmlFor="veridrive-menu" className="mobile-menu-button" aria-label="Apri menu"><Menu size={22} /></label>
        <nav aria-label="Navigazione principale">
          <Link href="/#percorsi">Servizi</Link>
          <Link href="/auto">La tua auto</Link>
          <Link href="/acquisto-auto-usata">Stai acquistando un'auto</Link>
          <Link href="/officina">Officine</Link>
          <Link href="/commercianti">Commercianti</Link>
          <Link href="/dashboard">Area Cliente</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <Link className="button nav-cta" href="/prenota">Prenota</Link>
      </div>
    </header>
  );
}
