import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { get, run, newId, now } from './db';
import type { Role, UserRow } from './types';

const COOKIE = 'flowbook_session';
const MAX_AGE = 60 * 60 * 12; // 12 ชั่วโมง

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'ต้องตั้งค่า SESSION_SECRET ในไฟล์ .env ให้ยาวอย่างน้อย 32 ตัวอักษร'
    );
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // ตั้ง COOKIE_SECURE=true เมื่อเปิดผ่าน https เท่านั้น
    // ถ้าตั้งไว้ตอนรันบน http://<ip>:3000 เบราว์เซอร์จะทิ้ง cookie แล้วล็อกอินไม่ติด
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = get<UserRow>('SELECT * FROM User WHERE id = ?', payload.uid);
    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<UserRow> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

const RANK: Record<Role, number> = { VIEWER: 0, ENGINEER: 1, ADMIN: 2 };

export function atLeast(user: UserRow, role: Role): boolean {
  return RANK[user.role] >= RANK[role];
}

export async function requireRole(role: Role): Promise<UserRow> {
  const user = await requireUser();
  if (!atLeast(user, role)) redirect('/?denied=1');
  return user;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function audit(
  userId: string | null,
  action: string,
  target = '',
  detail = ''
) {
  run(
    'INSERT INTO AuditLog (id, userId, action, target, detail, createdAt) VALUES (?,?,?,?,?,?)',
    newId('aud'),
    userId,
    action,
    target,
    detail,
    now()
  );
}
