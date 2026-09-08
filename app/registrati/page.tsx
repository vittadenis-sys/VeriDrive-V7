import Link from "next/link";
import { Header } from "@/components/Header";
import { AuthForm } from "@/components/AuthForm";

export default function Register(){return <><Header/><main className="page"><div className="shell" style={{maxWidth:600}}><div className="eyebrow">Nuovo account</div><h1 style={{fontSize:46}}>Inizia con VeriDrive</h1><AuthForm mode="register"/><p style={{marginTop:16}}>Hai già un account? <Link href="/login">Accedi</Link></p><p style={{marginTop:8}}>Sei un’officina? <Link href="/diventa-officina">Richiedi l’abilitazione come partner</Link></p></div></main></>}
