import Link from 'next/link';
import { requireUser, atLeast } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Btn, BtnLink, Card, Empty, Field, inputClass, PageHead, Pill } from '@/components/ui';
import { listModels, listReleases, publishedTemplate, templateItemCount } from '@/lib/queries';
import { updateModel } from './actions';

export const dynamic = 'force-dynamic';

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const models = listModels();
  const canEdit = atLeast(user, 'ENGINEER');

  return (
    <Shell user={user}>
      <PageHead
        tag="รุ่นตู้"
        title="จัดการรุ่นตู้"
        sub="ฮาร์ดแวร์ที่ใช้ได้เป็นคุณสมบัติของรุ่น ทุกเวอร์ชันของรุ่นนั้นใช้ค่าเดียวกัน"
        actions={canEdit ? <BtnLink href="/models/new">+ เพิ่มรุ่นตู้ใหม่</BtnLink> : undefined}
      />

      {error && <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {models.length === 0 ? (
        <Empty>
          ยังไม่มีรุ่นตู้ในระบบ
          {canEdit && (
            <div className="mt-4">
              <BtnLink href="/models/new">+ เพิ่มรุ่นตู้ใหม่</BtnLink>
            </div>
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          {models.map((m, i) => {
            const releaseCount = listReleases(m.id).length;
            const tpl = publishedTemplate(m.id);
            const hardware = m.hardware.split(',').map((h) => h.trim()).filter(Boolean);

            return (
              <Card key={m.id}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="flex-1 min-w-[200px]">
                    <h2 className="text-lg leading-tight">
                      <Link href={`/models/${m.code}`} className="hover:text-red-600">
                        {m.name}
                      </Link>
                    </h2>
                    {m.note && <div className="text-sm text-gray-500">{m.note}</div>}
                  </div>
                  <Pill tone="neutral">{releaseCount} เวอร์ชัน</Pill>
                  {tpl ? (
                    <Pill tone="blue">
                      checklist v{tpl.version} · {templateItemCount(tpl.id)} เคส
                    </Pill>
                  ) : (
                    <Pill tone="yellow">ยังไม่มี checklist ที่เผยแพร่</Pill>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-sm text-gray-500 mr-1">ฮาร์ดแวร์</span>
                  {hardware.length > 0 ? (
                    hardware.map((h) => <Pill key={h}>{h}</Pill>)
                  ) : (
                    <span className="text-gray-400 text-sm">ยังไม่ได้ระบุ</span>
                  )}
                </div>

                {canEdit && (
                  // ซ่อนฟอร์มไว้ใต้ปุ่ม เพื่อให้หน้ารายการยังสั้นและกวาดตาดูได้เร็วเมื่อมีหลายรุ่น
                  <details className="mt-4 group">
                    <summary className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 select-none marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">แก้ข้อมูลรุ่นนี้</span>
                      <span className="hidden group-open:inline">ปิด</span>
                    </summary>

                    <form
                      action={async (fd: FormData) => {
                        'use server';
                        await updateModel(m.id, fd);
                      }}
                      className="grid gap-4 md:grid-cols-2 mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <Field label="ชื่อที่แสดง">
                        <input name="name" defaultValue={m.name} className={inputClass} />
                      </Field>
                      <Field label="หมายเหตุ">
                        <input name="note" defaultValue={m.note} className={inputClass} />
                      </Field>
                      <div className="md:col-span-2">
                        <Field
                          label="ฮาร์ดแวร์ที่ใช้ได้"
                          hint="คั่นด้วยจุลภาค เช่น Sinexcel 40 kW, DWIN HMI, OCPP 1.6J"
                        >
                          <input name="hardware" defaultValue={m.hardware} className={inputClass} />
                        </Field>
                      </div>
                      <div className="md:col-span-2 text-sm text-gray-500">
                        ไฟล์ของรุ่นนี้เก็บอยู่ที่ <code>data/flows/{m.code}/</code>
                      </div>
                      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                        <Btn type="submit" variant="secondary">
                          บันทึก
                        </Btn>
                        <Link
                          href={`/models/${m.code}`}
                          className="text-brand-600 hover:underline"
                        >
                          ดูประวัติเวอร์ชัน
                        </Link>
                      </div>
                    </form>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
