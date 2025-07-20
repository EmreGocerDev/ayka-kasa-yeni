'use client'; 

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { User } from '@supabase/supabase-js';

// Define the Region type
type Region = {
  id: string;
  name: string;
};

// Define the Transaction type, ensuring it can include regions data if fetched
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  transaction_date: string;
  region_id?: string | null;
  regions?: { name: string | null } | null; // For joined region data
  // Add other properties if your transaction table has them (e.g., payment_method, created_at, description)
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null); // Consider making `data` type more specific

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('*, region_id').eq('id', user.id).single();
      
      // Fetch transactions, including the joined region name
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*, regions(name)') // Fetch transactions and their associated region names
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (transactionsError) {
        console.error('İşlemler çekilirken hata oluştu:', transactionsError);
        // Handle error, e.g., display a message to the user
      }
      
      // Fetch all transactions for total income/expense calculation
      const { data: allTransactions } = await supabase.from('transactions').select('amount, type');
      
      // Fetch all regions for potential use in DashboardClient (e.g., filtering, display)
      const { data: regionsData, error: regionsError } = await supabase.from('regions').select('*');

      if (regionsError) {
        console.error('Bölgeler çekilirken hata oluştu:', regionsError);
        // Handle error, e.g., display a message to the user
      }

      const totalIncome = allTransactions?.filter(t => t.type === 'GİRDİ').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpense = allTransactions?.filter(t => t.type === 'ÇIKTI').reduce((sum, t) => sum + t.amount, 0) || 0;

      setData({
        user,
        profile,
        transactions: transactionsData || [], // Use the fetched transactionsData
        stats: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
        regions: regionsData || [] // Pass regions data
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
      regions={data.regions} // Pass the regions prop to DashboardClient
    />
  );
}