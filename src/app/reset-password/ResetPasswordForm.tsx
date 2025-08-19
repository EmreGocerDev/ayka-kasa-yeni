// src/app/reset-password/ResetPasswordForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, LogIn } from 'lucide-react';
import Image from 'next/image';

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type !== 'recovery') {
      setResult({ error: 'Geçersiz şifre sıfırlama bağlantısı. Lütfen giriş sayfasından tekrar deneyin.' });
    }
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (password !== confirmPassword) {
      setResult({ error: 'Girdiğiniz şifreler uyuşmuyor.' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setResult({ error: 'Şifre en az 6 karakter olmalıdır.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setResult({ error: `Şifre güncellenemedi: ${error.message}. Oturumunuzun süresi dolmuş olabilir.` });
    } else {
      setResult({ success: 'Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...' });
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="relative">
        <Image
          src="/logo.png"
          alt="Ayka Enerji Logo"
          width={180}
          height={60}
          className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 drop-shadow-lg"
        />
        
        <div 
          className="w-full max-w-sm p-8 space-y-8 rounded-3xl shadow-2xl
                     bg-zinc-900/60 backdrop-blur-xl border border-zinc-800"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Yeni Şifre Belirle
            </h1>
            <p className="text-zinc-400 mt-2">Lütfen hesabınız için yeni bir şifre oluşturun.</p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="password"
                placeholder="Yeni Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>
            
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="password"
                placeholder="Yeni Şifreniz (Tekrar)"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Şifreyi Değiştir</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}