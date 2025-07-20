import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import UserManagementClient from '@/components/admin/UserManagementClient';

export default async function UserManagementPage() {
  const supabase = createClient();

  // --- Authentication & Role Check (This part is already correct) ---
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'LEVEL_3') {
    redirect('/dashboard');
  }

  // --- Data Fetching (This part is also correct) ---
  const { data: profiles } = await supabase.from('profiles').select('*, regions(name)');
  const { data: regions } = await supabase.from('regions').select('*');

  // --- FIX IS HERE: Pass "users" prop instead of "initialProfiles" ---
  return (
    <UserManagementClient
      users={profiles || []} 
      regions={regions || []}
    />
  );
}