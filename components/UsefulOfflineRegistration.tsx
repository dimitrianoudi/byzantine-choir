'use client';

import { useEffect } from 'react';
import { registerUsefulOfflineSupport } from '@/lib/usefulOffline';

export default function UsefulOfflineRegistration({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    void registerUsefulOfflineSupport(enabled);
  }, [enabled]);

  return null;
}
