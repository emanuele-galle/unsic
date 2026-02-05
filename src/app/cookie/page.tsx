import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy - UNSIC",
  description: "Informativa sui cookie utilizzati dal sito UNSIC.",
};

export default function CookiePage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          &larr; Torna al login
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6 mb-2">Cookie Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Ultimo aggiornamento: Febbraio 2026</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Cosa Sono i Cookie</h2>
            <p>I cookie sono piccoli file di testo memorizzati sul tuo dispositivo per migliorare l&apos;esperienza di navigazione.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Cookie Tecnici</h2>
            <p className="mb-3">Essenziali per il funzionamento della piattaforma:</p>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left pb-2">Nome</th>
                    <th className="text-left pb-2">Durata</th>
                    <th className="text-left pb-2">Scopo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 font-mono">auth_token</td><td className="py-1">Sessione</td><td className="py-1">Autenticazione utente</td></tr>
                  <tr><td className="py-1 font-mono">__next_*</td><td className="py-1">Sessione</td><td className="py-1">Funzionamento Next.js</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Come Gestire i Cookie</h2>
            <p>Puoi gestire i cookie tramite le impostazioni del browser. Disabilitare i cookie tecnici impedirà l&apos;accesso alla piattaforma.</p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-lg font-semibold text-white mb-3">Sviluppo e Gestione Tecnica del Sito</h2>
            <p>Questo sito web è stato realizzato e viene gestito da:</p>
            <p className="mt-2">
              <strong className="text-white">FODI S.r.l. – Startup Innovativa</strong><br />
              Via Santicelli 18/A, 88068 Soverato (CZ)<br />
              P.IVA: 03856160793<br />
              Email: <a href="mailto:info@fodisrl.it" className="text-blue-400 hover:underline">info@fodisrl.it</a><br />
              Tel: +39 0963 576433<br />
              Web: <a href="https://www.fodisrl.it" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">www.fodisrl.it</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
