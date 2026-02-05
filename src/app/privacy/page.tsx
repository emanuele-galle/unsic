import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - UNSIC",
  description: "Informativa sulla privacy e trattamento dei dati personali di UNSIC.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          &larr; Torna al login
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Ultimo aggiornamento: Febbraio 2026</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Titolare del Trattamento</h2>
            <p>
              <strong className="text-white">UNSIC - Unione Nazionale Sindacati Imprenditori e Coltivatori</strong><br />
              Email: <a href="mailto:info@unsic.it" className="text-blue-400 hover:underline">info@unsic.it</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Dati Raccolti</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Credenziali di accesso (username, password hash)</li>
              <li>Dati di navigazione (indirizzo IP, browser, pagine visitate)</li>
              <li>Dati operativi (azioni effettuate nella dashboard)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Finalità del Trattamento</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Autenticazione e gestione dell&apos;accesso alla piattaforma</li>
              <li>Gestione automatizzata delle notizie e dei contenuti editoriali</li>
              <li>Sicurezza informatica e prevenzione accessi non autorizzati</li>
              <li>Adempimento degli obblighi di legge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Diritti dell&apos;Interessato</h2>
            <p>Ai sensi del GDPR (artt. 15-22), hai diritto di accedere, rettificare, cancellare i tuoi dati, limitare o opporti al trattamento, e proporre reclamo al <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Garante Privacy</a>.</p>
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
