// src/components/dashboard/DashboardClient.tsx
'use client';

import { User } from '@supabase/supabase-js';
import LogoutButton from '@/components/LogoutButton';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Wallet } from 'lucide-react';
import { motion } from 'framer-motion'; // Animasyon için

// Veri tiplerini tanımlıyoruz
type Profile = {
  id: string;
  full_name: string;
  role: string;
} | null;

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  transaction_date: string;
};

type Stats = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

// Component'in alacağı propları tanımlıyoruz
interface DashboardClientProps {
  user: User;
  profile: Profile;
  initialTransactions: Transaction[];
  stats: Stats;
}

export default function DashboardClient({ user, profile, initialTransactions, stats }: DashboardClientProps) {
  
  // Para formatlama fonksiyonu
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  return (
    <div className="p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Ana Panel</h1>
          <p className="text-zinc-400">Hoş geldin, {profile?.full_name || user.email}</p>
        </div>
        <LogoutButton />
      </header>

      {/* İstatistik Kartları */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard title="Mevcut Bakiye" value={formatCurrency(stats.balance)} icon={<Wallet size={24} />} />
        <StatCard title="Toplam Gelir" value={formatCurrency(stats.totalIncome)} icon={<ArrowUpRight size={24} />} color="text-green-400" />
        <StatCard title="Toplam Gider" value={formatCurrency(stats.totalExpense)} icon={<ArrowDownLeft size={24} />} color="text-red-400" />
      </motion.div>

      {/* Son İşlemler */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
        <h2 className="text-xl font-bold mb-4">Son İşlemler</h2>
        <div className="space-y-4">
          {initialTransactions.length > 0 ? (
            initialTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${tx.type === 'GİRDİ' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-semibold">{tx.title}</p>
                    <p className="text-sm text-zinc-400">{new Date(tx.transaction_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
                <p className={`font-bold ${tx.type === 'GİRDİ' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'GİRDİ' ? '+' : '-'} {formatCurrency(tx.amount)}
                </p>
              </motion.div>
            ))
          ) : (
            <p className="text-center text-zinc-500 py-8">Henüz işlem bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// İstatistik kartları için ayrı bir component
const StatCard = ({ title, value, icon, color = 'text-white' }: { title: string, value: string, icon: React.ReactNode, color?: string }) => {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 flex items-center gap-6">
      <div className="p-3 bg-zinc-800 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-zinc-400 text-sm">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  )
}