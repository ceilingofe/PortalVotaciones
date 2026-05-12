'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Vote, ClipboardList, History, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/home', label: 'Comunidad', Icon: Home },
  { href: '/eventos', label: 'Eventos', Icon: Vote },
  { href: '/reportes', label: 'Reportes', Icon: ClipboardList },
  { href: '/historico', label: 'Histórico', Icon: History },
  { href: '/ayuda', label: 'Ayuda', Icon: Headphones },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 md:top-[72px] z-30 bg-white border-b border-ieepc-gray-light md:rounded-none"
    >
      <ul className="flex items-stretch max-w-5xl mx-auto">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2.5 md:py-3 px-2 text-xs md:text-sm font-medium transition-colors border-b-2',
                  active
                    ? 'border-ieepc-yellow text-ieepc-black'
                    : 'border-transparent text-ieepc-gray hover:text-ieepc-black hover:bg-gray-50'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'text-ieepc-yellow-dark')} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
