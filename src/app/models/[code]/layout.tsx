import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireUser, atLeast } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { ModelTabs } from '@/components/model-tabs';
import { BtnLink, PageHead, Pill } from '@/components/ui';
import { modelByCode } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * หน้ารุ่นเป็นศูนย์รวมของทุกอย่างที่เกี่ยวกับรุ่นนั้น
 * ส่วนหัว (ชื่อ ฮาร์ดแวร์) กับแท็บอยู่ตรงนี้ หน้าย่อยแค่ใส่เนื้อหา
 */
export default async function ModelLayout({
  params,
  children,
}: {
  params: Promise<{ code: string }>;
  children: ReactNode;
}) {
  const user = await requireUser();
  const { code } = await params;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const hardware = model.hardware.split(',').map((h) => h.trim()).filter(Boolean);

  return (
    <Shell user={user}>
      <PageHead
        tag="รุ่นตู้"
        title={model.name}
        sub={
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {model.note && <span>{model.note}</span>}
            {hardware.map((h) => (
              <Pill key={h}>{h}</Pill>
            ))}
            {hardware.length === 0 && <span className="text-gray-400">ยังไม่ได้ระบุฮาร์ดแวร์</span>}
          </div>
        }
        actions={
          <>
            {atLeast(user, 'ENGINEER') && (
              <BtnLink href="/models" variant="secondary">
                แก้ข้อมูลรุ่น
              </BtnLink>
            )}
            {atLeast(user, 'ENGINEER') && <BtnLink href="/releases/new">อัปโหลดเวอร์ชันใหม่</BtnLink>}
          </>
        }
      />
      <ModelTabs code={model.code} />
      {children}
    </Shell>
  );
}
