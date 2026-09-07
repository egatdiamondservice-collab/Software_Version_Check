import Link from 'next/link';
import type { ReactNode } from 'react';

/* ---------------------------------- ปุ่ม ---------------------------------- */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-md text-sm font-medium ' +
  'border transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ' +
  'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

type Variant = 'primary' | 'secondary' | 'plain' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 border-brand-600 text-white hover:bg-brand-700 hover:border-brand-700',
  secondary: 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50',
  plain: 'bg-transparent border-transparent text-gray-700 hover:bg-gray-100',
  danger: 'bg-white border-red-300 text-red-700 hover:bg-red-50',
};

export function Btn({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: { children: ReactNode; variant?: Variant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BTN_BASE} ${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function BtnLink({
  children,
  href,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BTN_BASE} ${VARIANT[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/** ปุ่มเล็กสำหรับใช้ในแถวรายการ */
export const smallBtn =
  'inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition-colors';
export const smallDangerBtn =
  'inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50 transition-colors';

/* --------------------------------- การ์ด --------------------------------- */

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-card p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

/* --------------------------------- ป้าย ---------------------------------- */

const PILL_TONE = {
  neutral: 'bg-gray-100 text-gray-700',
  yellow: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  grey: 'bg-gray-100 text-gray-500',
  solidBlue: 'bg-brand-600 text-white',
  solidRed: 'bg-red-600 text-white',
} as const;

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONE;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${PILL_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof PILL_TONE; label: string }> = {
    DRAFT: { tone: 'grey', label: 'ร่าง' },
    TESTING: { tone: 'yellow', label: 'กำลังทดสอบ' },
    RELEASED: { tone: 'green', label: 'ปล่อยใช้งาน' },
    DEPRECATED: { tone: 'grey', label: 'เลิกใช้' },
    IN_PROGRESS: { tone: 'yellow', label: 'ทำค้างอยู่' },
    SUBMITTED: { tone: 'green', label: 'ส่งแล้ว' },
    VOIDED: { tone: 'red', label: 'ถูกยกเลิก' },
    PUBLISHED: { tone: 'green', label: 'ใช้อยู่' },
    ARCHIVED: { tone: 'grey', label: 'เก็บเข้ากรุ' },
  };
  const s = map[status] ?? { tone: 'neutral' as const, label: status };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/* ------------------------------ หัวข้อหน้า ------------------------------- */

export function PageHead({
  tag,
  title,
  sub,
  actions,
}: {
  tag?: string;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 justify-between mb-6">
      <div>
        {tag && (
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{tag}</div>
        )}
        <h1 className="text-2xl md:text-3xl leading-tight">{title}</h1>
        {sub && <div className="mt-1 text-sm text-gray-600">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* --------------------------------- ฟอร์ม --------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none';

/* -------------------------------- ตัวช่วยอื่น ------------------------------ */

export function Meter({ value, total, tone = 'blue' }: { value: number; total: number; tone?: 'blue' | 'red' | 'green' }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const color = tone === 'red' ? 'bg-red-500' : tone === 'green' ? 'bg-green-500' : 'bg-brand-600';
  return (
    <div
      className="h-2 rounded-full bg-gray-200 overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
      {children}
    </div>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'danger' }) {
  const cls =
    tone === 'danger'
      ? 'bg-red-50 border-red-200 text-red-800'
      : tone === 'warn'
        ? 'bg-amber-50 border-amber-200 text-amber-900'
        : 'bg-blue-50 border-blue-200 text-blue-900';
  return <div className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</div>
  );
}

/** ลิงก์ในเนื้อหา */
export const linkClass = 'text-brand-600 hover:text-brand-700 hover:underline';

/** แถวรายการที่ใช้ซ้ำในหลายหน้า */
export const rowClass =
  'rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2';
