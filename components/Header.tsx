"use client";

import Image from "next/image";
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

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <div className="shell nav">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
          <span className="sr-only">{open ? "Chiudi menu" : "Apri menu"}</span>
        </button>

        <Link href="/" className="brand-lockup" aria-label="VeriDrive home" onClick={() => setOpen(false)}>
          <Image
            src="/veridrive-logo.svg"
            alt="VeriDrive"
            width={188}
            height={64}
            priority
            className="brand-logo-image"
          />
        </Link>

        <nav aria-label="Navigazione principale">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <Link className="button nav-cta" href="/prenota" onClick={() => setOpen(false)}>
          Prenota
        </Link>
      </div>

      {open && (
        <div id="mobile-navigation" className="mobile-nav-panel" aria-label="Menu mobile">
          {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link className="button" href="/prenota" onClick={() => setOpen(false)}>Prenota</Link>
        </div>
      )}
    </header>
  );
}
