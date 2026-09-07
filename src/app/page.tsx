import Link from 'next/link';
import { requireUser, atLeast } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Btn, BtnLink, Card, Empty, ErrorBanner, Meter, PageHead, Pill, StatusPill, linkClass } from '@/components/ui';
import {
  inProgressOf,
  listModels,
  openRunFor,
  publishedTemplate,
  releasedOf,
  summarize,
} from '@/lib/queries';
import { startTestRun } from './releases/[id]/actions';

export const dynamic = 'force-dynamic';

/**
 * หน้าแรก = หน้าใช้งาน
 * การ์ดแต่ละรุ่นตอบสองคำถามที่คนเปิดมาถามบ่อยที่สุด
 *   1. "โหลดตัวไหนไปลงตู้"      → ปุ่มดาวน์โหลดเวอร์ชันที่ปล่อยใช้งาน
 *   2. "ตัวใหม่ทดสอบถึงไหนแล้ว"  → แถบความคืบหน้า + ปุ่มทดสอบ
 */
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const models = listModels();
  const canTest = atLeast(user, 'ENGINEER');

  return (
    <Shell user={user}>
      <PageHead
        tag="หน้าแรก"
        title="รุ่นตู้ทั้งหมด"
        sub="เวอร์ชันที่ใช้งานอยู่ และเวอร์ชันใหม่ที่กำลังทดสอบ"
        actions={
          canTest ? (
            <>
              <BtnLink href="/models/new" variant="secondary">
                + เพิ่มรุ่นตู้ใหม่
              </BtnLink>
              <BtnLink href="/releases/new">อัปโหลดเวอร์ชันใหม่</BtnLink>
            </>
          ) : undefined
        }
      />

      {denied && <ErrorBanner>สิทธิ์ของคุณไม่ถึงสำหรับหน้านั้น</ErrorBanner>}

      {models.length === 0 ? (
        <Empty>
          ยังไม่มีรุ่นตู้ในระบบ
          {canTest && (
            <div className="mt-4">
              <BtnLink href="/models/new">+ เพิ่มรุ่นตู้ใหม่</BtnLink>
            </div>
          )}
        </Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const released = releasedOf(m.id);
            const working = inProgressOf(m.id);
            const tpl = publishedTemplate(m.id);
            const progress = working ? summarize(working).progress : null;
            const openRun = working && canTest ? openRunFor(working.id, user.id) : undefined;

            return (
              <Card key={m.id} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg leading-snug">
                    <Link href={`/models/${m.code}`} className="hover:text-brand-700">
                      {m.name}
                    </Link>
                  </h2>
                  {m.note && <div className="text-sm text-gray-500">{m.note}</div>}
                </div>

                {/* ---- เวอร์ชันที่ใช้งานอยู่ ---- */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">ใช้งานอยู่</div>
                  {released ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{released.version}</div>
                        <div className="text-xs text-gray-500">
                          ปล่อยเมื่อ{' '}
                          {released.releasedAt ? new Date(released.releasedAt).toLocaleDateString('th-TH') : '—'}
                        </div>
                      </div>
                      <BtnLink href={`/api/releases/${released.id}/download`} className="shrink-0">
                        ดาวน์โหลด
                      </BtnLink>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">ยังไม่มีเวอร์ชันที่ปล่อยใช้งาน</div>
                  )}
                </div>

                {/* ---- เวอร์ชันที่กำลังทำ ---- */}
                {working && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">กำลังทดสอบ</div>
                      <StatusPill status={working.status} />
                    </div>
                    <div className="font-medium mb-2">{working.version}</div>
                    {progress ? (
                      <>
                        <Meter
                          value={progress.pass + progress.na}
                          total={progress.total}
                          tone={progress.fail > 0 ? 'red' : 'blue'}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill tone={progress.fail > 0 ? 'red' : 'blue'}>
                            {progress.pass + progress.na} / {progress.total} เคส
                          </Pill>
                          {progress.fail > 0 && <Pill tone="red">ไม่ผ่าน {progress.fail}</Pill>}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">ยังไม่ได้เริ่มทดสอบ</div>
                    )}

                    {canTest && tpl && (
                      <form
                        action={async () => {
                          'use server';
                          await startTestRun(working.id);
                        }}
                        className="mt-3"
                      >
                        <Btn type="submit" variant={openRun ? 'primary' : 'secondary'} className="w-full">
                          {openRun ? 'ทำต่อการทดสอบ' : 'เริ่มทดสอบ'}
                        </Btn>
                      </form>
                    )}
                    {canTest && !tpl && (
                      <div className="mt-3 text-xs text-gray-500">ทดสอบไม่ได้ — รุ่นนี้ยังไม่มี checklist</div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-auto">
                  <Link href={`/models/${m.code}`} className={linkClass}>
                    ทุกเวอร์ชัน
                  </Link>
                  <Link href={`/models/${m.code}/checklist`} className={linkClass}>
                    Checklist
                  </Link>
                  <Link href={`/models/${m.code}/summary`} className={linkClass}>
                    สรุปการทดสอบ
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
