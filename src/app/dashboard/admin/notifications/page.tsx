'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BellPlus, BellOff, CheckCircle, Circle, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Tipler
type Notification = {
  id: string;
  message: string;
  created_at: string;
  is_active: boolean;
  // profiles ilişkisi artık manuel eklenecek
  profiles: { full_name: string | null } | null;
};

type UserProfile = {
    id: string;
    full_name: string;
};

type UserStatus = {
    user_id: string;
    full_name: string;
    dismissed_at?: string;
};

// Ana Component
export default function NotificationsAdminPage() {
  const supabase = createClient();
  const [message, setMessage] = useState('');
  const [activeNotifications, setActiveNotifications] = useState<Notification[]>([]);
  const [pastNotifications, setPastNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  const [viewingDetailsOf, setViewingDetailsOf] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<{ dismissed: UserStatus[], notDismissed: UserStatus[] } | null>(null);

  // DÜZELTME: Bu fonksiyon verileri ayrı ayrı çekip birleştirecek şekilde yeniden yazıldı.
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    
    // 1. Önce tüm profilleri çekelim ve bir harita oluşturalım
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name');
    
    if (profilesError) {
      console.error("Profiller çekilirken hata:", profilesError);
      setResult({ error: 'Kullanıcı verileri çekilirken bir hata oluştu.' });
      setLoading(false);
      return;
    }
    const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

    // 2. Bildirimleri SADECE kendi tablosundan çekelim (JOIN olmadan)
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (notificationsError) {
      console.error("Bildirimler çekilirken hata:", notificationsError);
      setResult({ error: 'Bildirimler listelenirken bir hata oluştu.' });
      setLoading(false);
      return;
    }

    // 3. Çektiğimiz bildirimlere, oluşturduğumuz haritadan kullanıcı adlarını ekleyelim
    const enrichedNotifications = (notificationsData || []).map(notif => ({
      ...notif,
      profiles: {
        full_name: profilesMap.get(notif.created_by) || 'Bilinmeyen Kullanıcı'
      }
    }));

    // 4. Aktif ve geçmiş olarak ayıralım
    setActiveNotifications(enrichedNotifications.filter(n => n.is_active));
    setPastNotifications(enrichedNotifications.filter(n => !n.is_active).slice(0, 20));

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!message.trim() || !user) {
      setResult({ error: 'Mesaj boş olamaz.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('notifications').insert({ message, created_by: user.id });

    if (error) {
      setResult({ error: 'Bildirim gönderilemedi: ' + error.message });
    } else {
      setResult({ success: 'Bildirim başarıyla tüm kullanıcılara gönderildi!' });
      setMessage('');
      fetchNotifications();
    }
    setLoading(false);
  };

  const handleDeactivate = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from('notifications').update({ is_active: false }).eq('id', id);

    if (error) {
      setResult({ error: 'Bildirim devre dışı bırakılamadı.' });
    } else {
      setResult({ success: 'Bildirim devre dışı bırakıldı.' });
      fetchNotifications();
    }
    setLoading(false);
  };

  const handleViewDetails = async (notificationId: string) => {
    if (viewingDetailsOf === notificationId) {
      setViewingDetailsOf(null);
      return;
    }

    setViewingDetailsOf(notificationId);
    setDetailsLoading(true);
    setNotificationDetails(null);

    const { data: allUsers, error: usersError } = await supabase.from('profiles').select('id, full_name');
    const { data: dismissedStatus, error: statusError } = await supabase
      .from('user_notification_status')
      .select('user_id, dismissed_at')
      .eq('notification_id', notificationId)
      .eq('is_dismissed', true);

    if (usersError || statusError || !allUsers) {
      setResult({ error: 'Detaylar çekilirken bir hata oluştu.' });
      setDetailsLoading(false);
      return;
    }

    const dismissedUserIds = new Map((dismissedStatus || []).map(s => [s.user_id, s.dismissed_at]));
    const dismissed: UserStatus[] = [];
    const notDismissed: UserStatus[] = [];

    allUsers.forEach(user => {
      if (dismissedUserIds.has(user.id)) {
        dismissed.push({ 
          user_id: user.id, 
          full_name: user.full_name, 
          dismissed_at: dismissedUserIds.get(user.id) 
        });
      } else {
        notDismissed.push({ 
          user_id: user.id, 
          full_name: user.full_name 
        });
      }
    });

    setNotificationDetails({ dismissed, notDismissed });
    setDetailsLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">Bildirim Yönetimi</h1>
      
      <div className="bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 mb-8">
        <h2 className="text-xl font-semibold mb-4">Yeni Bildirim Gönder</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tüm kullanıcılara gönderilecek mesajınızı buraya yazın..." rows={4} className="w-full p-3 bg-zinc-800/50 border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" required />
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors disabled:opacity-50">
            <BellPlus size={18} />
            {loading ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
        {result?.success && <p className="mt-4 text-green-400">{result.success}</p>}
        {result?.error && <p className="mt-4 text-red-400">{result.error}</p>}
      </div>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Aktif Bildirimler</h2>
          <div className="space-y-3">
            {loading ? <p className="text-zinc-500">Yükleniyor...</p> : activeNotifications.length > 0 ? activeNotifications.map(notif => (
              <NotificationItem key={notif.id} notif={notif} onDeactivate={handleDeactivate} onViewDetails={handleViewDetails} viewingDetailsOf={viewingDetailsOf} details={notificationDetails} detailsLoading={detailsLoading}/>
            )) : <p className="text-zinc-500">Şu anda aktif bildirim bulunmuyor.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 border-t border-zinc-800 pt-8">Geçmiş Bildirimler</h2>
          <div className="space-y-3">
            {loading ? <p className="text-zinc-500">Yükleniyor...</p> : pastNotifications.length > 0 ? pastNotifications.map(notif => (
              <NotificationItem key={notif.id} notif={notif} onDeactivate={handleDeactivate} onViewDetails={handleViewDetails} viewingDetailsOf={viewingDetailsOf} details={notificationDetails} detailsLoading={detailsLoading}/>
            )) : <p className="text-zinc-500">Geçmiş bildirim bulunmuyor.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationItem({ notif, onDeactivate, onViewDetails, viewingDetailsOf, details, detailsLoading }: {
  notif: Notification;
  onDeactivate: (id: string) => void;
  onViewDetails: (id: string) => void;
  viewingDetailsOf: string | null;
  details: { dismissed: UserStatus[], notDismissed: UserStatus[] } | null;
  detailsLoading: boolean;
}) {
  const isViewing = viewingDetailsOf === notif.id;

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 transition-all">
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => onViewDetails(notif.id)}>
        <div>
          <p className="text-zinc-100">{notif.message}</p>
          <p className="text-xs text-zinc-400 mt-1">Gönderen: {notif.profiles?.full_name || 'Bilinmiyor'} - {new Date(notif.created_at).toLocaleDateString('tr-TR')}</p>
        </div>
        <div className='flex items-center gap-2'>
            {notif.is_active && (
              <button onClick={(e) => { e.stopPropagation(); onDeactivate(notif.id); }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition-colors" title="Devre Dışı Bırak">
                <BellOff size={18} />
              </button>
            )}
            <ChevronDown size={20} className={`text-zinc-400 transition-transform ${isViewing ? 'rotate-180' : ''}`}/>
        </div>
      </div>

      <AnimatePresence>
        {isViewing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-zinc-700 p-4">
              {detailsLoading && <div className='flex items-center justify-center gap-2 text-zinc-400'><Loader2 className="animate-spin" size={16}/> Detaylar Yükleniyor...</div>}
              {details && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 text-sm'>
                  <div>
                    <h4 className='font-semibold text-green-400 mb-2 flex items-center gap-2'><CheckCircle size={16}/> Bu Bildirimi Kapatanlar ({details.dismissed.length})</h4>
                    <ul className='space-y-1 max-h-48 overflow-y-auto pr-2'>
                      {details.dismissed.length > 0 ? details.dismissed.map(user => (
                        <li key={user.user_id} className='flex justify-between text-zinc-300'>
                          <span>{user.full_name}</span>
                          <span className='text-xs text-zinc-500'>{new Date(user.dismissed_at!).toLocaleString('tr-TR')}</span>
                        </li>
                      )) : <li className='text-zinc-500'>-</li>}
                    </ul>
                  </div>
                   <div>
                    <h4 className='font-semibold text-zinc-400 mb-2 flex items-center gap-2'><Circle size={16}/> Henüz Kapatmayanlar ({details.notDismissed.length})</h4>
                     <ul className='space-y-1 max-h-48 overflow-y-auto pr-2'>
                      {details.notDismissed.length > 0 ? details.notDismissed.map(user => (
                        <li key={user.user_id} className='text-zinc-300'>{user.full_name}</li>
                      )) : <li className='text-zinc-500'>-</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}