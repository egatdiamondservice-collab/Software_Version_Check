import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { Shell } from '@/components/nav';
import { Btn, Empty, Note, PageHead, StatusPill, linkClass } from '@/components/ui';
import { itemsOf, sectionsOf, templateById, templateItemCount } from '@/lib/queries';
import type { ModelRow } from '@/lib/types';
import {
  addItem,
  addSection,
  deleteItem,
  deleteSection,
  discardDraft,
  moveItem,
  publishTemplate,
  saveAll,
} from '../actions';

export const dynamic = 'force-dynamic';

const cell =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none';
const tiny =
  'inline-flex items-center rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30';

/**
 * หน้าแก้ checklist — ทั้งหน้าเป็นฟอร์มเดียว
 * แก้กี่เคสก็ได้แล้วกด "บันทึกทั้งหมด" ครั้งเดียว
 * ปุ่มย่อย (เพิ่ม/ลบ/เลื่อน) ใช้ formAction ของปุ่มนั้น ๆ และบันทึกสิ่งที่แก้ค้างไว้ก่อนเสมอ
 */
export default async function TemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const tpl = templateById(id);
  if (!tpl) notFound();

  const model = get<ModelRow>('SELECT * FROM ChargerModel WHERE id = ?', tpl.modelId)!;

  // หน้านี้มีไว้แก้ร่างเท่านั้น ถ้าไม่ใช่ร่างให้ไปดูที่แท็บ checklist ของรุ่น
  if (user.role !== 'ADMIN' || tpl.status !== 'DRAFT') {
    redirect(`/models/${model.code}/checklist`);
  }

  const sections = sectionsOf(tpl.id);
  const total = templateItemCount(tpl.id);

  return (
    <Shell user={user}>
      <PageHead
        tag={model.name}
        title={`แก้ไข checklist (ร่าง v${tpl.version})`}
        sub={
          <>
            {sections.length} กลุ่ม · {total} เคส ·{' '}
            <Link href={`/models/${model.code}/checklist`} className={linkClass}>
              กลับไปดู checklist ที่ใช้อยู่
            </Link>
          </>
        }
      />

      <form action={saveAll.bind(null, tpl.id)} className="flex flex-col gap-6">
        {/* แถบบันทึกติดบน — เห็นตลอดไม่ว่าจะเลื่อนไปแก้เคสที่ 30 */}
        <div className="sticky top-0 z-10 -mx-1 px-1 py-3 bg-gray-50/95 backdrop-blur border-b border-gray-200 flex flex-wrap items-center gap-3">
          <StatusPill status={tpl.status} />
          <span className="text-sm text-gray-600 flex-1 min-w-[200px]">
            {saved ? (
              <span className="text-green-700 font-medium">บันทึกแล้ว</span>
            ) : (
              'แก้ได้หลายเคสแล้วบันทึกครั้งเดียว — ยังไม่มีผลกับใครจนกว่าจะกดเผยแพร่'
            )}
          </span>
          <Btn type="submit" variant="secondary">
            บันทึกทั้งหมด
          </Btn>
          <Btn type="submit" formAction={publishTemplate.bind(null, tpl.id)}>
            บันทึกและเผยแพร่เป็น v{tpl.version}
          </Btn>
        </div>

        {sections.length === 0 && <Empty>ยังไม่มีกลุ่มทดสอบ — เพิ่มกลุ่มแรกด้านล่าง</Empty>}

        {sections.map((s) => {
          const items = itemsOf(s.id);
          return (
            <section key={s.id} className="bg-white border border-gray-200 rounded-xl shadow-card p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                  name={`sec:${s.id}:name`}
                  defaultValue={s.name}
                  aria-label="ชื่อกลุ่ม"
                  className={`${cell} font-semibold text-base flex-1 min-w-[240px]`}
                />
                <span className="text-sm text-gray-500">{items.length} เคส</span>
                <button
                  type="submit"
                  formAction={deleteSection.bind(null, tpl.id, s.id)}
                  className={`${tiny} text-red-600 hover:bg-red-50`}
                >
                  ลบกลุ่ม
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {items.map((it, idx) => (
                  <div key={it.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-semibold text-gray-400 w-6 pt-1.5 tabular-nums">{idx + 1}.</span>
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea
                          name={`item:${it.id}:testCase`}
                          rows={2}
                          defaultValue={it.testCase}
                          aria-label="เคสทดสอบ"
                          className={cell}
                        />
                        <div className="grid md:grid-cols-2 gap-2">
                          <textarea
                            name={`item:${it.id}:expected`}
                            rows={2}
                            defaultValue={it.expected}
                            placeholder="ผลที่คาดหวัง"
                            className={cell}
                          />
                          <textarea
                            name={`item:${it.id}:verify`}
                            rows={2}
                            defaultValue={it.verify}
                            placeholder="สิ่งที่ต้องตรวจเพิ่ม (Meter / HMI)"
                            className={cell}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name={`item:${it.id}:critical`}
                              defaultChecked={!!it.critical}
                              className="w-4 h-4 accent-brand-600"
                            />
                            เคสสำคัญ (ต้องผ่านก่อนปล่อยใช้งาน)
                          </label>
                          <span className="ml-auto flex items-center gap-1">
                            <button
                              type="submit"
                              formAction={moveItem.bind(null, tpl.id, it.id, 'up')}
                              disabled={idx === 0}
                              className={tiny}
                              title="เลื่อนขึ้น"
                            >
                              ↑
                            </button>
                            <button
                              type="submit"
                              formAction={moveItem.bind(null, tpl.id, it.id, 'down')}
                              disabled={idx === items.length - 1}
                              className={tiny}
                              title="เลื่อนลง"
                            >
                              ↓
                            </button>
                            <button
                              type="submit"
                              formAction={deleteItem.bind(null, tpl.id, it.id)}
                              className={`${tiny} text-red-600 hover:bg-red-50`}
                            >
                              ลบ
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* เพิ่มเคสใหม่ในกลุ่มนี้ */}
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3 flex flex-col gap-2">
                <textarea
                  name={`new:${s.id}:testCase`}
                  rows={1}
                  placeholder="+ เพิ่มเคสใหม่ในกลุ่มนี้ — พิมพ์แล้วกดปุ่มเพิ่ม"
                  className={cell}
                />
                <div className="grid md:grid-cols-2 gap-2">
                  <input name={`new:${s.id}:expected`} placeholder="ผลที่คาดหวัง" className={cell} />
                  <input name={`new:${s.id}:verify`} placeholder="สิ่งที่ต้องตรวจเพิ่ม" className={cell} />
                </div>
                <button
                  type="submit"
                  formAction={addItem.bind(null, tpl.id, s.id)}
                  className="self-start inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  เพิ่มเคส
                </button>
              </div>
            </section>
          );
        })}

        {/* เพิ่มกลุ่ม */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            name="newSectionName"
            placeholder="ชื่อกลุ่มใหม่ เช่น OCPP / การเชื่อมต่อ"
            className={`${cell} flex-1 min-w-[240px]`}
          />
          <Btn type="submit" variant="secondary" formAction={addSection.bind(null, tpl.id)}>
            เพิ่มกลุ่ม
          </Btn>
        </div>

        <Note>ผลทดสอบที่ทำไปแล้วยังยึด checklist เวอร์ชันของมันเองเสมอ การแก้ตรงนี้ไม่กระทบผลเก่า</Note>
      </form>

      {/* ทิ้งร่าง — อยู่นอกฟอร์มใหญ่ จะได้ไม่บันทึกอะไรก่อนทิ้ง */}
      <form
        action={async () => {
          'use server';
          await discardDraft(tpl.id);
        }}
        className="mt-4"
      >
        <button type="submit" className="text-sm text-gray-500 hover:text-red-600 hover:underline">
          ทิ้งร่างนี้ กลับไปใช้ checklist เดิม
        </button>
      </form>
    </Shell>
  );
}
