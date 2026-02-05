import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini e Condizioni - UNSIC",
  description: "Termini e condizioni di utilizzo della piattaforma UNSIC.",
};

export default function TerminiPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          &larr; Torna al login
        </Link>
        <h1 className="text-3xl font-bold text-white mt-6 mb-2">Termini e Condizioni</h1>
        <p className="text-slate-500 text-sm mb-8">Ultimo aggiornamento: Febbraio 2026</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Oggetto</h2>
            <p>La piattaforma UNSIC è un sistema di gestione intelligente delle notizie per uso interno dell&apos;organizzazione. L&apos;accesso è riservato agli utenti autorizzati.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Accesso alla Piattaforma</h2>
            <p>L&apos;accesso è consentito esclusivamente tramite credenziali assegnate dall&apos;amministratore. L&apos;utente è responsabile della riservatezza delle proprie credenziali.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Obblighi dell&apos;Utente</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Utilizzare la piattaforma per le finalità previste</li>
              <li>Non condividere le credenziali di accesso</li>
              <li>Non pubblicare contenuti illegali o inappropriati</li>
              <li>Segnalare tempestivamente anomalie di sicurezza</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Proprietà Intellettuale</h2>
            <p>Tutti i contenuti generati dalla piattaforma AI sono di proprietà di UNSIC. La piattaforma tecnologica è di proprietà di Fodi S.r.l.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Limitazione di Responsabilità</h2>
            <p>La piattaforma è fornita &quot;così com&apos;è&quot;. I contenuti generati con AI devono essere verificati prima della pubblicazione.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Legge Applicabile</h2>
            <p>Legge italiana. Foro competente: Tribunale di Roma.</p>
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
