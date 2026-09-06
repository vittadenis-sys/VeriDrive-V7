"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";

const links = [
  ["/officina", "Officine"],
  ["/commercianti", "Commercianti"],
  ["/dashboard", "Area Cliente"],
  ["/admin", "Admin"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const closeMenu = () => {
    setOpen(false);
    setServicesOpen(false);
  };

  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="brand-lockup" aria-label="VeriDrive home" onClick={closeMenu}>
          <Image src="/veridrive-logo.png" alt="" width={38} height={38} priority className="brand-approved-symbol" />
          <span className="brand-wordmark"><span>Veri</span><b>Drive</b></span>
        </Link>

        <nav aria-label="Navigazione principale">
          <div className="desktop-services">
            <Link href="/#percorsi">Servizi</Link>
          </div>
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <Link className="button nav-cta" href="/prenota" onClick={closeMenu}>Prenota</Link>

        <button type="button" className="mobile-menu-button" aria-label={open ? "Chiudi menu" : "Apri menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={22} /> : <Menu size={22} />}
          <span className="sr-only">{open ? "Chiudi menu" : "Apri menu"}</span>
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="mobile-nav-panel" aria-label="Menu mobile">
          <Link href="/" onClick={closeMenu}>Home</Link>

          <button
            type="button"
            className="mobile-submenu"
            aria-expanded={servicesOpen}
            aria-controls="mobile-services"
            onClick={() => setServicesOpen((value) => !value)}
          >
            <span>Servizi</span>
            <ChevronDown className={`mobile-submenu-chevron ${servicesOpen ? "is-open" : ""}`} size={19} aria-hidden="true" />
          </button>

          <div id="mobile-services" className={`mobile-submenu-items ${servicesOpen ? "is-open" : ""}`}>
            <div className="mobile-submenu-items-inner">
              <Link href="/auto" onClick={closeMenu}>La tua auto</Link>
              <Link href="/acquisto-auto-usata" onClick={closeMenu}>Stai acquistando un'auto</Link>
            </div>
          </div>

          {links.map(([href, label]) => <Link key={href} href={href} onClick={closeMenu}>{label}</Link>)}
          <Link className="button" href="/prenota" onClick={closeMenu}>Prenota</Link>
        </div>
      )}
    </header>
  );
}
