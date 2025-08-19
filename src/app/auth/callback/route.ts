// src/app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/'; // Eğer 'next' parametresi yoksa anasayfaya yönlendir

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
        // Kod başarıyla oturuma dönüştürüldü.
        // Kullanıcıyı şifresini sıfırlayacağı sayfaya yönlendir.
        // 'next' parametresi burada /reset-password olacak.
      return NextResponse.redirect(requestUrl.origin + next);
    }
  }

  // Hata durumunda veya kod yoksa, kullanıcıyı bir hata sayfasına yönlendir
  console.error('Password reset flow error: Invalid code or other issue.');
  return NextResponse.redirect(`${requestUrl.origin}/login?error=sifre_sifirlama_basarisiz`);
}