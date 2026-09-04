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

export function Header(){
  const [open, setOpen] = useState(false);

  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="logo" aria-label="VeriDrive home" onClick={() => setOpen(false)}>
          veri<span>drive</span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav aria-label="Navigazione principale">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <Link className="button nav-cta" href="/prenota" onClick={() => setOpen(false)}>
          Prenota
        </Link>
      </div>

      {open && (
        <div id="mobile-navigation" className="mobile-nav-panel" aria-label="Menu mobile">
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link className="button" href="/prenota" onClick={() => setOpen(false)}>
            Prenota
          </Link>
        </div>
      )}
    </header>
  );
}
