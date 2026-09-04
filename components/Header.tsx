"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["/#percorsi", "Servizi"],
  ["/auto", "La tua auto"],
  ["/acquisto-auto-usata", "Stai acquistando un'auto"],
  ["/officina", "Officine"],
  ["/commercianti", "Commercianti"],
  ["/dashboard", "Area Cliente"],
  ["/admin", "Admin"],
] as const;

function VeriDriveMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Logo VeriDrive" fill="none">
      <path d="M32 4 54 11v17c0 14-8.7 25.2-22 31C18.7 53.2 10 42 10 28V11L32 4Z" fill="#0B2D52" />
      <path d="m18 36 9 9 20-24" stroke="#2E8BFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 23c3-6 7.4-9 12-9s9 3 12 9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M21 24h22l-2 9H23l-2-9Z" fill="#fff" opacity=".95" />
      <circle cx="25" cy="28" r="2" fill="#0B2D52" />
      <circle cx="39" cy="28" r="2" fill="#0B2D52" />
    </svg>
  );
}

export function Header(){
  const [open, setOpen] = useState(false);
  return (
    <header>
      <div className="shell nav">
        <button type="button" className="mobile-menu-button" aria-label={open ? "Chiudi menu" : "Apri menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(value => !value)}>
          {open ? <X size={22}/> : <Menu size={22}/>}<span className="sr-only">{open ? "Chiudi menu" : "Apri menu"}</span>
        </button>
        <Link href="/" className="brand-lockup" aria-label="VeriDrive home" onClick={() => setOpen(false)}>
          <VeriDriveMark className="brand-mark" />
          <span className="brand-wordmark"><span>Veri</span><b>Drive</b></span>
        </Link>
        <nav aria-label="Navigazione principale">
          {links.map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <Link className="button nav-cta" href="/prenota" onClick={() => setOpen(false)}>Prenota</Link>
      </div>
      {open && <div id="mobile-navigation" className="mobile-nav-panel" aria-label="Menu mobile">
        {links.map(([href,label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="button" href="/prenota" onClick={() => setOpen(false)}>Prenota</Link>
      </div>}
    </header>
  );
}
