// src/components/dashboard/DashboardClient.tsx
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import LogoutButton from '@/components/LogoutButton';
import { ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, Region, RegionalStats } from '@/app/dashboard/page';

// Tipler
type Profile = {
  id: string;
  full_name: string;
  role: string;
  region_id?: string | null;
} | null;

type Stats = {
  totalIncome: number;
  totalExpense: number;
  cashBalance: number;
  creditCardExpenseTotal: number;
  cashExpenses: number;
};

interface DashboardClientProps {
  user: User;
  profile: Profile;
  initialTransactions: Transaction[];
  creditCardTransactions: Transaction[];
  stats: Stats;
  regions: Region[];
  regionalStats: RegionalStats;
}

// DÜZELTME: formatCurrency fonksiyonu, tüm bileşenlerin erişebilmesi için dışarı taşındı.
const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

// LEVEL 1 kullanıcıları için standart görünüm
const StandardUserView = ({ initialTransactions, creditCardTransactions }: { initialTransactions: Transaction[], creditCardTransactions: Transaction[] }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'creditCard'>('all');
    const transactionsToDisplay = activeTab === 'all' ? initialTransactions : creditCardTransactions;
    
    // Artık `formatCurrency` fonksiyonuna buradan da erişilebilir.
    return (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex border-b border-zinc-700 mb-4">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'all' ? 'text-white border-b-2 border-cyan-500' : 'text-zinc-400 hover:text-white'}`}>Son İşlemler</button>
                <button onClick={() => setActiveTab('creditCard')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'creditCard' ? 'text-white border-b-2 border-cyan-500' : 'text-zinc-400 hover:text-white'}`}>Kredi Kartı Harcamaları</button>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">{activeTab === 'all' ? 'Genel İşlem Listesi' : 'Kredi Kartı İşlem Listesi'}</h2>
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {transactionsToDisplay.length === 0 ? <p className="text-center text-zinc-500 py-8">Bu kategori için işlem bulunmuyor.</p> : transactionsToDisplay.map((tx, index) => (
                        <motion.div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 mb-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-10 rounded-full ${tx.type === 'GİRDİ' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <div>
                                    <p className="font-semibold text-white">{tx.title}</p>
                                    <p className="text-sm text-zinc-400">{new Date(tx.transaction_date).toLocaleDateString('tr-TR')}</p>
                                </div>
                            </div>
                            <p className={`font-bold ${tx.type === 'GİRDİ' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'GİRDİ' ? '+' : '-'} {formatCurrency(tx.amount)}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// LEVEL 2 ve 3 kullanıcıları için Analiz Görünümü
const AdminAnalyticsView = ({ regionalStats }: { regionalStats: RegionalStats }) => {
    // Artık `formatCurrency` fonksiyonuna buradan da erişilebilir.
    const chartData = Object.values(regionalStats).map(region => ({
        name: region.name,
        Gelir: region.totalIncome,
        Gider: region.cashExpenses + region.creditCardExpenseTotal,
    }));

    return (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="text-cyan-400" size={24} />
                <h2 className="text-xl font-bold text-white">Bölgesel Performans Grafiği</h2>
            </div>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value as number)}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.5rem' }} labelStyle={{ color: '#ffffff' }} formatter={(value: number) => formatCurrency(value)} />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar dataKey="Gelir" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill="#4ade80" />)}
                        </Bar>
                        <Bar dataKey="Gider" radius={[4, 4, 0, 0]}>
                             {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill="#f87171" />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(regionalStats).map(region => (
                    <div key={region.name} className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                        <h3 className="font-bold text-white mb-3">{region.name}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center"><span className="text-zinc-400">Nakit Bakiye:</span> <span className={`font-semibold ${region.cashBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatCurrency(region.cashBalance)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-zinc-400">Toplam Gelir:</span> <span className="font-semibold text-green-400">{formatCurrency(region.totalIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-zinc-400">Nakit Gider:</span> <span className="font-semibold text-red-400">{formatCurrency(region.cashExpenses)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-zinc-400">KK Gider:</span> <span className="font-semibold text-orange-400">{formatCurrency(region.creditCardExpenseTotal)}</span></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function DashboardClient({ user, profile, initialTransactions, creditCardTransactions, stats, regionalStats }: DashboardClientProps) {
  const isAdmin = profile && (profile.role === 'LEVEL_2' || profile.role === 'LEVEL_3');
  
  // DÜZELTME: formatCurrency tanımı buradan kaldırıldı çünkü yukarı taşındı.

  return (
    <div className="p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Ana Panel</h1>
          <p className="text-zinc-400">Hoş geldin, {profile?.full_name || user.email}</p>
        </div>
        <LogoutButton />
      </header>
      
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <StatCard title={isAdmin ? "Ortak Nakit Bakiye" : "Nakit Bakiye"} value={formatCurrency(stats.cashBalance)} icon={<Wallet size={24} className="text-white" />} color="text-cyan-400" />
        <StatCard title={isAdmin ? "Ortak Toplam Gelir" : "Toplam Gelir"} value={formatCurrency(stats.totalIncome)} icon={<ArrowUpRight size={24} className="text-white" />} color="text-green-400" />
        <StatCard title={isAdmin ? "Ortak KK Gideri" : "Kredi Kartı Gideri"} value={formatCurrency(stats.creditCardExpenseTotal)} icon={<CreditCard size={24} className="text-white" />} color="text-orange-400" />
        <StatCard title={isAdmin ? "Ortak Nakit Gider" : "Nakit Gider"} value={formatCurrency(stats.cashExpenses)} icon={<ArrowDownLeft size={24} className="text-white" />} color="text-red-400" />
      </motion.div>
      
      {isAdmin ? (
        <AdminAnalyticsView regionalStats={regionalStats} />
      ) : (
        <StandardUserView initialTransactions={initialTransactions} creditCardTransactions={creditCardTransactions} />
      )}
    </div>
  );
}

const StatCard = ({ title, value, icon, color = 'text-white' }: { title: string, value: string, icon: React.ReactNode, color?: string }) => {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 flex items-center gap-6">
      <div className="p-3 bg-zinc-800 rounded-full">{icon}</div>
      <div>
        <p className="text-zinc-400 text-sm">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
};