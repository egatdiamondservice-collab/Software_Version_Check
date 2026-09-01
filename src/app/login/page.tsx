'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';
import { Btn, Card, Field, inputClass, Note } from '@/components/ui';

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl -rotate-1 inline-block">FlowBook</h1>
          <p className="mt-2 text-ink/70">คลัง Flow ตู้ชาร์จ และ checklist ทดสอบ</p>
        </div>

        <Card decoration="tape" tilt={-0.7}>
          <form action={formAction} className="flex flex-col gap-5 pt-2">
            <Field label="รหัสพนักงาน">
              <input
                name="employeeId"
                autoComplete="username"
                defaultValue={state.employeeId}
                className={inputClass}
                placeholder="เช่น 61234"
                required
              />
            </Field>

            <Field label={state.needsPassword ? 'ตั้งรหัสผ่านใหม่' : 'รหัสผ่าน'}>
              <input
                name="password"
                type="password"
                autoComplete={state.needsPassword ? 'new-password' : 'current-password'}
                className={inputClass}
                required
              />
            </Field>

            {state.needsPassword && (
              <Field label="พิมพ์รหัสผ่านอีกครั้ง" hint="อย่างน้อย 8 ตัวอักษร">
                <input name="confirm" type="password" autoComplete="new-password" className={inputClass} required />
              </Field>
            )}

            {state.error && (
              <Note tone={state.needsPassword ? 'yellow' : 'red'}>{state.error}</Note>
            )}

            <Btn type="submit" disabled={pending}>
              {pending ? 'กำลังเข้า…' : state.needsPassword ? 'ตั้งรหัสผ่านและเข้าใช้งาน' : 'เข้าใช้งาน'}
            </Btn>
          </form>
        </Card>

        <p className="text-center text-sm text-ink/60 mt-6">
          ไม่มีสมัครเอง — ผู้ดูแลระบบเป็นคนเพิ่มรหัสพนักงานให้
          แล้วคุณตั้งรหัสผ่านเองตอนเข้าครั้งแรก
        </p>
      </div>
    </main>
  );
}
