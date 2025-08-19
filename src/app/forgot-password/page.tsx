// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const supabase = createClient();
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  const handlePasswordResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // DİKKAT: Buradaki 'redirectTo' URL'ini kendi sitenizin adresiyle güncelleyin.
    // Bu, kullanıcının yeni şifresini belirleyeceği sayfanın tam adresi olmalıdır.
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setResult({ error: 'Şifre sıfırlama linki gönderilemedi. Lütfen e-posta adresinizi kontrol edin.' });
    } else {
      setResult({ success: 'E-posta adresinize bir şifre sıfırlama linki gönderildi. Lütfen gelen kutunuzu kontrol edin.' });
    }
    setLoading(false);
  };

  return (
  <main className="flex items-center justify-center min-h-screen p-4">
    <div className="relative w-full max-w-sm">
      <Image
        src="/logo.png"
        alt="Ayka Enerji Logo"
        width={180}
        height={60}
        className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 drop-shadow-lg"
      />
      <div 
        className="w-full p-8 space-y-8 rounded-3xl shadow-2xl
                   bg-zinc-900/60 backdrop-blur-xl border border-zinc-800"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Şifremi Unuttum
          </h1>
          <p className="text-zinc-400 mt-2">Hesabınıza ait e-posta adresini girin.</p>
        </div>

        <form onSubmit={handlePasswordResetRequest} className="space-y-6">
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

          {result?.success && <p className="text-sm text-green-400 text-center">{result.success}</p>}
          {result?.error && <p className="text-sm text-red-500 text-center">{result.error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <span>Sıfırlama Linki Gönder</span>
            )}
          </button>
        </form>
        <div className="text-center mt-6">
          <Link 
            href="/login" 
            className="text-zinc-400 hover:text-cyan-400 transition-colors duration-200 flex items-center justify-center gap-1"
          >
            <ArrowLeft size={16} /> Girişe Geri Dön
          </Link>
        </div>
      </div>
    </div>
  </main>
);
}