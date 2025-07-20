// src/app/dashboard/page.tsx
'use client'; 

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { User } from '@supabase/supabase-js';

// Region tipini tanımlıyoruz
type Region = {
  id: string;
  name: string;
};

// Transaction tipini güncelliyoruz: regions objesi eklendi
// Supabase'den 'select(*, regions(name))' sorgusu sonrası bu yapıyı döndürür
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  transaction_date: string;
  region_id?: string | null; // Bu da hala çekiliyor, ama adı için regions objesini kullanacağız
  regions?: { name: string | null } | null; // BURADA İLİŞKİLİ REGIONS OBJESİ VAR
  // Eğer transactions tablonuzda payment_method, created_at, description gibi başka sütunlar varsa,
  // bu tipe eklemeyi unutmayın, 'select(*, regions(name))' onları da çekecektir.
  // payment_method?: string;
  // created_at?: string;
  // description?: string | null;
};


export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // data state'i için daha spesifik bir tip oluşturabiliriz

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('*, region_id').eq('id', user.id).single();
      
      // BURASI EN KRİTİK DEĞİŞİKLİK: transactions verisini çekerken, regions ilişkisinden name'i de çekiyoruz.
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*, regions(name)') // <<<--- BURASI regions(name) OLARAK GÜNCELLENDİ
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (transactionsError) {
        console.error('İşlemler çekilirken hata oluştu:', transactionsError);
        // Hata durumunda kullanıcıya bir mesaj gösterebilirsiniz
      }
      
      const { data: allTransactions } = await supabase.from('transactions').select('amount, type');
      
      // Tüm bölgeler listesini de çekmeye devam ediyoruz (DashboardClient'ta genel bölgeler listesi için)
      const { data: regionsData, error: regionsError } = await supabase.from('regions').select('*');

      if (regionsError) {
        console.error('Bölgeler çekilirken hata oluştu:', regionsError);
        // Hata durumunda kullanıcıya bir mesaj gösterebilirsiniz
      }

      const totalIncome = allTransactions?.filter(t => t.type === 'GİRDİ').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = allTransactions?.filter(t => t.type === 'ÇIKTI').reduce((sum, t) => sum + t.amount, 0) || 0;

      setData({
        user,
        profile,
        transactions: transactionsData || [], // Çekilen data'yı kullanıyoruz
        stats: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
        regions: regionsData || [] 
      });
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardClient
      user={data.user!}
      profile={data.profile}
      initialTransactions={data.transactions}
      stats={data.stats}
      regions={data.regions} 
    />
  );
}