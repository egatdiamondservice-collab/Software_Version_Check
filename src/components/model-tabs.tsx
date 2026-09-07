'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** แท็บของหน้ารุ่น: เวอร์ชัน / Checklist / สรุปการทดสอบ */
export function ModelTabs({ code }: { code: string }) {
  const pathname = usePathname();
  const base = `/models/${code}`;
  const tabs = [
    { href: base, label: 'เวอร์ชัน', exact: true },
    { href: `${base}/checklist`, label: 'Checklist' },
    { href: `${base}/summary`, label: 'สรุปการทดสอบ' },
  ];
  return (
    <nav className="flex gap-1 border-b border-gray-200 mb-6 -mt-2" aria-label="ส่วนของรุ่น">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
