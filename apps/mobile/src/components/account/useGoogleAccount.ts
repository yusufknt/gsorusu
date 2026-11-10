import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/api/client';
import { useToast } from '@/components/ui';
import { GoogleAuthCancelledError, GoogleAuthUnavailableError, signOutGoogle, useGoogleSignIn } from '@/lib/googleAuth';
import { useHaptics } from '@/lib/haptics';

/** Google ile giriş / çıkış ve sonrasında yapılacaklar (sorguları tazelemek, kullanıcıya bildirmek). */
export function useGoogleAccount() {
  const google = useGoogleSignIn();
  const qc = useQueryClient();
  const toast = useToast();
  const buzz = useHaptics();
  const [busy, setBusy] = useState(false);

  /** true: giriş yapıldı. İptal ve hatalarda false; hata kullanıcıya gösterilir. */
  const signIn = async (): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      const result = await google.signIn();
      // Oturum başka bir oyuncuya geçmiş olabilir: her şey sunucudan yeniden okunur.
      await qc.invalidateQueries();
      buzz('success');
      toast(result.displayName ? `Hoş geldin, ${result.displayName}` : 'Google ile giriş yapıldı');
      return true;
    } catch (e) {
      if (e instanceof GoogleAuthCancelledError) return false;
      buzz('warning');
      toast(
        e instanceof GoogleAuthUnavailableError
          ? 'Google ile giriş çok yakında'
          : e instanceof ApiError
            ? e.message
            : 'Google ile giriş yapılamadı',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOutGoogle();
      // Önbellek sıfırlanır ve açık ekranlar yeni (misafir) oyuncunun verisini yeniden çeker.
      await qc.resetQueries();
      toast('Çıkış yapıldı');
    } finally {
      setBusy(false);
    }
  };

  return { available: google.available, busy, signIn, signOut };
}
