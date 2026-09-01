'use server';

import { redirect } from 'next/navigation';
import { get, run } from '@/lib/db';
import { audit, createSession, hashPassword, verifyPassword } from '@/lib/auth';
import type { UserRow } from '@/lib/types';

export interface LoginState {
  error?: string;
  needsPassword?: boolean;
  employeeId?: string;
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const employeeId = String(form.get('employeeId') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  if (!employeeId || !password) {
    return { error: 'กรอกรหัสพนักงานและรหัสผ่านให้ครบ', employeeId };
  }

  const user = get<UserRow>('SELECT * FROM User WHERE employeeId = ?', employeeId);
  if (!user || !user.active) {
    return { error: 'ไม่พบรหัสพนักงานนี้ หรือบัญชีถูกปิดใช้งาน', employeeId };
  }

  // เข้าครั้งแรก — ยังไม่เคยตั้งรหัสผ่าน
  if (!user.passwordHash) {
    if (!confirm) {
      return {
        needsPassword: true,
        employeeId,
        error: 'เข้าใช้ครั้งแรก ตั้งรหัสผ่านของคุณเลย',
      };
    }
    if (password.length < 8) {
      return { needsPassword: true, employeeId, error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' };
    }
    if (password !== confirm) {
      return { needsPassword: true, employeeId, error: 'รหัสผ่านสองช่องไม่ตรงกัน' };
    }
    run('UPDATE User SET passwordHash = ? WHERE id = ?', hashPassword(password), user.id);
    audit(user.id, 'ตั้งรหัสผ่านครั้งแรก', user.employeeId);
    await createSession(user.id);
    redirect('/');
  }

  if (!verifyPassword(password, user.passwordHash)) {
    audit(user.id, 'ล็อกอินไม่สำเร็จ', user.employeeId);
    return { error: 'รหัสผ่านไม่ถูกต้อง', employeeId };
  }

  audit(user.id, 'ล็อกอิน', user.employeeId);
  await createSession(user.id);
  redirect('/');
}
