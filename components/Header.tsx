"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  ["Servizi", "/#percorsi"],
  ["La tua auto", "/auto"],
  ["Stai acquistando un'auto", "/acquisto-auto-usata"],
  ["Officine", "/officina"],
  ["Commercianti", "/commercianti"],
  ["Area Cliente", "/dashboard"],
  ["Admin", "/admin"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="logo" aria-label="VeriDrive home" onClick={close}>veri<span>drive</span></Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
          aria-controls="veridrive-main-nav"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>

        <nav id="veridrive-main-nav" className={open ? "mobile-nav-open" : ""} aria-label="Navigazione principale">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={close}>{label}</Link>
          ))}
        </nav>

        <Link className="button nav-cta" href="/prenota" onClick={close}>Prenota</Link>
      </div>
    </header>
  );
}
