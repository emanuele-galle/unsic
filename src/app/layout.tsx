import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UNSIC | Unione Nazionale Sindacati Imprenditori e Coltivatori",
  description: "Sistema di gestione intelligente delle notizie UNSIC - Automazione editoriale con AI",
  keywords: ["UNSIC", "notizie", "imprenditori", "agricoltura", "sindacato"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-slate-950 text-white min-h-screen flex flex-col`}
      >
        <div className="flex-1">{children}</div>
        <Footer />
        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="dark"
        />
      </body>
    </html>
  );
}
