// src/app/dashboard/transactions/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Edit, Trash2, ChevronDown, MessageSquare, Filter, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Veri tiplerini doğrudan bu dosyada tanımlıyoruz
type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'GİRDİ' | 'ÇIKTI';
  payment_method: string;
  transaction_date: string; // YYYY-MM-DD formatında string
  created_at: string;
  description: string | null;
  region_id?: string | null; // transactions tablosunda region_id varsa
  regions?: { name: string | null } | null; // regions(name) çekildiğinde gelecek obje
};

// Bölge tipi
type Region = {
  id: string;
  name: string;
};

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

  const [exporting, setExporting] = useState(false);

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterType, setFilterType] = useState<'GİRDİ' | 'ÇIKTI' | ''>('');
  const [regions, setRegions] = useState<Region[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const currentUserRole = profile?.role || 'LEVEL_1';
    setUserRole(currentUserRole);

    if (currentUserRole === 'LEVEL_3' && regions.length === 0) {
      const { data: regionsData, error: regionsError } = await supabase.from('regions').select('id, name').order('name');
      if (regionsError) {
        console.error('Bölgeler çekilirken hata oluştu:', regionsError);
      } else {
        setRegions(regionsData || []);
      }
    }

    let query = supabase.from('transactions')
      .select('*, regions(name)')
      .order('transaction_date', { ascending: false });

    if (currentUserRole === 'LEVEL_3') {
        if (filterDate) {
            query = query.eq('transaction_date', filterDate);
        }
        if (filterRegion) {
            query = query.eq('region_id', filterRegion);
        }
        if (filterType) {
            query = query.eq('type', filterType);
        }
    }

    const { data: transactionsData, error } = await query;

    if (error) {
      console.error('İşlemler çekilirken hata oluştu:', error);
      setResult({ error: 'İşlemler yüklenirken bir sorun oluştu.' });
    } else {
      setTransactions(transactionsData || []);
    }

    setLoading(false);
  }, [router, supabase, filterDate, filterRegion, filterType, regions.length]);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
        console.log('Realtime change received:', payload);
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchData, supabase]);

  const canModify = userRole === 'LEVEL_2' || userRole === 'LEVEL_3';
  const isRegionAndFilterVisible = userRole === 'LEVEL_3';

  const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('tr-TR');

  const clearFilters = () => {
    setFilterDate('');
    setFilterRegion('');
    setFilterType('');
    setResult(null);
  };

  const handleExportToExcel = async () => {
    setExporting(true);
    setResult(null);
    try {
      const dataToExport = transactions.map(tx => ({
        'ID': tx.id,
        'İşlem Tarihi': formatDate(tx.transaction_date),
        'Başlık': tx.title,
        'Miktar': tx.amount,
        'Tip': tx.type,
        'Ödeme Şekli': tx.payment_method.replace('_', ' '),
        'Açıklama': tx.description || '',
        'Bölge': tx.regions?.name || 'Bilinmiyor',
        'Kayıt Tarihi': formatDateTime(tx.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "İşlemler");
      
      const fileName = `islem_kayitlari_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      setResult({ success: 'İşlemler Excel\'e başarıyla aktarıldı.' });

    } catch (error: any) {
      console.error('Excel dışa aktarma hatası:', error);
      setResult({ error: 'Excel\'e aktarılırken bir hata oluştu: ' + (error.message || 'Bilinmeyen Hata') });
    } finally {
      setExporting(false);
    }
  };

  // Düzenleme fonksiyonu (artık içeride tanımlı)
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setActionLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);

    const updatedData = {
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as 'GİRDİ' | 'ÇIKTI',
      payment_method: formData.get('payment_method') as string,
      transaction_date: formData.get('transaction_date') as string,
      description: formData.get('description') as string || null,
    };

    const { error } = await supabase.from('transactions').update(updatedData).eq('id', editingTransaction.id);

    if (error) {
      setResult({ error: `Güncelleme hatası: ${error.message}` });
    } else {
      setResult({ success: 'İşlem başarıyla güncellendi.' });
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? { ...t, ...updatedData } : t));
      setEditingTransaction(null);
      fetchData();
    }
    setActionLoading(false);
  };

  // Silme onay fonksiyonu (artık içeride tanımlı)
  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    setActionLoading(true);
    setResult(null);

    const { error } = await supabase.from('transactions').delete().eq('id', deletingTransaction.id);

    if (error) {
      setResult({ error: `Silme hatası: ${error.message}` });
    } else {
      setResult({ success: 'İşlem başarıyla silindi.' });
      setTransactions(prev => prev.filter(t => t.id !== deletingTransaction.id));
      setDeletingTransaction(null);
      fetchData();
    }
    setActionLoading(false);
  };

  const baseColumnCount = 4;
  const dynamicColumnCount = 
    (isRegionAndFilterVisible ? 1 : 0) + 
    (canModify ? 1 : 0);
  const totalColumnCount = baseColumnCount + dynamicColumnCount;


  return (
    <>
      <div className="p-4 sm:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Tüm İşlemler</h1>
            <p className="text-zinc-400">Gerçekleşen tüm gelir ve gider kayıtları.</p>
          </div>
          <button
            onClick={handleExportToExcel}
            className="py-2 px-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200 disabled:opacity-50"
            disabled={exporting || transactions.length === 0}
          >
            {exporting ? 'Aktarılıyor...' : <><FileText size={18} /> Excel\'e Aktar</>}
          </button>
        </header>

        {result?.success && <div className="mb-4 p-3 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg">{result.success}</div>}
        {result?.error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg">{result.error}</div>}

        {isRegionAndFilterVisible && (
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-4 mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label htmlFor="filterDate" className="block text-sm font-medium text-zinc-300 mb-1">Tarihe Göre Filtrele</label>
              <input
                type="date"
                id="filterDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label htmlFor="filterRegion" className="block text-sm font-medium text-zinc-300 mb-1">Bölgeye Göre Filtrele</label>
              <select
                id="filterRegion"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Tüm Bölgeler</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label htmlFor="filterType" className="block text-sm font-medium text-zinc-300 mb-1">Tipe Göre Filtrele</label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'GİRDİ' | 'ÇIKTI' | '')}
                className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Tüm Tipler</option>
                <option value="GİRDİ">Gelir</option>
                <option value="ÇIKTI">Gider</option>
              </select>
            </div>

            <div className="flex gap-2 mt-4 sm:mt-0">
              <button
                onClick={fetchData}
                className="py-2 px-4 flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                disabled={loading}
              >
                <Filter size={18} /> Filtrele
              </button>
              {(filterDate || filterRegion || filterType) && (
                <button
                  onClick={clearFilters}
                  className="py-2 px-4 flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold rounded-lg transition-colors duration-200"
                >
                  <X size={18} /> Temizle
                </button>
              )}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-700">
                <tr>
                  <th className="p-4 w-12 text-zinc-400"></th>
                  <th className="p-4 text-sm font-semibold text-zinc-400">İşlem Tarihi</th>
                  <th className="p-4 text-sm font-semibold text-zinc-400">Başlık</th>
                  {isRegionAndFilterVisible && (
                    <th className="p-4 text-sm font-semibold text-zinc-400">Bölge</th>
                  )}
                  <th className="p-4 text-sm font-semibold text-zinc-400 text-center">Tip</th>
                  <th className="p-4 text-sm font-semibold text-zinc-400 text-right">Tutar</th>
                  {canModify && <th className="p-4 text-sm font-semibold text-zinc-400 text-center">Eylemler</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={totalColumnCount} className="text-center text-zinc-500 py-12">
                      {loading ? 'İşlemler yükleniyor...' : 'Görüntülenecek işlem bulunmuyor.'}
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <React.Fragment key={tx.id}>
                      <tr className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                        <td className="p-4 text-center"><ChevronDown size={18} className={`transition-transform ${expandedRow === tx.id ? 'rotate-180' : ''} text-zinc-400`} /></td>
                        <td className="p-4 text-zinc-200">{formatDate(tx.transaction_date)}</td>
                        <td className="p-4 font-medium text-white">{tx.title}</td>
                        {isRegionAndFilterVisible && (
                            <td className="p-4 text-zinc-400">
                                {tx.regions?.name || 'Bilinmiyor'}
                            </td>
                        )}
                        <td className="p-4 text-center"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${tx.type === 'GİRDİ' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{tx.type}</span></td>
                        <td className={`p-4 font-bold text-right ${tx.type === 'GİRDİ' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'GİRDİ' ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                        {canModify && (
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(tx); }} className="p-2 text-zinc-400 hover:text-white transition-colors"><Edit size={16} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setDeletingTransaction(tx); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      <AnimatePresence>
                        {expandedRow === tx.id && (
                          <motion.tr
                            key={`${tx.id}-details`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td colSpan={totalColumnCount} className="p-4 bg-zinc-800/50 text-zinc-300">
                              <div className="flex flex-col gap-2 text-sm">
                                <div className="flex gap-2 items-center"><MessageSquare size={14} className="text-zinc-500" /><strong>Açıklama:</strong> <span className="text-zinc-300">{tx.description || 'Açıklama girilmemiş.'}</span></div>
                                <div><strong>Ödeme Şekli:</strong> <span className="text-zinc-300">{tx.payment_method.replace('_', ' ')}</span></div>
                                <div><strong>Kayıt Tarihi:</strong> <span className="text-zinc-300">{formatDateTime(tx.created_at)} (Değiştirilemez)</span></div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                      <tr className="h-2"></tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingTransaction && <EditTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleUpdate} loading={actionLoading} />}
        {deletingTransaction && <DeleteTransactionModal transaction={deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={handleDeleteConfirm} loading={actionLoading} />}
      </AnimatePresence>
    </>
  );
}

// EditTransactionModal bileşeni
function EditTransactionModal({ transaction, onClose, onSave, loading }: { transaction: Transaction, onClose: () => void, onSave: (e: React.FormEvent<HTMLFormElement>) => void, loading: boolean }) {
  // Input varsayılan değerleri için state kullanabiliriz
  const [currentTitle, setCurrentTitle] = useState(transaction.title);
  const [currentAmount, setCurrentAmount] = useState(transaction.amount.toString());
  const [currentType, setCurrentType] = useState(transaction.type);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState(transaction.payment_method);
  const [currentTransactionDate, setCurrentTransactionDate] = useState(transaction.transaction_date);
  const [currentDescription, setCurrentDescription] = useState(transaction.description || '');

  // Eğer modal açıldığında işlem değişirse state'leri güncelle
  useEffect(() => {
    setCurrentTitle(transaction.title);
    setCurrentAmount(transaction.amount.toString());
    setCurrentType(transaction.type);
    setCurrentPaymentMethod(transaction.payment_method);
    setCurrentTransactionDate(transaction.transaction_date);
    setCurrentDescription(transaction.description || '');
  }, [transaction]);


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-white mb-4">İşlemi Düzenle</h2>
        <p className="text-zinc-400 mb-4">{transaction.title}</p>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">Başlık</label>
            <input
              type="text"
              name="title"
              id="title"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              required
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-zinc-300 mb-1">Miktar</label>
            <input
              type="number"
              name="amount"
              id="amount"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              step="0.01"
              required
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1">Tip</label>
            <select
              name="type"
              id="type"
              value={currentType}
              onChange={(e) => setCurrentType(e.target.value as 'GİRDİ' | 'ÇIKTI')}
              required
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="GİRDİ">Gelir</option>
              <option value="ÇIKTI">Gider</option>
            </select>
          </div>
          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-zinc-300 mb-1">Ödeme Şekli</label>
            <select
              name="payment_method"
              id="payment_method"
              value={currentPaymentMethod}
              onChange={(e) => setCurrentPaymentMethod(e.target.value)}
              required
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="E_FATURA">E-Fatura</option>
              <option value="NAKİT">Nakit</option>
              <option value="KREDI_KARTI">Kredi Kartı</option>
            </select>
          </div>
          <div>
            <label htmlFor="transaction_date" className="block text-sm font-medium text-zinc-300 mb-1">Tarih</label>
            <input
              type="date"
              name="transaction_date"
              id="transaction_date"
              value={currentTransactionDate}
              onChange={(e) => setCurrentTransactionDate(e.target.value)}
              required
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Açıklama (İsteğe Bağlı)</label>
            <textarea
              name="description"
              id="description"
              value={currentDescription}
              onChange={(e) => setCurrentDescription(e.target.value)}
              rows={3}
              className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose}
              className="py-2 px-4 font-bold text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-700/50 transition-colors duration-200">
              İptal
            </button>
            <button type="submit" disabled={loading}
              className="flex justify-center items-center gap-2 py-2 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// DeleteTransactionModal bileşeni
function DeleteTransactionModal({ transaction, onClose, onConfirm, loading }: { transaction: Transaction, onClose: () => void, onConfirm: () => void, loading: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md text-center">
        <h2 className="text-xl font-bold text-white mb-2">İşlemi Sil</h2>
        <p className="text-zinc-400 mb-6">"<span className="font-bold text-white">{transaction.title}</span>" başlıklı işlemi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        <div className="flex justify-center gap-4">
          <button type="button" onClick={onClose} className="py-2 px-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-bold text-zinc-200">İptal</button>
          <button onClick={onConfirm} disabled={loading} className="py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">{loading ? 'Siliniyor...' : 'Evet, Sil'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}