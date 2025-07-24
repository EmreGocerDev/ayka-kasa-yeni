// src/components/dashboard/DashboardClient.tsx
'use client';

import { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import LogoutButton from '@/components/LogoutButton';
import { ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

// LEVEL 1 kullanıcıları için standart görünüm
const StandardUserView = ({ initialTransactions, creditCardTransactions }: { initialTransactions: Transaction[], creditCardTransactions: Transaction[] }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'creditCard'>('all');
    const transactionsToDisplay = activeTab === 'all' ? initialTransactions : creditCardTransactions;
    
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

// SADECE LEVEL_3 (SÜPER ADMİN) İÇİN Analiz Görünümü
const AdminAnalyticsView = ({ regionalStats }: { regionalStats: RegionalStats }) => {
    // Bu bileşenin iç mantığı aynı kalabilir
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

    const handleRegionToggle = (regionName: string) => {
        setSelectedRegions(prev => 
            prev.includes(regionName) 
            ? prev.filter(r => r !== regionName)
            : [...prev, regionName]
        );
    };

    const clearSelection = () => setSelectedRegions([]);

    const selectionSummary = useMemo(() => {
        if (selectedRegions.length === 0) return null;

        const selectedData = Object.values(regionalStats).filter(region => selectedRegions.includes(region.name));
        
        const totalIncome = selectedData.reduce((sum, region) => sum + region.totalIncome, 0);
        const cashExpenses = selectedData.reduce((sum, region) => sum + region.cashExpenses, 0);
        const creditCardExpenseTotal = selectedData.reduce((sum, region) => sum + region.creditCardExpenseTotal, 0);
        const cashBalance = totalIncome - cashExpenses;
        return { totalIncome, cashExpenses, creditCardExpenseTotal, cashBalance };
    }, [regionalStats, selectedRegions]);

    return (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Bölgesel Analiz</h2>
                    <p className="text-zinc-400 text-sm">Detayları toplu görmek için kartlara tıklayarak seçim yapın.</p>
                </div>
                {selectedRegions.length > 0 && (
                     <button onClick={clearSelection} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-700 text-zinc-300 hover:bg-red-800 hover:text-white transition-all">
                        <XCircle size={14} />
                        Seçimi Temizle
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(regionalStats).map(region => {
                    const isSelected = selectedRegions.includes(region.name);
                    const isSelectionActive = selectedRegions.length > 0;
                    return (
                        <motion.div 
                            key={region.name} 
                            layout
                            onClick={() => handleRegionToggle(region.name)}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer 
                                ${isSelected 
                                    ? 'bg-zinc-700/50 border-cyan-500 scale-[1.02] shadow-lg shadow-cyan-500/10' 
                                    : isSelectionActive 
                                        ? 'bg-zinc-800/50 border-zinc-700 opacity-50 hover:opacity-100 hover:border-zinc-600'
                                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                                }
                            `}
                        >
                            <h3 className="font-bold text-white mb-3">{region.name}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center"><span className="text-zinc-400">Nakit Bakiye:</span> <span className={`font-semibold ${region.cashBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatCurrency(region.cashBalance)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-zinc-400">Toplam Gelir:</span> <span className="font-semibold text-green-400">{formatCurrency(region.totalIncome)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-zinc-400">Nakit Gider:</span> <span className="font-semibold text-red-400">{formatCurrency(region.cashExpenses)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-zinc-400">KK Gider:</span> <span className="font-semibold text-orange-400">{formatCurrency(region.creditCardExpenseTotal)}</span></div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <AnimatePresence>
            {selectionSummary && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '2rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="pt-6 border-t border-dashed border-zinc-700"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Seçilenlerin Toplamı ({selectedRegions.length} Bölge)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-cyan-900/40 p-4 rounded-lg border border-cyan-800/50">
                            <p className="text-sm text-cyan-200">Toplam Nakit Bakiye</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(selectionSummary.cashBalance)}</p>
                        </div>
                         <div className="bg-green-900/40 p-4 rounded-lg border border-green-800/50">
                            <p className="text-sm text-green-200">Toplam Gelir</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(selectionSummary.totalIncome)}</p>
                        </div>
                         <div className="bg-red-900/40 p-4 rounded-lg border border-red-800/50">
                            <p className="text-sm text-red-200">Toplam Nakit Gider</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(selectionSummary.cashExpenses)}</p>
                        </div>
                        <div className="bg-orange-900/40 p-4 rounded-lg border border-orange-800/50">
                            <p className="text-sm text-orange-200">Toplam KK Gideri</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(selectionSummary.creditCardExpenseTotal)}</p>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};


export default function DashboardClient({ user, profile, initialTransactions, creditCardTransactions, stats, regionalStats }: DashboardClientProps) {
  // DEĞİŞİKLİK 3: isAdmin tanımı artık sadece LEVEL_3'ü içeriyor.
  const isAdmin = profile && profile.role === 'LEVEL_3';
  
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
        <StatCard title="Nakit Bakiye" value={formatCurrency(stats.cashBalance)} icon={<Wallet size={24} className="text-white" />} color="text-cyan-400" />
        <StatCard title="Toplam Gelir" value={formatCurrency(stats.totalIncome)} icon={<ArrowUpRight size={24} className="text-white" />} color="text-green-400" />
        <StatCard title="Kredi Kartı Gideri" value={formatCurrency(stats.creditCardExpenseTotal)} icon={<CreditCard size={24} className="text-white" />} color="text-orange-400" />
        <StatCard title="Nakit Gider" value={formatCurrency(stats.cashExpenses)} icon={<ArrowDownLeft size={24} className="text-white" />} color="text-red-400" />
      </motion.div>
      
      {/* Bu koşul artık LEVEL_2 için false dönecek ve StandardUserView gösterilecek */}
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