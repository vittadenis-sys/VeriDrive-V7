import Link from "next/link";

export function Footer(){return <footer><div className="shell"><strong>veridrive</strong><p>Verifiche auto certificate, per acquistare e vendere con più fiducia.</p><div style={{display:"flex",gap:18,flexWrap:"wrap",margin:"14px 0"}}><Link href="/verifica">Verifica Certificato</Link><Link href="/termini-certificato">Termini Certificato CTI</Link><Link href="/privacy">Privacy Policy</Link><Link href="/contatti">Contatti</Link></div><small>© 2026 VeriDrive. Tutti i diritti riservati.</small></div></footer>;}
