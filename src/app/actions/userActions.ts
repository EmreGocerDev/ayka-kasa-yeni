"use server";

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Bu fonksiyon, işlemi yapan kullanıcının "LEVEL_3" (admin) rolüne sahip olup olmadığını kontrol eder.
 * Sadece adminlerin işlem yapabilmesi için her action'ın başında bu kontrol çağrılır.
 */
async function isAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) return false;
  return profile.role === 'LEVEL_3';
}

/**
 * Yeni bir kullanıcı ve profili oluşturur.
 * @param formData Formdan gelen verileri içerir.
 * @returns Başarı veya hata mesajı içeren bir nesne.
 */
export async function createUserAction(formData: FormData) {
  if (!(await isAdmin())) {
    return { success: false, message: 'Bu işlemi yapmaya yetkiniz yok.' };
  }

  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const regionId = formData.get('region') as string || null;

  if (!fullName || !email || !password || !role) {
    return { success: false, message: 'Tüm zorunlu alanlar doldurulmalıdır.' };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Supabase Auth içinde kullanıcı oluştur
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    return { success: false, message: `Kullanıcı oluşturma hatası: ${authError.message}` };
  }

  // 2. "profiles" tablosuna kullanıcının profilini ekle
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    full_name: fullName,
    role: role,
    region_id: regionId,
  });

  if (profileError) {
    // Profil oluşturulamazsa, oluşturulan kullanıcıyı geri silerek sistemi temiz tut
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { success: false, message: `Profil oluşturma hatası: ${profileError.message}` };
  }

  revalidatePath('/dashboard/admin/users');
  return { success: true, message: 'Kullanıcı başarıyla oluşturuldu.' };
}

/**
 * Mevcut bir kullanıcının profil bilgilerini günceller.
 * @param userId Güncellenecek kullanıcının ID'si.
 * @param formData Formdan gelen yeni veriler.
 * @returns Başarı veya hata mesajı içeren bir nesne.
 */
export async function updateUserAction(userId: string, formData: FormData) {
  if (!(await isAdmin())) {
    return { success: false, message: 'Bu işlemi yapmaya yetkiniz yok.' };
  }

  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string;
  const regionId = formData.get('region') as string || null;

  if (!userId || !fullName || !role) {
    return { success: false, message: 'Gerekli bilgiler (ID, İsim, Rol) eksik.' };
  }
  
  const supabase = createClient(); // Service role key gerekmiyorsa normal client yeterli
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      role: role,
      region_id: regionId,
    })
    .eq('id', userId);

  if (error) {
    return { success: false, message: `Kullanıcı güncellenemedi: ${error.message}` };
  }

  revalidatePath('/dashboard/admin/users');
  return { success: true, message: 'Kullanıcı başarıyla güncellendi!' };
}

/**
 * Bir kullanıcıyı hem "auth" hem de "profiles" tablosundan siler.
 * @param userId Silinecek kullanıcının ID'si.
 * @returns Başarı veya hata mesajı içeren bir nesne.
 */
export async function deleteUserAction(userId: string) {
    if (!(await isAdmin())) {
    return { success: false, message: 'Bu işlemi yapmaya yetkiniz yok.' };
  }

    if (!userId) {
    return { success: false, message: 'Kullanıcı IDsi bulunamadı.' };
  }
    
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
        return { success: false, message: `Kullanıcı silinemedi: ${deleteError.message}` };
    }

    revalidatePath('/dashboard/admin/users');
    return { success: true, message: 'Kullanıcı başarıyla silindi.' };
}