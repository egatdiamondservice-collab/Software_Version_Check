import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { BtnLink, Card, Empty, Meter, PageHead, Pill, StatusPill } from '@/components/ui';
import { listModels, listReleases, publishedTemplate, summarize, templateItemCount } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const models = listModels();

  return (
    <Shell user={user}>
      <PageHead
        tag="หน้าแรก"
        title="รุ่นตู้ทั้งหมด"
        sub="แต่ละรุ่นใช้ Flow เวอร์ชันอะไร และผ่านการทดสอบหรือยัง"
        actions={
          user.role !== 'VIEWER' ? (
            <>
              <BtnLink href="/models/new" variant="secondary">
                + เพิ่มรุ่นตู้ใหม่
              </BtnLink>
              <BtnLink href="/releases/new">อัปโหลดเวอร์ชันใหม่</BtnLink>
            </>
          ) : undefined
        }
      />

      {denied && (
        <div className="mb-6 border-2 border-ink wob-sm bg-[#ffdede] px-4 py-3">
          สิทธิ์ของคุณไม่ถึงสำหรับหน้านั้น
        </div>
      )}

      {models.length === 0 ? (
        <Empty>
          ยังไม่มีรุ่นตู้ในระบบ
          {user.role !== 'VIEWER' && (
            <div className="mt-4">
              <BtnLink href="/models/new">+ เพิ่มรุ่นตู้ใหม่</BtnLink>
            </div>
          )}
        </Empty>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((m, idx) => {
            const releases = listReleases(m.id);
            const latest = releases[0];
            const summary = latest ? summarize(latest) : null;
            const tpl = publishedTemplate(m.id);
            const caseCount = tpl ? templateItemCount(tpl.id) : 0;
            const p = summary?.progress ?? null;
            const tilt = idx % 3 === 0 ? -1 : idx % 3 === 2 ? 1 : 0;

            return (
              <Card key={m.id} decoration="tack" tilt={tilt} className="pt-7">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl leading-snug">
                    <Link href={`/models/${m.code}`} className="hover:text-accent">
                      {m.name}
                    </Link>
                  </h2>
                  {latest && <StatusPill status={latest.status} />}
                </div>

                {latest ? (
                  <>
                    <div className="text-ink/70 mt-1">ล่าสุด {latest.version}</div>
                    <div className="my-3">
                      <Meter
                        value={p ? p.pass + p.na : 0}
                        total={p ? p.total : caseCount || 1}
                        tone={p && p.fail > 0 ? 'red' : 'blue'}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p ? (
                        <>
                          <Pill tone={p.fail > 0 ? 'red' : 'blue'}>
                            {p.pass + p.na} / {p.total} เคส
                          </Pill>
                          {p.fail > 0 && <Pill tone="red">ไม่ผ่าน {p.fail}</Pill>}
                        </>
                      ) : (
                        <Pill tone="grey">ยังไม่ทดสอบ{caseCount ? ` · ${caseCount} เคส` : ''}</Pill>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-ink/60 mt-3">ยังไม่มี Flow ในรุ่นนี้</div>
                )}

                <div className="mt-5 flex flex-wrap gap-3 text-base">
                  <Link href={`/models/${m.code}`} className="underline decoration-wavy hover:text-accent">
                    ประวัติเวอร์ชัน ({releases.length})
                  </Link>
                  <Link href={`/coverage/${m.code}`} className="underline decoration-wavy hover:text-accent">
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
