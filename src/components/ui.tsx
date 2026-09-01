import Link from 'next/link';
import type { ReactNode } from 'react';

/* ---------------------------------- ปุ่ม ---------------------------------- */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-6 text-lg wob border-[3px] border-ink ' +
  'shadow-hard transition-transform duration-100 ' +
  'hover:shadow-hardSm hover:translate-x-[2px] hover:translate-y-[2px] ' +
  'active:shadow-none active:translate-x-[4px] active:translate-y-[4px] ' +
  'disabled:opacity-40 disabled:pointer-events-none';

type Variant = 'primary' | 'secondary' | 'plain';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-white text-ink hover:bg-accent hover:text-white',
  secondary: 'bg-muted text-ink hover:bg-pen hover:text-white',
  plain: 'bg-white text-ink hover:bg-muted',
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

/* --------------------------------- การ์ด --------------------------------- */

export function Card({
  children,
  className = '',
  decoration,
  tilt = 0,
}: {
  children: ReactNode;
  className?: string;
  decoration?: 'tape' | 'tack';
  tilt?: number;
}) {
  return (
    <div
      className={`relative bg-white border-2 border-ink wob-md shadow-softest p-5 md:p-6 ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {decoration === 'tape' && (
        <span className="absolute -top-3 left-1/2 -ml-[60px] w-[120px] h-7 bg-ink/15 border-x border-dashed border-ink/30 -rotate-2" />
      )}
      {decoration === 'tack' && (
        <span className="absolute -top-[10px] left-1/2 -ml-[10px] w-5 h-5 rounded-full bg-accent border-2 border-ink" />
      )}
      {children}
    </div>
  );
}

/* --------------------------------- ป้าย ---------------------------------- */

const PILL_TONE = {
  neutral: 'bg-white',
  yellow: 'bg-postit',
  blue: 'bg-[#dbe6f5] text-pen',
  red: 'bg-[#ffdede] text-accent',
  grey: 'bg-muted',
  solidBlue: 'bg-pen text-white',
  solidRed: 'bg-accent text-white',
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
      className={`inline-block border-2 border-ink wob-sm px-3 text-sm whitespace-nowrap ${PILL_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof PILL_TONE; label: string }> = {
    DRAFT: { tone: 'grey', label: 'ร่าง' },
    TESTING: { tone: 'yellow', label: 'กำลังทดสอบ' },
    RELEASED: { tone: 'blue', label: 'ปล่อยใช้งาน' },
    DEPRECATED: { tone: 'grey', label: 'เลิกใช้' },
    IN_PROGRESS: { tone: 'yellow', label: 'ทำค้างอยู่' },
    SUBMITTED: { tone: 'blue', label: 'ส่งแล้ว' },
    VOIDED: { tone: 'red', label: 'ถูกยกเลิก' },
    PUBLISHED: { tone: 'blue', label: 'ใช้อยู่' },
    ARCHIVED: { tone: 'grey', label: 'เก็บเข้ากรุ' },
  };
  const s = map[status] ?? { tone: 'neutral' as const, label: status };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/* ------------------------------ หัวข้อ / ป้ายกระดาษ ------------------------ */

export function StickyTag({ children, tone = 'yellow' }: { children: ReactNode; tone?: 'yellow' | 'blue' | 'red' }) {
  const bg = tone === 'blue' ? 'bg-[#dbe6f5]' : tone === 'red' ? 'bg-[#ffdede]' : 'bg-postit';
  return (
    <span
      className={`inline-block ${bg} border-2 border-ink wob-sm shadow-hardSm px-4 font-head text-base -rotate-2 mb-3`}
    >
      {children}
    </span>
  );
}

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
    <div className="flex flex-wrap items-end gap-4 justify-between mb-7">
      <div>
        {tag && <StickyTag>{tag}</StickyTag>}
        <h1 className="text-4xl md:text-5xl leading-tight">{title}</h1>
        {sub && <div className="mt-1 text-ink/70">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
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
    <label className="flex flex-col gap-1">
      <span className="font-head text-lg">{label}</span>
      {children}
      {hint && <span className="text-sm text-ink/60">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-white border-2 border-ink wob-sm px-4 py-2 text-lg placeholder:text-ink/40 ' +
  'focus:border-pen focus:ring-2 focus:ring-pen/20 focus:outline-none';

/* -------------------------------- ตัวช่วยอื่น ------------------------------ */

export function Meter({ value, total, tone = 'blue' }: { value: number; total: number; tone?: 'blue' | 'red' }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className="h-4 border-2 border-ink wob-sm bg-white overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${tone === 'red' ? 'bg-accent' : 'bg-pen'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border-[3px] border-dashed border-ink wob-md p-10 text-center text-ink/60 bg-paper">
      {children}
    </div>
  );
}

export function Squiggle() {
  return (
    <svg viewBox="0 0 200 16" fill="none" aria-hidden className="block mx-auto my-10 w-52 h-4">
      <path
        d="M4 8 C 20 0, 30 16, 46 8 S 72 0, 88 8 S 114 16, 130 8 S 156 0, 172 8 S 192 14, 196 8"
        stroke="#2d2d2d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Note({ children, tone = 'yellow' }: { children: ReactNode; tone?: 'yellow' | 'red' }) {
  return (
    <div
      className={`border-2 border-ink wob-sm px-4 py-3 ${tone === 'red' ? 'bg-[#ffdede]' : 'bg-postit'}`}
    >
      {children}
    </div>
  );
}
