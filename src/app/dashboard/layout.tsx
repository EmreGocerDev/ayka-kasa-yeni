// src/app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
// GÜNCELLENDİ: Hem Sidebar hem de yeni MobileNav import ediliyor
import Sidebar, { MobileNav } from '@/components/dashboard/Sidebar';

// Profile tipi tanımı
type Profile = {
  full_name: string;
  role: string;
} | null;

export default function DashboardLayout({ children }: { children: React.ReactNode; }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(null);

  useEffect(() => {
    const checkUserAndFetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profileData } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
      setProfile(profileData);
      setLoading(false);
    };
    checkUserAndFetchProfile();
  }, [router, supabase]);

  return (
    // GÜNCELLENDİ: Ana kapsayıcıdan solid arka plan rengi kaldırıldı. Bu, global CSS'teki ışıma efektini geri getirecektir.
    <div className="flex min-h-screen">
      {/* Masaüstü Sidebar'ı (mobil'de gizli) */}
      <Sidebar userProfile={profile} />
      
      {/* Ana içerik ve mobil başlık için kapsayıcı */}
      <div className="flex-1 flex flex-col">
        {/* Mobil Header (masaüstünde gizli) */}
        <MobileNav userProfile={profile} />

        {/* Orijinal <main> yapınız ve padding korunuyor */}
        <main className="flex-1 p-4 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}