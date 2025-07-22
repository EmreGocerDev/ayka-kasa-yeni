// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Şifremi Unuttum</h1>
          <p className="text-zinc-400 mt-2">Hesabınıza ait e-posta adresini girin, size yeni bir şifre belirlemeniz için bir link göndereceğiz.</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
          <form onSubmit={handlePasswordResetRequest} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                E-posta Adresi
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>
            
            {result?.success && <p className="text-sm text-green-400 text-center">{result.success}</p>}
            {result?.error && <p className="text-sm text-red-500 text-center">{result.error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
            </button>
          </form>
        </div>
        <div className="text-center mt-6">
            <Link href="/login" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
                Giriş ekranına geri dön
            </Link>
        </div>
      </div>
    </div>
  );
}