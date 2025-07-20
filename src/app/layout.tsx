// src/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes"; // ThemeProvider'ı import et

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
    // suppressHydrationWarning: next-themes başlangıçta tema sınıfı farklı olabileceği için uyarıyı önler
    <html lang="tr" suppressHydrationWarning> 
      {/* Tema sağlayıcısı ile tüm uygulamayı sarıyoruz */}
      {/* attribute="class" Tailwind'in dark: sınıflarını kullanmasını sağlar */}
      {/* defaultTheme="system" kullanıcının sistem temasına göre başlangıç teması belirler */}
      <body className={`${montserrat.className}`}> {/* body'den doğrudan tema rengini kaldırdık */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Ana Konteyner: Işımaları içermek için relative ve overflow-hidden */}
          {/* Bu div'e ve ışımalara dark mode sınıfları eklendi */}
          <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white dark:bg-white dark:text-gray-900">
            {/* MAVİ IŞIMA (SOL ÜST) - Renkler dark/light moda göre ayarlandı */}
            <div 
              className="absolute top-0 left-0 w-[100vw] h-[100vh] bg-blue-600/20 rounded-full blur-[250px] translate-x-[-50%] translate-y-[-50%] dark:bg-blue-300/20"
              aria-hidden="true"
            ></div>
            
            {/* KIRMIZI IŞIMA (SAĞ ALT) - Renkler dark/light moda göre ayarlandı */}
            <div 
              className="absolute bottom-0 right-0 w-[100vw] h-[100vh] bg-red-500/20 rounded-full blur-[250px] translate-x-[50%] translate-y-[50%] dark:bg-red-300/20"
              aria-hidden="true"
            ></div>

            {/* Sayfa içeriği: Işımaların üzerinde kalması için relative ve z-10 */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}