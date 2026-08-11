'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/session';

export function useSession() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setUsername(session.username);
    setReady(true);
  // router is stable (equivalent to dispatch) — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { username, ready };
}
