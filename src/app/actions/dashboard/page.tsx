'use client'; 

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // Hızlı çözüm için 'any', ideali belirgin bir tip kullanmaktır.

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        // DÜZELTME 1: Tüm veri çekme işlemlerini bir araya topluyoruz.
        const [profileRes, transactionsRes, allTransactionsRes, regionsRes] = await Promise.all([
          supabase.from('profiles').select('*, regions(name)').eq('id', user.id).single(),
          supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(5),
          supabase.from('transactions').select('amount, type'),
          supabase.from('regions').select('*') // Eksik olan bölgeleri çekme sorgusu
        ]);

        if (profileRes.error) throw profileRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (allTransactionsRes.error) throw allTransactionsRes.error;
        if (regionsRes.error) throw regionsRes.error;
        
        const allTransactions = allTransactionsRes.data || [];
        const totalIncome = allTransactions.filter(t => t.type === 'GİRDİ').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = allTransactions.filter(t => t.type === 'ÇIKTI').reduce((sum, t) => sum + t.amount, 0);

        // DÜZELTME 2: Çekilen bölgeleri ana veri state'ine ekliyoruz.
        setData({
          user,
          profile: profileRes.data,
          transactions: transactionsRes.data || [],
          stats: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
          regions: regionsRes.data || []
        });

      } catch (error) {
        console.error("Dashboard verileri çekilirken hata oluştu:", error);
        // Hata durumunda kullanıcıya bilgi verilebilir.
      } finally {
        setLoading(false);
      }
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

  // Kodun çökmesini engelleyen önemli bir kontrol
  if (!data) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <p className="text-red-400">Veriler yüklenirken bir sorun oluştu.</p>
      </div>
    );
  }

  return (
    <DashboardClient
      user={data.user}
      profile={data.profile}
      initialTransactions={data.transactions}
      stats={data.stats}
      // DÜZELTME 3: Eksik olan 'regions' prop'unu DashboardClient'a gönderiyoruz.
      regions={data.regions} 
    />
  );
}