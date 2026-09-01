import { revalidatePath } from 'next/cache';
import { requireRole, audit } from '@/lib/auth';
import { all, get, run, newId, now } from '@/lib/db';
import { Shell } from '@/components/nav';
import { Btn, Card, Field, inputClass, Note, PageHead, Pill } from '@/components/ui';
import { ROLE_LABEL, type Role, type UserRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function addUser(form: FormData) {
  'use server';
  const admin = await requireRole('ADMIN');
  const employeeId = String(form.get('employeeId') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  const role = String(form.get('role') ?? 'VIEWER') as Role;
  if (!employeeId || !name) return;
  if (get('SELECT id FROM User WHERE employeeId = ?', employeeId)) return;

  run(
    'INSERT INTO User (id, employeeId, name, role, passwordHash, active, createdAt) VALUES (?,?,?,?,?,?,?)',
    newId('usr'),
    employeeId,
    name,
    role,
    null,
    1,
    now()
  );
  audit(admin.id, 'เพิ่มผู้ใช้', employeeId, ROLE_LABEL[role]);
  revalidatePath('/admin/users');
}

async function setRole(userId: string, role: Role) {
  'use server';
  const admin = await requireRole('ADMIN');
  run('UPDATE User SET role = ? WHERE id = ?', role, userId);
  audit(admin.id, 'เปลี่ยนสิทธิ์', userId, ROLE_LABEL[role]);
  revalidatePath('/admin/users');
}

async function toggleActive(userId: string) {
  'use server';
  const admin = await requireRole('ADMIN');
  if (admin.id === userId) return; // กันตัวเองล็อกตัวเองออก
  run('UPDATE User SET active = 1 - active WHERE id = ?', userId);
  audit(admin.id, 'สลับสถานะบัญชี', userId);
  revalidatePath('/admin/users');
}

async function resetPassword(userId: string) {
  'use server';
  const admin = await requireRole('ADMIN');
  run('UPDATE User SET passwordHash = NULL WHERE id = ?', userId);
  audit(admin.id, 'ล้างรหัสผ่าน', userId);
  revalidatePath('/admin/users');
}

export default async function UsersPage() {
  const admin = await requireRole('ADMIN');
  const users = all<UserRow>('SELECT * FROM User ORDER BY role DESC, employeeId');

  return (
    <Shell user={admin}>
      <PageHead tag="ผู้ดูแลระบบ" title="ผู้ใช้งาน" sub="เพิ่มรหัสพนักงานให้ก่อน แล้วเจ้าตัวตั้งรหัสผ่านเองตอนเข้าครั้งแรก" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className={`border-2 border-ink wob-sm px-4 py-3 flex flex-wrap items-center gap-3 ${
                u.active ? 'bg-white' : 'bg-muted'
              }`}
            >
              <span className="font-head text-lg min-w-[92px]">{u.employeeId}</span>
              <span className="flex-1 min-w-[140px]">{u.name}</span>
              {!u.passwordHash && <Pill tone="yellow">ยังไม่ตั้งรหัสผ่าน</Pill>}
              {!u.active && <Pill tone="grey">ปิดใช้งาน</Pill>}

              <form
                action={async (fd: FormData) => {
                  'use server';
                  await setRole(u.id, String(fd.get('role')) as Role);
                }}
                className="flex items-center gap-2"
              >
                <select
                  name="role"
                  defaultValue={u.role}
                  className="border-2 border-ink wob-sm px-2 py-1 bg-white text-sm"
                >
                  {(['VIEWER', 'ENGINEER', 'ADMIN'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="border-2 border-ink wob-sm px-2 py-1 bg-muted text-sm shadow-hardSm">
                  ตั้ง
                </button>
              </form>

              <form
                action={async () => {
                  'use server';
                  await resetPassword(u.id);
                }}
              >
                <button type="submit" className="border-2 border-ink wob-sm px-2 py-1 bg-white text-sm shadow-hardSm">
                  ล้างรหัสผ่าน
                </button>
              </form>

              {admin.id !== u.id && (
                <form
                  action={async () => {
                    'use server';
                    await toggleActive(u.id);
                  }}
                >
                  <button
                    type="submit"
                    className="border-2 border-ink wob-sm px-2 py-1 bg-white text-sm shadow-hardSm hover:bg-accent hover:text-white"
                  >
                    {u.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        <Card decoration="tack" className="pt-7 self-start" tilt={1}>
          <h2 className="text-2xl mb-4">เพิ่มผู้ใช้</h2>
          <form action={addUser} className="flex flex-col gap-4">
            <Field label="รหัสพนักงาน">
              <input name="employeeId" className={inputClass} required />
            </Field>
            <Field label="ชื่อ">
              <input name="name" className={inputClass} required />
            </Field>
            <Field label="สิทธิ์">
              <select name="role" defaultValue="VIEWER" className={inputClass}>
                {(['VIEWER', 'ENGINEER', 'ADMIN'] as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Btn type="submit">เพิ่ม</Btn>
          </form>
          <div className="mt-4">
            <Note>
              “ล้างรหัสผ่าน” ใช้ตอนคนลืมรหัส — เจ้าตัวจะตั้งใหม่เองตอนล็อกอินครั้งถัดไป
              ไม่มีใครเห็นรหัสผ่านของใคร
            </Note>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
