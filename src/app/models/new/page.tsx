import { requireRole } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Btn, BtnLink, Card, Field, inputClass, Note, PageHead } from '@/components/ui';
import { listModels, publishedTemplate } from '@/lib/queries';
import { createModel } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewModelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole('ENGINEER');
  const { error } = await searchParams;
  const sources = listModels().filter((m) => publishedTemplate(m.id));

  return (
    <Shell user={user}>
      <PageHead
        tag="รุ่นตู้"
        title="เพิ่มรุ่นตู้ใหม่"
        sub="ฮาร์ดแวร์ที่ใส่ตรงนี้จะใช้กับทุกเวอร์ชันของรุ่นนี้"
        actions={
          <BtnLink href="/models" variant="secondary">
            กลับไปหน้ารุ่นตู้
          </BtnLink>
        }
      />

      {error && <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <Card className="max-w-3xl">
        <form action={createModel} className="flex flex-col gap-5">
          <Field label="ชื่อรุ่น">
            <input name="name" className={inputClass} placeholder="Vector 160 kW" required autoFocus />
          </Field>

          <Field label="หมายเหตุ">
            <input name="note" className={inputClass} placeholder="2 หัวชาร์จ CCS2" />
          </Field>

          <Field label="ฮาร์ดแวร์ที่ใช้ได้" hint="คั่นด้วยจุลภาค">
            <input name="hardware" className={inputClass} placeholder="Sinexcel 40 kW, DWIN HMI, OCPP 1.6J" />
          </Field>

          <Field
            label="เริ่ม checklist จาก"
            hint="รุ่นใหม่ส่วนใหญ่แตกมาจากรุ่นเดิม คัดลอกมาแล้วค่อยตัดเคสที่ไม่เกี่ยวออกจะเร็วกว่าพิมพ์ใหม่"
          >
            <select name="copyFrom" className={inputClass} defaultValue="">
              <option value="">เริ่มจากศูนย์ (เป็นร่างรอผู้ดูแลระบบใส่เคส)</option>
              {sources.map((m) => (
                <option key={m.id} value={m.id}>
                  คัดลอกจาก {m.name}
                </option>
              ))}
            </select>
          </Field>

          <Note>
            ถ้าเลือกคัดลอก checklist มา ระบบจะเผยแพร่เป็น v1 ให้ทันที เริ่มทดสอบได้เลย
            เพราะเนื้อหาผ่านการอนุมัติมาแล้วในรุ่นต้นทาง — เคสจะได้รหัสใหม่ของตัวเอง
            จึงไม่ปนกับผลทดสอบของรุ่นเดิม
          </Note>

          <Btn type="submit" className="self-start">
            เพิ่มรุ่น
          </Btn>
        </form>
      </Card>
    </Shell>
  );
}
