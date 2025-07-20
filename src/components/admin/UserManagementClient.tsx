'use client';

import { useState, useTransition } from 'react';
import { updateUserAction, deleteUserAction } from '@/app/actions/userActions';
import { Trash2, Edit } from 'lucide-react'; // İkonlar import edildi
import { motion, AnimatePresence } from 'framer-motion'; // Framer Motion import edildi

// ... (Tipler aynı kalıyor) ...
type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  region_id?: string | null;
  user_data?: { email: string | null } | null;
  regions?: { name: string | null } | null;
};

type Region = {
  id: string;
  name: string;
};

type UserManagementClientProps = {
  users: User[];
  regions: Region[];
};


export default function UserManagementClient({ users, regions }: UserManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null); // Silme için yeni state
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null); // Sonuç mesajı için

  const handleUpdateFormSubmit = (formData: FormData) => {
    if (!editingUser) return;
    startTransition(async () => {
      setResult(null); // Önceki mesajı temizle
      const resultAction = await updateUserAction(editingUser.id, formData);
      if (resultAction && resultAction.success) {
        setEditingUser(null);
        setResult({ success: resultAction.message });
      } else {
        setResult({ error: resultAction?.message || 'Bir hata oluştu.' });
      }
    });
  };

  const handleDeleteConfirm = () => { // Silme onayı için ayrı fonksiyon
    if (!deletingUser) return;
    startTransition(async () => {
      setResult(null); // Önceki mesajı temizle
      const resultAction = await deleteUserAction(deletingUser.id);
      if (resultAction && resultAction.success) {
        setDeletingUser(null);
        setResult({ success: resultAction.message });
      } else {
        setResult({ error: resultAction?.message || 'Bir hata oluştu.' });
      }
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Kullanıcı Yönetimi</h1>

      {result?.success && <div className="mb-4 p-3 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg">{result.success}</div>}
      {result?.error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg">{result.error}</div>}

      <div className="bg-[#1F2937] border border-gray-700/50 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Mevcut Kullanıcılar</h2>

        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 py-3 px-4 text-sm font-semibold text-gray-300 bg-gray-800/50 rounded-md mb-2">
          <div>Ad Soyad</div>
          <div>E-posta</div>
          <div>Rol</div>
          <div>Bölge</div>
          <div className="text-right">İşlemler</div>
        </div>

        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-center text-zinc-500 py-4">Henüz hiç kullanıcı bulunmamaktadır.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 items-center p-4
                           bg-zinc-900/60 backdrop-blur-xl rounded-lg border border-zinc-800 hover:bg-zinc-800/60 transition-colors duration-150"
              >
                <div className="font-semibold text-gray-100 md:text-left text-center w-full md:w-auto">
                    <span className="md:hidden text-zinc-500 text-xs mr-2">Ad Soyad:</span>
                    {user.full_name}
                </div>
                <div className="text-sm text-gray-400 md:text-left text-center w-full md:w-auto">
                    <span className="md:hidden text-zinc-500 text-xs mr-2">E-posta:</span>
                    {user.user_data?.email ?? 'N/A'}
                </div>
                <div className="text-sm text-gray-300 md:text-left text-center w-full md:w-auto">
                    <span className="md:hidden text-zinc-500 text-xs mr-2">Rol:</span>
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'LEVEL_3' ? 'bg-cyan-900/70 text-cyan-200' : 'bg-gray-600 text-gray-200'}`}>{user.role}</span>
                </div>
                <div className="text-sm text-gray-400 md:text-left text-center w-full md:w-auto">
                    <span className="md:hidden text-zinc-500 text-xs mr-2">Bölge:</span>
                    {user.regions?.name ?? 'Belirtilmemiş'}
                </div>
                <div className="flex justify-center md:justify-end space-x-4 w-full md:w-auto">
                  <button onClick={() => setEditingUser(user)} className="text-cyan-400 hover:text-cyan-300 transition-colors" disabled={isPending}>
                    <Edit size={18} />
                  </button>
                  <button onClick={() => setDeletingUser(user)} className="text-red-500 hover:text-red-400 transition-colors" disabled={isPending}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" // p-4 kaldırıldı
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-white mb-4">Kullanıcıyı Düzenle</h2>
              <p className="text-zinc-400 mb-4">{editingUser.full_name}</p>

              <form action={handleUpdateFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300 mb-1">Tam Ad</label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    defaultValue={editingUser.full_name}
                    required
                    className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-zinc-300 mb-1">Rol</label>
                  <select
                    name="role"
                    id="role"
                    defaultValue={editingUser.role}
                    required
                    className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="LEVEL_1">Kullanıcı</option>
                    <option value="LEVEL_2">Editör</option>
                    <option value="LEVEL_3">Yönetici</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-zinc-300 mb-1">Bölge</label>
                  <select
                    name="region"
                    id="region"
                    defaultValue={editingUser.region_id ?? ''}
                    className="w-full pl-4 pr-4 py-2 bg-zinc-800/50 text-white border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Bölge Yok</option>
                    {regions.map(region => (<option key={region.id} value={region.id}>{region.name}</option>))}
                  </select>
                </div>
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="py-2 px-4 font-bold text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-700/50 transition-colors duration-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex justify-center items-center gap-2 py-2 px-4 font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    {isPending ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" // p-4 kaldırıldı
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md text-center"
            >
              <h2 className="text-xl font-bold text-white mb-2">Kullanıcıyı Sil</h2>
              <p className="text-zinc-400 mb-6">"<span className="font-bold text-white">{deletingUser.full_name}</span>" kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
              <div className="flex justify-center gap-4">
                <button type="button" onClick={() => setDeletingUser(null)} className="py-2 px-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-bold text-zinc-200">İptal</button>
                <button onClick={handleDeleteConfirm} disabled={isPending} className="py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">{isPending ? 'Siliniyor...' : 'Evet, Sil'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}