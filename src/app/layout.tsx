// src/app/layout.tsx

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Ayka Kasa Yönetim Sistemi",
  description: "Ayka Enerji için geliştirilmiş kasa yönetim paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${montserrat.className} bg-zinc-950 text-white`}>
        {/* Ana Konteyner: Işımaları içermek için relative ve overflow-hidden */}
        <div className="relative min-h-screen overflow-hidden">
          {/* MAVİ IŞIMA (SOL ÜST) */}
          <div 
            className="absolute top-0 left-0 w-[100vw] h-[100vh] bg-blue-600/20 rounded-full blur-[250px] translate-x-[-50%] translate-y-[-50%]"
            aria-hidden="true"
          ></div>
          
          {/* KIRMIZI IŞIMA (SAĞ ALT) */}
          <div 
            className="absolute bottom-0 right-0 w-[100vw] h-[100vh] bg-red-500/20 rounded-full blur-[250px] translate-x-[50%] translate-y-[50%]"
            aria-hidden="true"
          ></div>

          {/* Sayfa içeriği: Işımaların üzerinde kalması için relative ve z-10 */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}