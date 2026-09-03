import Link from 'next/link';
import { destroySession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { UserRow } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/types';

async function logout() {
  'use server';
  await destroySession();
  redirect('/login');
}

const LINK =
  'font-head text-lg px-1 hover:text-accent transition-transform duration-100 hover:-rotate-2 inline-block';

export function Nav({ user }: { user: UserRow }) {
  return (
    <header className="border-b-[3px] border-dashed border-ink mb-8">
      <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="font-head text-2xl -rotate-1 inline-block">
          FlowBook
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/" className={LINK}>
            หน้าแรก
          </Link>
          <Link href="/models" className={LINK}>
            รุ่นตู้
          </Link>
          {user.role !== 'VIEWER' && (
            <Link href="/releases/new" className={LINK}>
              อัปโหลด
            </Link>
          )}
          <Link href="/checklists" className={LINK}>
            Checklist
          </Link>
          {user.role === 'ADMIN' && (
            <>
              <Link href="/admin/users" className={LINK}>
                ผู้ใช้
              </Link>
              <Link href="/admin/audit" className={LINK}>
                บันทึกการใช้งาน
              </Link>
            </>
          )}
        </nav>

        <form action={logout} className="ml-auto flex items-center gap-3">
          <span className="text-sm bg-postit border-2 border-ink wob-sm px-3 py-0.5 rotate-1 inline-block">
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <button
            type="submit"
            className="text-sm border-2 border-ink wob-sm px-3 py-0.5 bg-white shadow-hardSm hover:bg-accent hover:text-white transition-transform duration-100"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}

export function Shell({ user, children }: { user: UserRow; children: React.ReactNode }) {
  return (
    <>
      <Nav user={user} />
      <main className="max-w-6xl mx-auto px-5 pb-24">{children}</main>
    </>
  );
}
