// src/app/dashboard/admin/regions/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Map, PlusCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Tip tanımı
type Region = { id: string; name: string; };

export default function RegionManagementPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State'ler
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Veri Çekme ve Yetki Kontrolü
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'LEVEL_3') {
        router.push('/dashboard');
        return;
      }
      
      const { data: regionsData } = await supabase.from('regions').select('*').order('name', { ascending: true });
      setRegions(regionsData || []);
      setLoading(false);
    };
    checkAuthAndFetchData();
  }, [router, supabase]);

  // Bölge Oluşturma Fonksiyonu
  const handleCreateRegion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const regionName = formData.get('regionName') as string;
    if (!regionName) {
      setResult({ error: 'Bölge adı boş olamaz.' });
      setActionLoading(false);
      return;
    }

    const { error } = await supabase.from('regions').insert({ name: regionName }).select().single();
    
    if (error) {
      setResult({ error: `Bölge oluşturma hatası: ${error.message}` });
    } else {
      setResult({ success: 'Bölge başarıyla oluşturuldu.' });
      // Yeni veriyi çekmek yerine state'i anında güncelleyerek daha hızlı bir deneyim sunabiliriz.
      // Veya en basit haliyle sayfayı yenileriz. Şimdilik yenileme en kolayı.
      router.refresh();
      formRef.current?.reset();
    }
    setActionLoading(false);
  };
  
  // Bölge Silme Fonksiyonu
  const handleDelete = async (regionId: string) => {
    if (window.confirm('Bu bölgeyi silmek istediğinizden emin misiniz?')) {
        setActionLoading(true);
        setResult(null);
        const { error } = await supabase.from('regions').delete().eq('id', regionId);
        
        if (error) {
            setResult({ error: `Bölge silme hatası: ${error.message}` });
        } else {
            setResult({ success: 'Bölge başarıyla silindi.' });
            setRegions(regions.filter(r => r.id !== regionId)); // State'i anında güncelle
        }
        setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Bölge Yönetimi</h1>
        <p className="text-zinc-400">Yeni bölgeler oluşturun ve mevcut bölgeleri yönetin.</p>
      </header>

      {result?.success && <div className="mb-4 p-3 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg">{result.success}</div>}
      {result?.error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg">{result.error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Taraf: Yeni Bölge Ekleme */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle size={22} /> Yeni Bölge Ekle</h2>
            <form ref={formRef} onSubmit={handleCreateRegion} className="space-y-4">
              <div>
                <label htmlFor="regionName" className="block text-sm font-medium text-zinc-300 mb-1">Bölge Adı</label>
                <input type="text" id="regionName" name="regionName" required placeholder="örn: Ankara Bölgesi" className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"/>
              </div>
              <button type="submit" disabled={actionLoading} className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50">
                {actionLoading ? 'Oluşturuluyor...' : 'Bölgeyi Oluştur'}
              </button>
            </form>
          </div>
        </div>
        {/* Sağ Taraf: Mevcut Bölgeler */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Map size={22} /> Mevcut Bölgeler</h2>
            <div className="space-y-3">
              {regions.map((region) => (
                <motion.div key={region.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-lg">
                  <p className="font-semibold">{region.name}</p>
                  <button onClick={() => handleDelete(region.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </motion.div>
              ))}
              {regions.length === 0 && <p className="text-center text-zinc-500 py-4">Henüz hiç bölge oluşturulmamış.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}