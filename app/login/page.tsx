import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { AuthForm } from "@/components/AuthForm";

export default function Login() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="shell" style={{ maxWidth: 600 }}>
          <div className="eyebrow">Area riservata</div>
          <h1 style={{ fontSize: 46 }}>Accedi a VeriDrive</h1>
          <Suspense fallback={<p>Caricamento...</p>}>
            <AuthForm mode="login" />
          </Suspense>
          <p>
            Non hai un account? <Link href="/registrati">Registrati</Link>
          </p>
        </div>
      </main>
    </>
  );
}
