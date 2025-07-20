// src/components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Map, PlusCircle, ListChecks } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

type Profile = {
  full_name: string;
  role: string;
} | null;

export default function Sidebar({ userProfile }: { userProfile: Profile }) {
  const pathname = usePathname();

  const mainLinks = [
    { href: '/dashboard', label: 'Ana Panel', icon: LayoutDashboard },
  ];

  const transactionLinks = [
    { href: '/dashboard/transactions/add', label: 'Yeni İşlem Ekle', icon: PlusCircle },
    { href: '/dashboard/transactions', label: 'Tüm İşlemler', icon: ListChecks },
  ];

  const adminLinks = [
    { href: '/dashboard/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
    { href: '/dashboard/admin/regions', label: 'Bölge Yönetimi', icon: Map },
  ];

  return (
    <aside className="w-64 flex-col p-6 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800 hidden md:flex">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white">AYKA KASA</h2>
        <p className="text-zinc-400 text-sm">Yönetim Paneli</p>
      </div>
      <nav className="flex-grow">
        <ul>
          <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Panel</li>
          {mainLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href} className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${pathname === link.href ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                <link.icon size={20} />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}

          <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Kasa İşlemleri</li>
          {transactionLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href} className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${pathname.startsWith(link.href) ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                <link.icon size={20} />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
          
          {userProfile?.role === 'LEVEL_3' && (
            <>
              <li className="mt-6 mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase">Yönetim</li>
              {adminLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${pathname.startsWith(link.href) ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <link.icon size={20} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>
      <div className="mt-auto">
        <div className="p-4 mb-4 text-center bg-zinc-800/50 rounded-lg">
            <p className="font-bold text-white">{userProfile?.full_name}</p>
            <p className="text-sm text-cyan-400">{userProfile?.role}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}