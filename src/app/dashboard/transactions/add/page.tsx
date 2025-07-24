// src/app/dashboard/add/page.tsx (veya ilgili dosya adı)
'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ImagePlus } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function AddTransactionPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [transactionType, setTransactionType] = useState<'GİRDİ' | 'ÇIKTI' | ''>('');
  const [userProfile, setUserProfile] = useState<{ role: string, region_id: string } | null>(null);
  const [regions, setRegions] = useState<{ id: string, name: string }[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setImagePreview(null);
      setCompressedImageFile(null);
      return;
    }

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    try {
      setResult({ success: 'Görsel optimize ediliyor...' });
      const compressedFile = await imageCompression(file, options);
      setImagePreview(URL.createObjectURL(compressedFile));
      setCompressedImageFile(compressedFile);
      setResult(null);
    } catch (error) {
      setResult({ error: 'Görsel optimize edilemedi.' });
      setImagePreview(null);
      setCompressedImageFile(null);
    }
  };

const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !userProfile) {
      setResult({ error: 'Kullanıcı bilgileri bulunamadı.' });
      setLoading(false);
      return;
    }

    let image_path = null;
    if (compressedImageFile) {
      const fileName = `${user.id}/${Date.now()}_${compressedImageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('islem-gorselleri')
        .upload(fileName, compressedImageFile);

      if (uploadError) {
        setResult({ error: `Görsel yüklenemedi: ${uploadError.message}` });
        setLoading(false);
        return;
      }
      image_path = uploadData.path;
    }
    
    const type = formData.get('type') as 'GİRDİ' | 'ÇIKTI';
    const canChangeRegion = userProfile.role === 'LEVEL_2' || userProfile.role === 'LEVEL_3';
    const transactionRegionId = userProfile.region_id;

    let rawFormData: any = {
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: type,
      transaction_date: formData.get('transaction_date') as string,
      description: formData.get('description') as string,
      user_id: user.id,
      region_id: transactionRegionId,
      image_path: image_path,
      expense_region_info: null, 
    };

    if (type === 'GİRDİ') {
      rawFormData.payment_method = 'NAKİT';
    } else { // type === 'ÇIKTI'
      rawFormData.payment_method = formData.get('payment_method') as string;
      rawFormData.fatura_tipi = formData.get('fatura_tipi') as string;

      if (canChangeRegion) {
        const selectedRegionId = formData.get('expense_region_id') as string;
        const selectedRegion = regions.find(r => r.id === selectedRegionId);
        if (selectedRegion) {
          rawFormData.expense_region_info = selectedRegion.name;
        }
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

  if (loading && !result) {
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
              
              <label htmlFor="amount" className="block text-sm font-medium text-zinc-300 mb-1">Tutar (₺) </label>
              
              <input type="number" id="amount" name="amount" required placeholder="örn: 12000.50 | (on iki bin, elli kuruşu temsil etmektedir.)" step="0.01" className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
             
             {/* BURASI SİLİNECEK */}
              <label htmlFor="amount" className="block text-sm font-medium text-green-500 mb-1"> (kuruşlar . [nokta] ile ayrılmalıdır!)</label>
              <label htmlFor="amount" className="block text-sm font-medium text-red-500 mb-1"> (Örn : yüz bin 100000 gösterimi . ile ayrılmamalıdır!)</label>
               {/* BURASI SİLİNECEK */}

            </div>

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
                  {/* GÜNCELLENDİ: "Fatura" seçeneği eklendi */}
                  <select id="fatura_tipi" name="fatura_tipi" required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                      <option value="YOK">Yok</option>
                      <option value="FATURA">Fatura</option>
                      <option value="E_FATURA">E-Fatura</option>
                      <option value="KASA_FISI">Kasa Fişi</option>
                  </select>
                </div>
              </>
            )}

            {/* GÜNCELLENDİ: Yetkili alanı boşlukları azaltıldı (p-3 ve space-y-2) */}
            {canChangeRegion && transactionType === 'ÇIKTI' && (
              <div className="space-y-2 p-3 border border-zinc-700/50 rounded-lg bg-zinc-900/30">
                <h3 className="text-md font-semibold text-cyan-400">Yetkili Harcaması Bilgisi</h3>
                <div>
                  <label htmlFor="expense_region_id" className="block text-sm font-medium text-zinc-300 mb-1">Harcama hangi bölge için yapıldı?</label>
                  <select id="expense_region_id" name="expense_region_id" defaultValue={userProfile?.region_id} required className="w-full pl-3 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500">
                    {regions.map(region => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}  

            <div>
              <label htmlFor="transaction_date" className="block text-sm font-medium text-zinc-300 mb-1">İşlem Tarihi</label>
              <input type="date" id="transaction_date" name="transaction_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">Açıklama (Opsiyonel)</label>
              <textarea id="description" name="description" placeholder="İşlemle ilgili ek notlar..." rows={3} className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Görsel Ekle (Fiş, Fatura vb.)</label>
              <div className="mt-2 flex items-center gap-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Önizleme" className="h-20 w-20 rounded-lg object-cover" />
                ) : (
                  <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-zinc-800/50 border-2 border-dashed border-zinc-700">
                    <ImagePlus size={24} className="text-zinc-500" />
                  </div>
                )}
                <input 
                  type="file" 
                  id="image" 
                  name="image" 
                  accept="image/png, image/jpeg"  
                  onChange={handleImageChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600"
                />
              </div>
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