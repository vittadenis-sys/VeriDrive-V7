import Link from "next/link";
import { ChevronDown } from "lucide-react";

export function Header(){
  return (
    <header>
      <div className="shell nav">
        <Link href="/" className="logo" aria-label="VeriDrive home">veri<span>drive</span></Link>
        <nav aria-label="Navigazione principale">
          <Link href="/#percorsi">Servizi</Link>
          <Link href="/auto">La tua auto</Link>
          <Link href="/acquisto-auto-usata">Stai acquistando un'auto</Link>
          <Link href="/officina">Officine</Link>
          <Link href="/commercianti">Commercianti</Link>
          <Link href="/dashboard">Area Cliente</Link>
        </nav>
        <Link className="button" href="/prenota">Prenota</Link>
      </div>
    </header>
  );
}
