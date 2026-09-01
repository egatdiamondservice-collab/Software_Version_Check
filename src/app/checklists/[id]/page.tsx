import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { Shell } from '@/components/nav';
import { Btn, Card, Empty, Note, PageHead, Pill, StatusPill } from '@/components/ui';
import { itemsOf, sectionsOf, templateById, templateItemCount } from '@/lib/queries';
import type { ModelRow } from '@/lib/types';
import {
  addItem,
  addSection,
  createDraftFrom,
  deleteItem,
  deleteSection,
  publishTemplate,
  renameSection,
  updateItem,
} from '../actions';

export const dynamic = 'force-dynamic';

const cellInput =
  'w-full bg-white border-2 border-ink wob-sm px-3 py-1.5 text-base focus:border-pen focus:outline-none';

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const tpl = templateById(id);
  if (!tpl) notFound();

  const model = get<ModelRow>('SELECT * FROM ChargerModel WHERE id = ?', tpl.modelId)!;
  const sections = sectionsOf(tpl.id);
  const editable = user.role === 'ADMIN' && tpl.status === 'DRAFT';

  return (
    <Shell user={user}>
      <PageHead
        tag={model.name}
        title={`Checklist v${tpl.version}`}
        sub={`${sections.length} กลุ่ม · ${templateItemCount(tpl.id)} เคส`}
        actions={
          user.role === 'ADMIN' ? (
            tpl.status === 'DRAFT' ? (
              <form
                action={async () => {
                  'use server';
                  await publishTemplate(tpl.id);
                }}
              >
                <Btn type="submit">เผยแพร่เป็น v{tpl.version}</Btn>
              </form>
            ) : (
              <form
                action={async () => {
                  'use server';
                  await createDraftFrom(tpl.id);
                }}
              >
                <Btn type="submit" variant="secondary">
                  สร้างร่างเวอร์ชันใหม่
                </Btn>
              </form>
            )
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusPill status={tpl.status} />
        {!editable && user.role === 'ADMIN' && tpl.status !== 'DRAFT' && (
          <Pill tone="grey">เผยแพร่แล้ว แก้ไม่ได้ — กดสร้างร่างเวอร์ชันใหม่เพื่อแก้</Pill>
        )}
      </div>

      {editable && (
        <Note>
          การแก้ตรงนี้ยังไม่มีผลกับใคร จนกว่าจะกด <b>เผยแพร่</b> —
          และผลทดสอบที่ทำไปแล้วจะยังยึด checklist เวอร์ชันของมันเองเสมอ
        </Note>
      )}

      <div className="flex flex-col gap-6 mt-6">
        {sections.length === 0 && <Empty>ยังไม่มีกลุ่มทดสอบ</Empty>}

        {sections.map((s) => {
          const items = itemsOf(s.id);
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {editable ? (
                  <form
                    action={async (fd: FormData) => {
                      'use server';
                      await renameSection(tpl.id, s.id, fd);
                    }}
                    className="flex-1 min-w-[240px] flex gap-2"
                  >
                    <input name="name" defaultValue={s.name} className={`${cellInput} font-head text-lg`} />
                    <button type="submit" className="border-2 border-ink wob-sm px-3 bg-muted text-sm shadow-hardSm">
                      บันทึกชื่อ
                    </button>
                  </form>
                ) : (
                  <h2 className="text-2xl flex-1">{s.name}</h2>
                )}
                <Pill tone="yellow">{items.length} เคส</Pill>
                {editable && (
                  <form
                    action={async () => {
                      'use server';
                      await deleteSection(tpl.id, s.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="border-2 border-ink wob-sm px-3 py-0.5 bg-white text-sm shadow-hardSm hover:bg-accent hover:text-white"
                    >
                      ลบกลุ่ม
                    </button>
                  </form>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {items.map((it, idx) => (
                  <div key={it.id} className="border-2 border-dashed border-ink wob-sm p-3 bg-paper">
                    {editable ? (
                      <form
                        action={async (fd: FormData) => {
                          'use server';
                          await updateItem(tpl.id, it.id, fd);
                        }}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-head text-lg w-7 pt-1">{idx + 1}.</span>
                          <textarea name="testCase" rows={2} defaultValue={it.testCase} className={cellInput} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 pl-9">
                          <textarea
                            name="expected"
                            rows={2}
                            defaultValue={it.expected}
                            placeholder="ผลที่คาดหวัง"
                            className={cellInput}
                          />
                          <textarea
                            name="verify"
                            rows={2}
                            defaultValue={it.verify}
                            placeholder="สิ่งที่ต้องตรวจเพิ่ม (Meter / HMI)"
                            className={cellInput}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pl-9">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="critical"
                              defaultChecked={!!it.critical}
                              className="w-5 h-5 accent-[#ff4d4d]"
                            />
                            เคสสำคัญ (ต้องผ่านก่อนปล่อยใช้งาน)
                          </label>
                          <button type="submit" className="border-2 border-ink wob-sm px-3 py-0.5 bg-muted text-sm shadow-hardSm">
                            บันทึก
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-2">
                        <span className="font-head text-lg w-7">{idx + 1}.</span>
                        <div className="flex-1">
                          <div>{it.testCase}</div>
                          {it.expected && <div className="text-sm text-ink/70 mt-1">หวังผล: {it.expected}</div>}
                          {it.verify && <div className="text-sm text-ink/70">ตรวจเพิ่ม: {it.verify}</div>}
                        </div>
                        {!it.critical && <Pill tone="grey">ไม่บังคับ</Pill>}
                      </div>
                    )}

                    {editable && (
                      <form
                        action={async () => {
                          'use server';
                          await deleteItem(tpl.id, it.id);
                        }}
                        className="mt-2 pl-9"
                      >
                        <button
                          type="submit"
                          className="text-sm underline decoration-wavy text-ink/60 hover:text-accent"
                        >
                          ลบเคสนี้
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>

              {editable && (
                <form
                  action={async (fd: FormData) => {
                    'use server';
                    await addItem(tpl.id, s.id, fd);
                  }}
                  className="mt-4 border-2 border-ink wob-sm p-3 bg-postit flex flex-col gap-2"
                >
                  <textarea name="testCase" rows={2} placeholder="เพิ่มเคสใหม่ในกลุ่มนี้" className={cellInput} required />
                  <div className="grid md:grid-cols-2 gap-2">
                    <input name="expected" placeholder="ผลที่คาดหวัง" className={cellInput} />
                    <input name="verify" placeholder="สิ่งที่ต้องตรวจเพิ่ม" className={cellInput} />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="critical" defaultChecked className="w-5 h-5 accent-[#ff4d4d]" />
                      เคสสำคัญ
                    </label>
                    <button type="submit" className="border-2 border-ink wob-sm px-4 py-1 bg-white shadow-hardSm">
                      เพิ่มเคส
                    </button>
                  </div>
                </form>
              )}
            </Card>
          );
        })}

        {editable && (
          <form
            action={async (fd: FormData) => {
              'use server';
              await addSection(tpl.id, fd);
            }}
            className="flex flex-wrap gap-3"
          >
            <input
              name="name"
              placeholder="ชื่อกลุ่มใหม่ เช่น 4 Connectors"
              className={`${cellInput} flex-1 min-w-[240px]`}
              required
            />
            <Btn type="submit" variant="secondary">
              เพิ่มกลุ่ม
            </Btn>
          </form>
        )}
      </div>
    </Shell>
  );
}
