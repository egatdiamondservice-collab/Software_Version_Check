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

const LINK = 'text-sm font-medium text-gray-600 hover:text-gray-900 px-1 py-1';

export function Nav({ user }: { user: UserRow }) {
  return (
    <header className="bg-white border-b border-gray-200 mb-8">
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="text-lg font-semibold text-gray-900 tracking-tight">
          FlowBook
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
          <span className="text-sm text-gray-600">
            {user.name} <span className="text-gray-400">· {ROLE_LABEL[user.role]}</span>
          </span>
          <button
            type="submit"
            className="text-sm rounded-md border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:bg-gray-50"
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
