'use client'

import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, Map, PlusCircle, ListChecks, KeyRound, Menu, X, Info, Bell } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { motion, AnimatePresence } from 'framer-motion';

type Profile = {
  full_name: string;
  role: string;
} | null;

interface NavProps {
  userProfile: Profile;
  onLinkClick?: () => void;
}

// Portal Kullanan Bildirim Bileşeni (Değişiklik yok)
function NotificationBanner({ message, onClose }: { message: string, onClose: () => void }) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  const bannerContent = (
    <motion.div
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      initial={{ y: "-150%", opacity: 0 }}
      animate={{ y: "0%", opacity: 1 }}
      exit={{ y: "-150%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ pointerEvents: 'none' }}
    >
      <div 
        className="flex items-start gap-4 w-full p-4 bg-zinc-900/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-lg"
        style={{ maxWidth: '800px', pointerEvents: 'auto' }}
      >
        <Info className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-white flex-grow whitespace-pre-line">{message}</p>
        <button 
          onClick={onClose} 
          className="p-1 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
          aria-label="Bildirimi kapat"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );

  if (isBrowser) {
    return ReactDOM.createPortal(bannerContent, document.body);
  } else {
    return null;
  }
}

// DEĞİŞİKLİK: NavContent artık dinamik bildirimleri çekiyor ve yönetiyor
const NavContent = ({ userProfile, onLinkClick }: NavProps) => {
  const pathname = usePathname();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchActiveNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: activeNotifs, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_active', true);

    const { data: dismissedNotifs, error: dismissedError } = await supabase
      .from('user_notification_status')
      .select('notification_id')
      .eq('user_id', user.id)
      .eq('is_dismissed', true);

    if (notifError || dismissedError) {
      console.error("Bildirimler çekilirken hata oluştu.", notifError || dismissedError);
      return;
    }

    const dismissedIds = new Set((dismissedNotifs || []).map(d => d.notification_id));
    const notificationsToShow = (activeNotifs || []).filter(n => !dismissedIds.has(n.id));
    
    setNotifications(notificationsToShow);
  }, [supabase]);

  useEffect(() => {
    fetchActiveNotifications();
  }, [fetchActiveNotifications]);

  const handleDismissNotification = async (notificationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_notification_status')
      .upsert({
        user_id: user.id,
        notification_id: notificationId,
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      });
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const mainLinks = [ { href: '/dashboard', label: 'Ana Panel', icon: LayoutDashboard } ];
  const transactionLinks = [
    { href: '/dashboard/transactions/add', label: 'Yeni İşlem Ekle', icon: PlusCircle },
    { href: '/dashboard/transactions', label: 'Tüm İşlemler', icon: ListChecks },
  ];
  const adminLinks = [
    { href: '/dashboard/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
    { href: '/dashboard/admin/regions', label: 'Bölge Yönetimi', icon: Map },
    { href: '/dashboard/admin/notifications', label: 'Bildirim Gönder', icon: Bell },
  ];

  const NavLink = ({ href, label, icon: Icon }: { href: string, label: string, icon: React.ElementType }) => (
    <li>
      <Link href={href} onClick={onLinkClick} className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
        <Icon size={20} />
        <span>{label}</span>
      </Link>
    </li>
  );

  return (
    <>
      <AnimatePresence>
        {notifications.map(notif => (
          <NotificationBanner
            key={notif.id}
            message={notif.message}
            onClose={() => handleDismissNotification(notif.id)}
          />
        ))}
      </AnimatePresence>
      
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">AYKA KASA</h2>
          <p className="text-zinc-100 text-sm">Yönetim Paneli</p>
          <p className="text-zinc-400 text-sm">V2.1.0</p>
        </div>
      </div>
      <nav>
        <ul>
          <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Panel</li>
          {mainLinks.map(link => <NavLink key={link.href} {...link} />)}

          <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Kasa İşlemleri</li>
          {transactionLinks.map(link => <NavLink key={link.href} {...link} />)}
          
          {userProfile?.role === 'LEVEL_3' && (
            <>
              <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Yönetim</li>
              {adminLinks.map(link => <NavLink key={link.href} {...link} />)}
            </>
          )}
        </ul>
      </nav>

      <div className="mt-6 border-t border-zinc-800 pt-6">
        <div className="p-4 mb-4 text-center bg-zinc-800/50 rounded-lg">
            <p className="font-bold text-white">{userProfile?.full_name}</p>
            <p className="text-sm text-cyan-400">{userProfile?.role}</p>
        </div>
        <Link
          href="/reset-password"
          onClick={onLinkClick}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 mb-2 rounded-lg transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <KeyRound size={20} />
          <span>Şifre Değiştir</span>
        </Link>
        <LogoutButton />
      </div>
    </>
  );
};

// Masaüstü Sidebar'ı
export default function Sidebar({ userProfile }: { userProfile: Profile }) {
  return (
    <aside className="w-64 flex-col p-6 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800 hidden md:flex">
      <NavContent userProfile={userProfile} />
    </aside>
  );
}

// Mobil Navigasyon
export function MobileNav({ userProfile }: { userProfile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-black border-b border-zinc-800">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-xl font-bold text-white">AYKA KASA</h2>
        <button onClick={toggleMenu} className="p-2 text-white">
          <Menu size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleMenu} className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed top-0 left-0 bottom-0 w-full max-w-xs bg-black border-r border-zinc-800 p-6 flex flex-col z-50">
              <button onClick={toggleMenu} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><X size={24} /></button>
              <NavContent userProfile={userProfile} onLinkClick={toggleMenu} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}