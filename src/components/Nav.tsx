'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getSession } from '@/lib/session';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const session = getSession();
    setLoggedIn(!!session);
    setIsAdmin(session?.isAdmin ?? false);
  }, [pathname]);

  async function handleLogout() {
    clearSession();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const linkClass = (href: string) =>
    `text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
      pathname.startsWith(href)
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => router.push(loggedIn ? '/dashboard' : '/login')}
          className="font-semibold text-gray-900 text-base hover:text-blue-600 transition-colors"
        >
          Resume Builder
        </button>

        <div className="flex items-center gap-2">
          <Link href="/profiles" className={linkClass('/profiles')}>
            Profiles
          </Link>
          <Link href="/resume-generator" className={linkClass('/resume-generator')}>
            Resume Generator
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className={linkClass('/admin/users')}>
              Users
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
