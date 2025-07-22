'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AddTransactionPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [transactionType, setTransactionType] = useState<'GİRDİ' | 'ÇIKTI' | ''>('');
  const [userProfile, setUserProfile] = useState<{ role: string, region_id: string } | null>(null);
  const [regions, setRegions] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, region_id')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setUserProfile(profileData);
          if (profileData.role === 'LEVEL_2' || profileData.role === 'LEVEL_3') {
            const { data: regionsData } = await supabase.from('regions').select('id, name').order('name');
            setRegions(regionsData || []);
          }
        }
      }
      setLoading(false);
    };

    fetchInitialData();
  }, [supabase]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !userProfile) {
      setResult({ error: 'Kullanıcı bilgileri bulunamadı, lütfen yeniden giriş yapın.' });
      setLoading(false);
      return;
    }
    
    const type = formData.get('type') as 'GİRDİ' | 'ÇIKTI';
    const canChangeRegion = userProfile.role === 'LEVEL_2' || userProfile.role === 'LEVEL_3';

    const transactionRegionId = (canChangeRegion && type === 'ÇIKTI')
      ? formData.get('expense_region_id') as string
      : userProfile.region_id;

    if (!transactionRegionId) {
        setResult({ error: 'İşlem için bir bölge belirlenmelidir.' });
        setLoading(false);
        return;
    }

    let rawFormData: any = {
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: type,
      transaction_date: formData.get('transaction_date') as string,
      description: formData.get('description') as string,
      user_id: user.id,
      region_id: transactionRegionId,
    };

    // Tipe göre farklı alanları ekleyelim
    if (type === 'GİRDİ') {
      rawFormData.payment_method = 'NAKİT'; // Gelir için varsayılan
    } else { // type === 'ÇIKTI'
      rawFormData.payment_method = formData.get('payment_method') as string;
      rawFormData.fatura_tipi = formData.get('fatura_tipi') as string;
      // Eğer yetkili kullanıcıysa ve Giderse, ek bilgi notunu da ekle
      if (canChangeRegion) {
        rawFormData.expense_region_info = formData.get('expense_region_info') as string;
      }
    }

    const { error } = await supabase.from('transactions').insert(rawFormData);

    if (error) {
      setResult({ error: `İşlem kaydedilemedi: ${error.message}` });
    } else {
      formRef.current?.reset();
      setResult({ success: 'İşlem başarıyla kaydedildi! Yönlendiriliyorsunuz...' });
      setTimeout(() => {
        router.push('/dashboard/transactions');
        router.refresh();
      }, 1500);
    }
    setLoading(false);
  };

  const canChangeRegion = userProfile && (userProfile.role === 'LEVEL_2' || userProfile.role === 'LEVEL_3');

  if (loading) {
    return (
        <div className="flex items-center justify-center w-full h-full p-8">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Yeni İşlem Ekle</h1>
        <p className="text-zinc-400">Yeni bir gelir veya gider kaydı oluşturun.</p>
      </header>

      <div className="max-w-2xl">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
          <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">İşlem Tipi</label>
              <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg border-2 border-zinc-700 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-500/20 transition-all">
                      <input type="radio" name="type" value="GİRDİ" required className="sr-only" onChange={(e) => setTransactionType(e.target.value as 'GİRDİ')} />
                      <span className="font-semibold text-green-400">Gelir (Girdi)</span>
                  </label>
                  <label className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg border-2 border-zinc-700 cursor-pointer has-[:checked]:border-red-500 has-[:checked]:bg-red-500/20 transition-all">
                      <input type="radio" name="type" value="ÇIKTI" required className="sr-only" onChange={(e) => setTransactionType(e.target.value as 'ÇIKTI')} />
                      <span className="font-semibold text-red-400">Gider (Çıktı)</span>
                  </label>
              </div>
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1">Başlık</label>
              <input type="text" id="title" name="title" required placeholder="örn: Ofis Kira Ödemesi" className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-zinc-300 mb-1">Tutar (₺)</label>
              <input type="number" id="amount" name="amount" required placeholder="örn: 550.75" step="0.01" className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>

            {/* Sadece Gider seçiliyse gösterilecek alanlar */}
            {transactionType === 'ÇIKTI' && (
              <>
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-zinc-300 mb-1">Ödeme Şekli</label>
                  <select id="payment_method" name="payment_method" required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="">Seçiniz...</option>
                    <option value="NAKİT">Nakit</option>
                    <option value="KREDI_KARTI">Kredi Kartı</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fatura_tipi" className="block text-sm font-medium text-zinc-300 mb-1">Fatura Tipi</label>
                  <select id="fatura_tipi" name="fatura_tipi" required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                      <option value="YOK">Yok</option>
                      <option value="E_FATURA">E-Fatura</option>
                      <option value="KASA_FISI">Kasa Fişi</option>
                  </select>
                </div>
              </>
            )}

            {/* Sadece yetkili kullanıcı Gider seçerse gösterilecek alanlar */}
            {canChangeRegion && transactionType === 'ÇIKTI' && (
              <div className="space-y-4 p-4 border border-zinc-700 rounded-lg">
                <div>
                  <label htmlFor="expense_region_id" className="block text-sm font-medium text-zinc-300 mb-1">Harcama Yapılan Bölge</label>
                  <select id="expense_region_id" name="expense_region_id" defaultValue={userProfile?.region_id} required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                    {regions.map(region => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </div>
                {/* YENİ BİLGİ ALANI */}
                <div>
                  <label htmlFor="expense_region_info" className="block text-sm font-medium text-zinc-300 mb-1">Harcama Bilgisi (Opsiyonel)</label>
                  <textarea id="expense_region_info" name="expense_region_info" placeholder="Bu harcamanın neden bu bölgeye yapıldığına dair not..." rows={2} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"></textarea>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="transaction_date" className="block text-sm font-medium text-zinc-300 mb-1">İşlem Tarihi</label>
              <input type="date" id="transaction_date" name="transaction_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Genel Açıklama (Opsiyonel)</label>
              <textarea id="description" name="description" placeholder="İşlemle ilgili ek notlar..." rows={3} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"></textarea>
            </div>

            {result?.success && <p className="text-sm text-green-400">{result.success}</p>}
            {result?.error && <p className="text-sm text-red-500">{result.error}</p>}
            
            <button type="submit" disabled={loading} className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}