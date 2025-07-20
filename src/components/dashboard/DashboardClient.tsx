// src/components/dashboard/DashboardClient.tsx
'use client';

import { User } from '@supabase/supabase-js';
import LogoutButton from '@/components/LogoutButton';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Wallet } from 'lucide-react';
import { motion } from 'framer-motion'; // Animasyon için

// Yeni eklenen Region tipi (hala gerekli, çünkü regions prop olarak geliyor)
type Region = {
  id: string;
  name: string;
};

// Veri tiplerini tanımlıyoruz
type Profile = {
  id: string;
  full_name: string;
  role: string;
  region_id?: string | null;
} | null;

// Transaction tipini güncelliyoruz: regions objesi eklendi
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  transaction_date: string;
  region_id?: string | null; // Bu da hala çekiliyor, ama adı için regions objesini kullanacağız
  regions?: { name: string | null } | null; // BURAYA İLİŞKİLİ REGIONS OBJESİ EKLENDİ
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
  regions: Region[]; // regions prop'u hala gerekli
}

export default function DashboardClient({ user, profile, initialTransactions, stats, regions }: DashboardClientProps) {
  // Para formatlama fonksiyonu
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  // getRegionName fonksiyonuna artık doğrudan ihtiyaç kalmadı,
  // çünkü bölge adı doğrudan tx.regions.name üzerinden geliyor.
  // Ama eğer tx.regions null olursa diye kontrol ekleyeceğiz.

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
                    <p className="text-sm text-zinc-400">
                      {new Date(tx.transaction_date).toLocaleDateString('tr-TR')}
                      {/* BURAYA ARTIK İŞLEMİN KENDİ BÖLGE ADINI ÇEKİYORUZ */}
                      {tx.regions?.name && ( // tx.regions var mı ve name'i var mı diye kontrol et
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-zinc-700 rounded-full text-zinc-300">
                          {tx.regions.name}
                        </span>
                      )}
                      {!tx.regions?.name && tx.region_id && ( // Eğer region_id var ama name gelmediyse
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-zinc-700 rounded-full text-zinc-300">
                            Bilinmeyen Bölge
                          </span>
                      )}
                      {!tx.region_id && ( // Eğer region_id hiç yoksa
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-zinc-700 rounded-full text-zinc-300">
                            Bölge Yok
                          </span>
                      )}
                    </p>
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
  );
};