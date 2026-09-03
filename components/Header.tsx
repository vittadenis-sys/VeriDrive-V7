import Link from "next/link";
import { ChevronDown } from "lucide-react";

export function Header(){
  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="logo">veri<span>drive</span></Link>
        <nav>
          <div className="nav-group">
            <Link href="/auto">Auto privata <ChevronDown size={13} /></Link>
            <div className="nav-menu">
              <Link href="/auto#viaggio">Controllo Viaggio · 49 €</Link>
              <Link href="/auto#checkup">Check-up + VeriScore · 99 €</Link>
            </div>
          </div>
          <div className="nav-group">
            <Link href="/acquisto-auto-usata">Acquisto usato <ChevronDown size={13} /></Link>
            <div className="nav-menu">
              <Link href="/acquisto-auto-usata#online">Verifica Online · 39 €</Link>
              <Link href="/acquisto-auto-usata#base">Controllo Base · 99 €</Link>
              <Link href="/acquisto-auto-usata#plus">Verifica Plus · 149 €</Link>
            </div>
          </div>
          <Link href="/officina">Officine</Link>
          <Link href="/commercianti">Commercianti</Link>
          <Link href="/dashboard">Area clienti</Link>
        </nav>
        <Link className="button" href="/prenota">Prenota</Link>
      </div>
    </header>
  );
}
