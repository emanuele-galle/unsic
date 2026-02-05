import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} UNSIC - Unione Nazionale Sindacati Imprenditori e Coltivatori
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              Realizzato da{" "}
              <a href="https://www.pieromuscari.it" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
                Piero Muscari Storytailor
              </a>{" "}
              in collaborazione con{" "}
              <a href="https://www.fodisrl.it" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
                Fodi S.r.l.
              </a>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <Link href="/cookie" className="hover:text-slate-300 transition-colors">Cookie</Link>
            <Link href="/termini" className="hover:text-slate-300 transition-colors">Termini</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
