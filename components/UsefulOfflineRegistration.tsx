'use client';

import { useEffect } from 'react';
import {
  getUsefulOfflineEnabledPreference,
  registerUsefulOfflineSupport,
} from '@/lib/usefulOffline';

export default function UsefulOfflineRegistration({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    void registerUsefulOfflineSupport(enabled && getUsefulOfflineEnabledPreference());
  }, [enabled]);

  return null;
}
