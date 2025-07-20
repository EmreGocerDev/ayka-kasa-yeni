// src/app/dashboard/transactions/add/page.tsx
'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AddTransactionPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setResult({ error: 'Giriş yapmalısınız.' });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('region_id').eq('id', user.id).single();

    if (!profile?.region_id) {
      setResult({ error: 'İşlem eklemek için bir bölgeye atanmış olmalısınız.' });
      setLoading(false);
      return;
    }

    const rawFormData = {
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as 'GİRDİ' | 'ÇIKTI',
      payment_method: formData.get('payment_method') as string,
      transaction_date: formData.get('transaction_date') as string,
      description: formData.get('description') as string,
      user_id: user.id,
      region_id: profile.region_id,
    };

    const { error } = await supabase.from('transactions').insert(rawFormData);

    if (error) {
      setResult({ error: `İşlem kaydedilemedi: ${error.message}` });
    } else {
      // Başarılı olduğunda formu temizle ve kullanıcıyı işlem listesine yönlendir.
      formRef.current?.reset();
      setResult({ success: 'İşlem başarıyla kaydedildi! Yönlendiriliyorsunuz...' });
      router.push('/dashboard/transactions');
    }
    setLoading(false);
  };

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
                        <input type="radio" name="type" value="GİRDİ" required className="sr-only" />
                        <span className="font-semibold text-green-400">Gelir (Girdi)</span>
                    </label>
                    <label className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg border-2 border-zinc-700 cursor-pointer has-[:checked]:border-red-500 has-[:checked]:bg-red-500/20 transition-all">
                        <input type="radio" name="type" value="ÇIKTI" required className="sr-only"/>
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
            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-zinc-300 mb-1">Ödeme Şekli</label>
              <select id="payment_method" name="payment_method" required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                <option value="">Seçiniz...</option>
                <option value="NAKİT">Nakit</option>
                <option value="KREDI_KARTI">Kredi Kartı</option>
                <option value="E_FATURA">E-Fatura</option>
              </select>
            </div>
            <div>
              <label htmlFor="transaction_date" className="block text-sm font-medium text-zinc-300 mb-1">İşlem Tarihi</label>
              <input type="date" id="transaction_date" name="transaction_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Açıklama (Opsiyonel)</label>
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