import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Btn, Empty, Note, Pill, StatusPill, linkClass } from '@/components/ui';
import { itemsOf, modelByCode, publishedTemplate, sectionsOf, templateItemCount, templatesOf } from '@/lib/queries';
import { editChecklist } from '@/app/checklists/actions';

export const dynamic = 'force-dynamic';

/**
 * แท็บ checklist ของรุ่น — แสดงตัวที่ใช้อยู่แบบอ่านง่าย
 * admin กด "แก้ไข" ปุ่มเดียว ระบบสร้างร่างให้เองแล้วพาเข้าหน้าแก้
 */
export default async function ModelChecklistPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const { published } = await searchParams;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const current = publishedTemplate(model.id);
  const all = templatesOf(model.id);
  const draft = all.find((t) => t.status === 'DRAFT');
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-5">
      {published && (
        <Note tone="info">
          เผยแพร่ checklist v{published} แล้ว — การทดสอบครั้งถัดไปจะใช้ชุดนี้
        </Note>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {current ? (
          <>
            <span className="font-semibold">ใช้อยู่ v{current.version}</span>
            <Pill tone="neutral">
              {sectionsOf(current.id).length} กลุ่ม · {templateItemCount(current.id)} เคส
            </Pill>
            {current.publishedAt && (
              <span className="text-sm text-gray-500">
                เผยแพร่ {new Date(current.publishedAt).toLocaleDateString('th-TH')}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-500">รุ่นนี้ยังไม่มี checklist ที่เผยแพร่</span>
        )}

        {isAdmin && (
          <div className="ml-auto flex items-center gap-3">
            {draft && (
              <Link href={`/checklists/${draft.id}`} className={linkClass}>
                มีร่าง v{draft.version} ค้างอยู่ — แก้ต่อ
              </Link>
            )}
            {current && !draft && (
              <form
                action={async () => {
                  'use server';
                  await editChecklist(model.id);
                }}
              >
                <Btn type="submit" variant="secondary">
                  แก้ไข checklist
                </Btn>
              </form>
            )}
            {!current && draft && (
              <Link href={`/checklists/${draft.id}`} className={linkClass}>
                ใส่เคสในร่าง v{draft.version}
              </Link>
            )}
          </div>
        )}
      </div>

      {!current ? (
        <Empty>
          {isAdmin
            ? 'ยังไม่มี checklist — ใส่เคสในร่างแล้วกดเผยแพร่ หรือเพิ่มรุ่นใหม่โดยคัดลอกจากรุ่นที่มีอยู่'
            : 'ยังไม่มี checklist — ผู้ดูแลระบบยังไม่ได้เผยแพร่'}
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {sectionsOf(current.id).map((s) => {
            const items = itemsOf(s.id);
            return (
              <section key={s.id} className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base">{s.name}</h2>
                  <span className="text-sm text-gray-500">{items.length} เคส</span>
                </div>
                <ol className="divide-y divide-gray-100">
                  {items.map((it, idx) => (
                    <li key={it.id} className="px-5 py-3 flex gap-3">
                      <span className="text-sm font-semibold text-gray-400 w-6 shrink-0 tabular-nums">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{it.testCase}</div>
                        {it.expected && <div className="text-sm text-gray-600 mt-0.5">หวังผล: {it.expected}</div>}
                        {it.verify && <div className="text-sm text-gray-600">ตรวจเพิ่ม: {it.verify}</div>}
                      </div>
                      {!it.critical && <Pill tone="grey">ไม่บังคับ</Pill>}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}

      {all.length > 1 && (
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer select-none hover:text-gray-900">ประวัติ checklist ({all.length} เวอร์ชัน)</summary>
          <ul className="mt-2 flex flex-col gap-1 pl-4">
            {all.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="font-medium">v{t.version}</span>
                <StatusPill status={t.status} />
                <span className="text-gray-500">{templateItemCount(t.id)} เคส</span>
                {t.status === 'DRAFT' && isAdmin && (
                  <Link href={`/checklists/${t.id}`} className={linkClass}>
                    แก้ต่อ
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
