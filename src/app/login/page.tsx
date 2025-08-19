// src/app/login/page.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import Image from 'next/image';

export default function CenteredCardLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Giriş bilgileri hatalı veya kullanıcı bulunamadı.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    // Ana konteyner: İçindeki TEK elemanı (wrapper div) dikey ve yatayda ortalar
    <main className="flex items-center justify-center min-h-screen p-4">
      
      {/* Konumlandırma için kullanılan göreceli (relative) bir sarmalayıcı (wrapper) */}
      <div className="relative">

        {/* LOGO: Kartın tam üzerine absolute olarak konumlandırıldı */}
        <Image
          src="/logo.png"
          alt="Ayka Enerji Logo"
          width={180}
          height={60}
          // `absolute` ile normal akıştan çıkarılır.
          // `bottom-full` ile sarmalayıcının tam üzerine yerleştirilir.
          // `mb-8` ile yukarıda boşluk bırakır.
          // `left-1/2 -translate-x-1/2` ile yatayda ortalanır.
          className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 drop-shadow-lg"
        />
        
        {/* "Glass" Giriş Kartı: Bu kart artık her zaman ekranın merkezinde olacak */}
        <div 
          className="w-full max-w-sm p-8 space-y-8 rounded-3xl shadow-2xl
                     bg-zinc-900/60 backdrop-blur-xl border border-zinc-800"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Giriş Yap
            </h1>
            <p className="text-zinc-400 mt-2">Yönetim paneline erişim sağlayın.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="email"
                placeholder="E-posta Adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="password"
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>

            {error && (
              <p className="text-sm text-center text-red-500 animate-pulse">{error}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all duration-300 disabled:opacity-60 disabled:scale-100"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Giriş Yapılıyor...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Giriş Yap</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-center mt-4">
  <Link 
    href="/forgot-password"
    className="text-zinc-400 hover:text-cyan-400 transition-colors duration-200"
  >
    Şifrenizi mi unuttunuz?
  </Link>
</div>
          </form>
        </div>
      </div>
    </main>
  );
}