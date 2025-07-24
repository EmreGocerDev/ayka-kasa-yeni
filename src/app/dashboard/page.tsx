// DOĞRU DOSYA YOLU: src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { User } from '@supabase/supabase-js';

export type Region = {
  id: string;
  name: string;
};

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  transaction_date: string;
  region_id?: string | null;
  payment_method?: string | null;
  regions?: { name: string | null } | null;
};

export type RegionalStats = {
  [key: string]: {
    name: string;
    totalIncome: number;
    cashExpenses: number;
    creditCardExpenseTotal: number;
    cashBalance: number;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Bu kod, aylık filtreleme olmadan, tüm zamanların verisini çeker.
  // Önceki cevaptaki gibi aylık filtreleme istenirse bu kısım güncellenebilir.
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*, region_id, role').eq('id', user.id).single();
      
      const shouldFilterByRegion = profile && (profile.role === 'LEVEL_1' || profile.role === 'LEVEL_2') && profile.region_id;

      let recentTxQuery = supabase.from('transactions').select('*, regions(name)').order('transaction_date', { ascending: false }).limit(5);
      if (shouldFilterByRegion) {
          recentTxQuery = recentTxQuery.eq('region_id', profile.region_id);
      }
      const { data: transactionsData } = await recentTxQuery;

      let creditCardTxQuery = supabase.from('transactions').select('*, regions(name)').eq('payment_method', 'KREDI_KARTI').order('transaction_date', { ascending: false }).limit(5);
      if (shouldFilterByRegion) {
          creditCardTxQuery = creditCardTxQuery.eq('region_id', profile.region_id);
      }
      const { data: creditCardTransactionsData } = await creditCardTxQuery;
      
      let allTransactionsQuery = supabase.from('transactions').select('amount, type, payment_method, region_id').limit(10000);
      if (shouldFilterByRegion) {
        allTransactionsQuery = allTransactionsQuery.eq('region_id', profile.region_id);
      }
      const { data: allTransactions } = await allTransactionsQuery;

      const { data: regionsData } = await supabase.from('regions').select('*');

      // --- DEĞİŞİKLİK BURADA ---
      const totalIncome = allTransactions?.filter(t => t.type === 'GİRDİ').reduce((sum, t) => sum + t.amount, 0) || 0;
      
      // Nakit gideri doğrudan 'NAKİT' ödeme şekline göre hesapla
      const cashExpenses = allTransactions?.filter(t => t.type === 'ÇIKTI' && t.payment_method === 'NAKİT').reduce((sum, t) => sum + t.amount, 0) || 0;

      const creditCardExpenseTotal = allTransactions?.filter(t => t.type === 'ÇIKTI' && t.payment_method === 'KREDI_KARTI').reduce((sum, t) => sum + t.amount, 0) || 0;
      
      // Toplam gider, bu iki spesifik giderin toplamı oldu
      const totalExpense = cashExpenses + creditCardExpenseTotal;
      
      // Nakit bakiye mantığı (Gelir - Nakit Gider)
      const cashBalance = totalIncome - cashExpenses;
      // --- DEĞİŞİKLİK SONU ---

      const regionalStats: RegionalStats = {};
      if (profile && profile.role === 'LEVEL_3' && regionsData && allTransactions) {
        regionsData.forEach(region => {
          regionalStats[region.id] = { name: region.name, totalIncome: 0, cashExpenses: 0, creditCardExpenseTotal: 0, cashBalance: 0 };
        });

        allTransactions.forEach(tx => {
          const regionId = tx.region_id;
          if (regionId && regionalStats[regionId]) {
            if (tx.type === 'GİRDİ') {
              regionalStats[regionId].totalIncome += tx.amount;
            } else {
              if (tx.payment_method === 'KREDI_KARTI') {
                regionalStats[regionId].creditCardExpenseTotal += tx.amount;
              } else if (tx.payment_method === 'NAKİT') { // Burada da daha spesifik olalım
                regionalStats[regionId].cashExpenses += tx.amount;
              }
            }
          }
        });

        Object.keys(regionalStats).forEach(regionId => {
          regionalStats[regionId].cashBalance = regionalStats[regionId].totalIncome - regionalStats[regionId].cashExpenses;
        });
      }

      setData({
        user,
        profile,
        transactions: transactionsData || [],
        creditCardTransactions: creditCardTransactionsData || [],
        stats: { totalIncome, totalExpense, cashBalance, creditCardExpenseTotal, cashExpenses },
        regions: regionsData || [],
        regionalStats,
      });
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardClient
      user={data.user!}
      profile={data.profile}
      initialTransactions={data.transactions}
      creditCardTransactions={data.creditCardTransactions}
      stats={data.stats}
      regions={data.regions}
      regionalStats={data.regionalStats}
    />
  );
}