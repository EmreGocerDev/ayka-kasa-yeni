// src/app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode; }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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
    <div className="flex min-h-screen">
      <Sidebar userProfile={profile} />
      {/* YAPILAN DEĞİŞİKLİK:
        Aşağıdaki <main> etiketine "p-4 sm:p-8" sınıfları eklendi.
        Bu, içeriğin kenarlardan boşluklu olmasını sağlar.
      */}
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
  );
}