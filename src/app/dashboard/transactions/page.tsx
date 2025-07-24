'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Edit, Trash2, ChevronDown, MessageSquare, Filter, X, FileText, TrendingUp, TrendingDown, Wallet, Landmark, Receipt, Eye, MapPin, User, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// Tipler
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  payment_method: string;
  transaction_date: string;
  created_at: string;
  description: string | null;
  region_id?: string | null;
  regions?: { name: string | null } | null;
  fatura_tipi: string | null;
  image_path: string | null;
  expense_region_info: string | null;
  user_id: string | null;
};

type Region = {
  id: string;
  name: string;
};

type UserProfile = {
    id: string;
    full_name: string;
};

// Ana Component
export default function AllTransactionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userRole, setUserRole] = useState('LEVEL_1');
  const [loading, setLoading] = useState(true);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastModifiedId, setLastModifiedId] = useState<string | null>(null);
  
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterType, setFilterType] = useState<'GİRDİ' | 'ÇIKTI' | ''>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');
  const [filterInvoiceType, setFilterInvoiceType] = useState<string>('');
  const [filterExpenseRegion, setFilterExpenseRegion] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  
  const [regions, setRegions] = useState<Region[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [sortBy, setSortBy] = useState<'transaction_date' | 'created_at'>('transaction_date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isInitialLoad, setIsInitialLoad] = useState(true);


  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setResult(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  useEffect(() => {
    if (lastModifiedId) {
      const element = document.querySelector(`[data-id="${lastModifiedId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => {
        setLastModifiedId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastModifiedId, transactions]);


  const filteredAndSearchedTransactions = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    if (!lowercasedSearchTerm) return transactions;
    return transactions.filter(tx => {
      const transactionUser = users.find(u => u.id === tx.user_id);
      const searchableContent = [ tx.title, tx.amount.toString(), tx.description, tx.payment_method, tx.fatura_tipi, tx.regions?.name, tx.expense_region_info, transactionUser?.full_name ].join(' ').toLowerCase();
      return searchableContent.includes(lowercasedSearchTerm);
    });
  }, [transactions, searchTerm, users]);

  const summary = useMemo(() => {
    const data = filteredAndSearchedTransactions;
    const totalIncome = data.filter(tx => tx.type === 'GİRDİ').reduce((acc, tx) => acc + tx.amount, 0);
    const cashExpenses = data.filter(tx => tx.type === 'ÇIKTI' && tx.payment_method !== 'KREDI_KARTI').reduce((acc, tx) => acc + tx.amount, 0);
    const creditCardExpenses = data.filter(tx => tx.type === 'ÇIKTI' && tx.payment_method === 'KREDI_KARTI').reduce((acc, tx) => acc + tx.amount, 0);
    const totalExpense = cashExpenses + creditCardExpenses;
    const balance = totalIncome - cashExpenses;
    return { totalIncome, totalExpense, balance, cashExpenses, creditCardExpenses };
  }, [filteredAndSearchedTransactions]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    
    const { data: profile } = await supabase.from('profiles').select('role, region_id').eq('id', user.id).single();
    const currentUserRole = profile?.role || 'LEVEL_1';
    setUserRole(currentUserRole);

     if (isInitialLoad && profile?.region_id) {
        setFilterRegion(profile.region_id);
        setIsInitialLoad(false);
        // State güncellendiği için useEffect bu fonksiyonu doğru filtreyle tekrar çağıracak.
        // Bu yüzden mevcut sorguya devam etmeden çıkıyoruz ve gereksiz veri çekmiyoruz.
        return; 
    } 
    
    const isAdmin = currentUserRole === 'LEVEL_3';

    if (regions.length === 0) {
      const { data: regionsData } = await supabase.from('regions').select('id, name').order('name');
      setRegions(regionsData || []);
    }
    if (users.length === 0 && isAdmin) {
      const { data: usersData } = await supabase.from('profiles').select('id, full_name').order('full_name');
      setUsers(usersData || []);
    }

    let query = supabase.from('transactions').select('*, regions(name)').order(sortBy, { ascending: sortOrder === 'asc' }).limit(10000);

    if ((currentUserRole === 'LEVEL_1' || currentUserRole === 'LEVEL_2') && profile?.region_id) {
        query = query.eq('region_id', profile.region_id);
    }
    
    if (filterStartDate) query = query.gte('transaction_date', filterStartDate);
    if (filterEndDate) query = query.lte('transaction_date', filterEndDate);
    if (filterType) query = query.eq('type', filterType);
    if (filterPaymentMethod) query = query.eq('payment_method', filterPaymentMethod);

    if (filterInvoiceType) {
        if (filterInvoiceType === 'YOK') query = query.is('fatura_tipi', null);
        else query = query.eq('fatura_tipi', filterInvoiceType);
    }

    if (isAdmin) {
        if (filterRegion) query = query.eq('region_id', filterRegion);
        if (filterUser) query = query.eq('user_id', filterUser);
        if (filterExpenseRegion) query = query.eq('expense_region_info', filterExpenseRegion);
    }

    const { data: transactionsData, error } = await query;

    if (error) {
      setResult({ error: 'İşlemler yüklenirken bir sorun oluştu.' });
      console.error('Supabase Fetch Error:', error);
    } else {
      setTransactions(transactionsData || []);
    }
    setLoading(false);
  }, [router, supabase, filterStartDate, filterEndDate, filterRegion, filterType, regions.length, users.length, filterPaymentMethod, filterInvoiceType, filterExpenseRegion, filterUser, sortBy, sortOrder]); 

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
      () => { fetchData(); })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase]);

  const canModify = userRole === 'LEVEL_3';
  const isAdmin = userRole === 'LEVEL_3';

  const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('tr-TR');

  const clearFilters = () => {
    setFilterStartDate(''); setFilterEndDate(''); setFilterRegion(''); setFilterType('');
    setFilterPaymentMethod(''); setFilterInvoiceType(''); setFilterExpenseRegion(''); setFilterUser('');
    setSearchTerm('');
    setResult(null);
  };
  
  const handleExportToExcel = async () => {
    setExporting(true);
    setResult(null);
    try {
      const dataToExport = filteredAndSearchedTransactions.map(tx => {
        const transactionUser = users.find(u => u.id === tx.user_id);
        return {
        'ID': tx.id, 'İşlem Tarihi': formatDate(tx.transaction_date), 'Başlık': tx.title, 'Miktar': tx.amount, 'Tip': tx.type, 'Ödeme Şekli': tx.payment_method?.replace('_', ' ') || 'Belirtilmemiş', 'Fatura Tipi': tx.fatura_tipi ? tx.fatura_tipi.replace('_', ' ') : 'Yok', 'Açıklama': tx.description || '', 'Bölge': tx.regions?.name || 'Bilinmiyor', 'Gider Bölge Detayı': tx.expense_region_info || 'Yok', 'İşlemi Yapan': transactionUser?.full_name || 'Bilinmiyor', 'Kayıt Tarihi': formatDateTime(tx.created_at),
      }});
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "İşlemler");
      const fileName = `islem_kayitlari_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setResult({ success: 'İşlemler Excel\'e başarıyla aktarıldı.' });
    } catch (error: any) {
      setResult({ error: 'Excel\'e aktarılırken bir hata oluştu: ' + (error.message || 'Bilinmeyen Hata') });
    } finally {
      setExporting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setActionLoading(true);
    setResult(null);
    const currentTransactionId = editingTransaction.id;
    
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'GİRDİ' | 'ÇIKTI';
    
    let updatedData: Partial<Transaction> = {
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: type,
      transaction_date: formData.get('transaction_date') as string,
      description: formData.get('description') as string || null,
    };
    
    if (type === 'ÇIKTI') {
      updatedData.payment_method = formData.get('payment_method') as string;
      updatedData.fatura_tipi = formData.get('fatura_tipi') as string;
    } else {
      updatedData.payment_method = 'NAKİT';
      updatedData.fatura_tipi = null;
    }
    
    const { error } = await supabase.from('transactions').update(updatedData).eq('id', editingTransaction.id);

    if (error) {
      setResult({ error: `Güncelleme hatası: ${error.message}` });
    } else {
      setResult({ success: 'İşlem başarıyla güncellendi.' });
      setLastModifiedId(currentTransactionId);
      setEditingTransaction(null);
      fetchData();
    }
    setActionLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    setActionLoading(true);
    setResult(null);

    const { error } = await supabase.from('transactions').delete().eq('id', deletingTransaction.id);

    if (error) {
      setResult({ error: `Silme hatası: ${error.message}` });
    } else {
      setResult({ success: 'İşlem başarıyla silindi.' });
      setDeletingTransaction(null);
      fetchData();
    }
    setActionLoading(false);
  };
  
  const handleViewImage = async (path: string) => {
    setActionLoading(true);
    setResult(null);
    try {
      const { data } = supabase.storage.from('islem-gorselleri').getPublicUrl(path);
      setViewingImageUrl(data.publicUrl);
    } catch (error: any) {
      setResult({ error: `Görsel URL'i alınamadı: ${error.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes flash-red {
          50% {
            background-color: rgba(127, 29, 29, 0.7); /* Tailwind red-800, %70 opacity */
          }
        }
        .animate-flash-red {
          animation: flash-red 1s ease-in-out 3;
        }
      `}</style>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className='text-center sm:text-left'>
            <h1 className="text-3xl font-bold text-white">Tüm İşlemler</h1>
            <p className="text-zinc-400">Gerçekleşen tüm gelir ve gider kayıtları.</p>
          </div>
          <button onClick={handleExportToExcel} className="py-2 px-4 w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200 disabled:opacity-50" disabled={exporting || transactions.length === 0}>
            <FileText size={18} /> Excel'e Aktar
          </button>
        </header>

        <AnimatePresence>
            {result?.success && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="mb-4 p-3 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg">{result.success}</motion.div>
            )}
            {result?.error && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg">{result.error}</motion.div>
            )}
        </AnimatePresence>
        
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div><label htmlFor="filterStartDate" className="block text-xs font-medium text-zinc-300 mb-1">Başlangıç</label><input type="date" id="filterStartDate" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
            <div><label htmlFor="filterEndDate" className="block text-xs font-medium text-zinc-300 mb-1">Bitiş</label><input type="date" id="filterEndDate" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
            <div><label htmlFor="filterType" className="block text-xs font-medium text-zinc-300 mb-1">Tip</label><select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option><option value="GİRDİ">Gelir</option><option value="ÇIKTI">Gider</option></select></div>
            <div><label htmlFor="filterPaymentMethod" className="block text-xs font-medium text-zinc-300 mb-1">Ödeme Tipi</label><select id="filterPaymentMethod" value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option><option value="NAKİT">Nakit</option><option value="KREDI_KARTI">Kredi Kartı</option></select></div>
            <div><label htmlFor="filterInvoiceType" className="block text-xs font-medium text-zinc-300 mb-1">Fatura Tipi</label><select id="filterInvoiceType" value={filterInvoiceType} onChange={(e) => setFilterInvoiceType(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option><option value="YOK">Yok</option><option value="FATURA">Fatura</option><option value="E_FATURA">E-Fatura</option><option value="KASA_FISI">Kasa Fişi</option></select></div>
            
            {isAdmin && (
                <>
                    <div><label htmlFor="filterRegion" className="block text-xs font-medium text-zinc-300 mb-1">Bölge</label><select id="filterRegion" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option>{regions.map(region => (<option key={region.id} value={region.id}>{region.name}</option>))}</select></div>
                    <div><label htmlFor="filterExpenseRegion" className="block text-xs font-medium text-zinc-300 mb-1">Gider Bölge Detayı</label><select id="filterExpenseRegion" value={filterExpenseRegion} onChange={(e) => setFilterExpenseRegion(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option>{regions.map(region => (<option key={region.name} value={region.name}>{region.name}</option>))}</select></div>
                    <div><label htmlFor="filterUser" className="block text-xs font-medium text-zinc-300 mb-1">Kişi</label><select id="filterUser" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="">Tümü</option>{users.map(user => (<option key={user.id} value={user.id}>{user.full_name}</option>))}</select></div>
                </>
            )}

            <div className={`flex gap-2 col-span-1 sm:col-span-2 lg:col-span-4 ${isAdmin ? 'lg:col-start-3' : ''}`}><button onClick={fetchData} className="w-full py-2 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50" disabled={loading}><Filter size={18} /> Filtrele</button>{(filterStartDate || filterEndDate || filterRegion || filterType || filterPaymentMethod || filterInvoiceType || filterExpenseRegion || filterUser) && (<button onClick={clearFilters} className="w-full py-2 px-4 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold rounded-lg transition-colors duration-200"><X size={18} /> Temizle</button>)}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"><div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/20"><Wallet size={24} className="text-cyan-400" /></div><div><p className="text-sm text-zinc-400">Filtrelenen Nakit Bakiye</p><p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(summary.balance)}</p></div></div>
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"><div className="p-3 bg-green-500/10 rounded-full border border-green-500/20"><TrendingUp size={24} className="text-green-400" /></div><div><p className="text-sm text-zinc-400">Filtrelenen Gelir</p><p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalIncome)}</p></div></div>
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"><div className="p-3 bg-red-500/10 rounded-full border border-red-500/20"><TrendingDown size={24} className="text-red-400" /></div><div><p className="text-sm text-zinc-400">Filtrelenen Nakit Gider</p><p className="text-2xl font-bold text-red-400">{formatCurrency(summary.cashExpenses)}</p></div></div>
             <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"><div className="p-3 bg-orange-500/10 rounded-full border border-orange-500/20"><CreditCard size={24} className="text-orange-400" /></div><div><p className="text-sm text-zinc-400">Filtrelenen KK Gideri</p><p className="text-2xl font-bold text-orange-400">{formatCurrency(summary.creditCardExpenses)}</p></div></div>
        </div>

       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center justify-start gap-4">
                <div className='flex items-center gap-2'>
                    <label htmlFor="sortBy" className="text-sm text-zinc-400">Sırala:</label>
                    <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="py-1 px-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500">
                        <option value="transaction_date">İşlem Tarihi</option>
                        <option value="created_at">Kayıt Tarihi</option>
                    </select>
                </div>
                <div className='flex items-center gap-2'>
                    <label htmlFor="sortOrder" className="text-sm text-zinc-400">Sıra:</label>
                    <select id="sortOrder" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="py-1 px-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500">
                        <option value="desc">Yeniye Göre</option>
                        <option value="asc">Eskiye Göre</option>
                    </select>
                </div>
            </div>

            <div className="relative w-full sm:w-64">
                <input
                    type="text"
                    placeholder="Tüm detaylarda ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 text-sm bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {searchTerm ? (
                        <button 
                            onClick={() => setSearchTerm('')} 
                            className="text-zinc-400 hover:text-white pointer-events-auto"
                        >
                            <X size={16} />
                        </button>
                    ) : (
                        <Filter size={16} className="text-zinc-400" />
                    )}
                </div>
            </div>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-700">
                <tr className='hidden md:table-row'>
                    <th className="p-4 w-12 text-zinc-400"></th>
                    <th className="p-4 text-sm font-semibold text-zinc-400">Başlık / Tarih</th>
                    {isAdmin && <th className="p-4 text-sm font-semibold text-zinc-400 hidden lg:table-cell">Bölge</th>}
                    <th className="p-4 text-sm font-semibold text-zinc-400 text-right">Tutar / Tip</th>
                    {canModify && <th className="p-4 text-sm font-semibold text-zinc-400 text-center">Eylemler</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAndSearchedTransactions.length === 0 ? (
                  <tr><td colSpan={isAdmin ? (canModify ? 5 : 4) : (canModify ? 4 : 3)} className="text-center text-zinc-500 py-12">
                    {loading ? 'İşlemler yükleniyor...' : (searchTerm ? 'Arama sonucu bulunamadı.' : 'Görüntülenecek işlem bulunmuyor.')}
                  </td></tr>
                ) : (
                  filteredAndSearchedTransactions.map(tx => {
                    const transactionUser = users.find(u => u.id === tx.user_id);
                    const isExpanded = expandedRow === tx.id;
                    const isModified = lastModifiedId === tx.id;
                    return (
                      <React.Fragment key={tx.id}>
                        <tr 
                          data-id={tx.id}
                          className={`border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer ${isModified ? 'animate-flash-red' : ''}`}
                          onClick={() => setExpandedRow(isExpanded ? null : tx.id)}>
                          <td className="p-4 text-center hidden md:table-cell"><ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-white`} /></td>
                          <td className="p-4">
                            <div className="font-bold text-white">{tx.title}</div>
                            <div className="text-sm text-zinc-400">{formatDate(tx.transaction_date)}</div>
                          </td>
                          {isAdmin && <td className="p-4 text-zinc-400 hidden lg:table-cell">{tx.regions?.name || 'Bilinmiyor'}</td>}
                          <td className="p-4 text-right">
                            <div className={`font-bold text-lg ${tx.type === 'GİRDİ' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'GİRDİ' ? '+' : '-'}{formatCurrency(tx.amount)}</div>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tx.type === 'GİRDİ' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>{tx.type}</span>
                          </td>
                          {canModify && 
                            <td className="p-4 hidden md:table-cell">
                              <div className="flex justify-center items-center gap-2 transition-opacity duration-200">
                                <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); }} className="p-2 text-zinc-400 hover:text-white transition-colors"><Edit size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeletingTransaction(tx); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          }
                          {!canModify && isAdmin && <td className="p-4 hidden md:table-cell"></td>}
                          <td className="p-4 text-center md:hidden"><ChevronDown size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-white`} /></td>
                        </tr>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr 
                              key={`${tx.id}-details`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-zinc-800/50"
                            >
                              <td colSpan={isAdmin ? (canModify ? 5 : 4) : (canModify ? 4 : 3)} className="p-4 text-zinc-400">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                  <div className="flex gap-2 items-start col-span-1 sm:col-span-2"><MessageSquare size={14} className="mt-0.5 flex-shrink-0" /><span><strong>Açıklama:</strong> <span className="text-zinc-200">{tx.description || 'Girilmemiş.'}</span></span></div>
                                  <div className="flex gap-2 items-center"><Landmark size={14} className="flex-shrink-0" /><span><strong>Ödeme Şekli:</strong> <span className="text-zinc-200">{tx.payment_method?.replace('_', ' ') || 'Belirtilmemiş'}</span></span></div>
                                  {tx.type === 'ÇIKTI' && (<div className="flex gap-2 items-center"><Receipt size={14} className="flex-shrink-0" /><span><strong>Fatura Tipi:</strong> <span className="text-zinc-200">{tx.fatura_tipi?.replace('_', ' ') || 'Yok'}</span></span></div>)}
                                  {isAdmin && tx.expense_region_info && (<div className="flex gap-2 items-start"><MapPin size={14} className="mt-0.5 flex-shrink-0" /><span><strong>Gider Bölge Detayı:</strong> <span className="text-zinc-200">{tx.expense_region_info}</span></span></div>)}
                                  {isAdmin && transactionUser && (<div className="flex gap-2 items-center"><User size={14} className="flex-shrink-0" /><span><strong>İşlemi Yapan:</strong> <span className="text-zinc-200">{transactionUser.full_name}</span></span></div>)}
                                  {tx.image_path && ( <div className="col-span-1 sm:col-span-2"><button onClick={(e) => { e.stopPropagation(); handleViewImage(tx.image_path!);}} disabled={actionLoading} className="inline-flex items-center gap-2 text-sm font-semibold py-2 px-3 bg-cyan-600/50 text-cyan-300 rounded-lg hover:bg-cyan-600/80 hover:text-white transition-all disabled:opacity-50"><Eye size={14} /> Görseli Görüntüle</button></div> )}
                                  {canModify && ( <div className="flex items-center gap-4 pt-3 border-t border-zinc-700/50 col-span-1 sm:col-span-2 md:hidden"><button onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); }} className="flex items-center gap-2 py-2 px-3 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white"><Edit size={14} /> Düzenle</button><button onClick={(e) => { e.stopPropagation(); setDeletingTransaction(tx); }} className="flex items-center gap-2 py-2 px-3 text-sm rounded-lg bg-red-800 hover:bg-red-700 text-white"><Trash2 size={14} /> Sil</button></div> )}
                                  <div className="flex gap-2 items-center col-span-full sm:col-span-2 mt-2 pt-3 border-t border-zinc-700/50"><strong className="text-zinc-500">Kayıt Tarihi:</strong><span className="text-zinc-500">{formatDateTime(tx.created_at)}</span></div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {editingTransaction && <EditTransactionModal transaction={editingTransaction} regions={regions} onClose={() => setEditingTransaction(null)} onSave={handleUpdate} loading={actionLoading} />}
        {deletingTransaction && <DeleteTransactionModal transaction={deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={handleDeleteConfirm} loading={actionLoading} />}
        {viewingImageUrl && <ImageViewerModal imageUrl={viewingImageUrl} onClose={() => setViewingImageUrl(null)} />}
      </AnimatePresence>
    </>
  );
}

// Edit Modal
function EditTransactionModal({ transaction, regions, onClose, onSave, loading }: { transaction: Transaction, regions: Region[], onClose: () => void, onSave: (e: React.FormEvent<HTMLFormElement>) => void, loading: boolean }) {
    const [currentType, setCurrentType] = useState(transaction.type);
  
    useEffect(() => {
      setCurrentType(transaction.type);
    }, [transaction]);
  
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold text-white mb-4">İşlemi Düzenle</h2>
          <form onSubmit={onSave} className="space-y-4">
            <div><label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">Başlık</label><input type="text" name="title" id="title" defaultValue={transaction.title} required className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
            <div><label htmlFor="amount" className="block text-sm font-medium text-zinc-300 mb-1">Miktar</label><input type="number" name="amount" id="amount" defaultValue={transaction.amount} step="0.01" required className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
            <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">İşlem Tipi</label>
                <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg border-2 border-zinc-700 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-500/20 transition-all"><input type="radio" name="type" value="GİRDİ" required checked={currentType === 'GİRDİ'} onChange={(e) => setCurrentType(e.target.value as 'GİRDİ')} className="sr-only"/><span className="font-semibold text-green-400">Gelir</span></label>
                    <label className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg border-2 border-zinc-700 cursor-pointer has-[:checked]:border-red-500 has-[:checked]:bg-red-500/20 transition-all"><input type="radio" name="type" value="ÇIKTI" required checked={currentType === 'ÇIKTI'} onChange={(e) => setCurrentType(e.target.value as 'ÇIKTI')} className="sr-only"/><span className="font-semibold text-red-400">Gider</span></label>
                </div>
            </div>
  
            {currentType === 'ÇIKTI' && (
              <>
                <div><label htmlFor="payment_method" className="block text-sm font-medium text-zinc-300 mb-1">Ödeme Türü</label><select id="payment_method" name="payment_method" required defaultValue={transaction.payment_method} className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="NAKİT">Nakit</option><option value="KREDI_KARTI">Kredi Kartı</option></select></div>
                <div><label htmlFor="fatura_tipi" className="block text-sm font-medium text-zinc-300 mb-1">Fatura Tipi</label><select id="fatura_tipi" name="fatura_tipi" required defaultValue={transaction.fatura_tipi || 'YOK'} className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"><option value="YOK">Yok</option><option value="FATURA">Fatura</option><option value="E_FATURA">E-Fatura</option><option value="KASA_FISI">Kasa Fişi</option></select></div>
              </>
            )}
  
            <div><label htmlFor="transaction_date" className="block text-sm font-medium text-zinc-300 mb-1">İşlem Tarihi</label><input type="date" name="transaction_date" id="transaction_date" defaultValue={transaction.transaction_date.split('T')[0]} required className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"/></div>
            <div><label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Açıklama</label><textarea id="description" name="description" defaultValue={transaction.description || ''} rows={3} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div>
  
            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="py-2 px-4 font-bold text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-700/50 transition-colors">İptal</button>
              <button type="submit" disabled={loading} className="flex justify-center items-center gap-2 py-2 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform disabled:opacity-50">{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
}

// Delete Modal
function DeleteTransactionModal({ transaction, onClose, onConfirm, loading }: { transaction: Transaction, onClose: () => void, onConfirm: () => void, loading: boolean }) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md text-center">
              <h2 className="text-xl font-bold text-white mb-2">İşlemi Sil</h2>
              <p className="text-zinc-400 mb-6">"<span className="font-bold text-white">{transaction.title}</span>" başlıklı işlemi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
              <div className="flex justify-center gap-4"><button type="button" onClick={onClose} className="py-2 px-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-bold text-zinc-200">İptal</button><button onClick={onConfirm} disabled={loading} className="py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">{loading ? 'Siliniyor...' : 'Evet, Sil'}</button></div>
          </motion.div>
      </motion.div>
    );
}

// Image Viewer Modal
function ImageViewerModal({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer">
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} transition={{ duration: 0.2, ease: "easeOut" }} src={imageUrl} alt="Görsel" className="max-w-full max-h-full object-contain rounded-lg cursor-default" onClick={(e) => e.stopPropagation()} />
            <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors"> <X size={24} /> </button>
        </motion.div>
    );
}