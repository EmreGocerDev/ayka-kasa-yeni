// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Şimdilik ana sayfa direkt olarak login sayfasına yönlendirsin.
  // Daha sonra buraya da bir auth kontrolü eklenebilir.
  redirect('/login');
}