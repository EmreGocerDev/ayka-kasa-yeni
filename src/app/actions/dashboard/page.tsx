'use client'; 

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: transactions } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(5);
      const { data: allTransactions } = await supabase.from('transactions').select('amount, type');
      
      const totalIncome = allTransactions?.filter(t => t.type === 'GİRDİ').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = allTransactions?.filter(t => t.type === 'ÇIKTI').reduce((sum, t) => sum + t.amount, 0) || 0;

      setData({
        user,
        profile,
        transactions: transactions || [],
        stats: { totalIncome, totalExpense, balance: totalIncome - totalExpense }
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
    />
  );
}