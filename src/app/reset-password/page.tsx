// src/app/reset-password/page.tsx

import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

// Next.js'e bu sayfanın dinamik olarak render edileceğini belirtir.
// "Suspense" ile birlikte kullanıldığında daha güvenli bir yaklaşımdır.
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}