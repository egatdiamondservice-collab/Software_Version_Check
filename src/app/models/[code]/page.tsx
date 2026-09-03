import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { BtnLink, Card, Empty, PageHead, Pill, StatusPill } from '@/components/ui';
import { atLeast } from '@/lib/auth';
import { listReleases, modelByCode, summarize } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ModelPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const releases = listReleases(model.id);
  const hardware = model.hardware.split(',').map((h) => h.trim()).filter(Boolean);

  return (
    <Shell user={user}>
      <PageHead
        tag="ประวัติของรุ่น"
        title={model.name}
        sub={model.note || `รหัสรุ่น ${model.code}`}
        actions={
          <>
            <BtnLink href="/models" variant="plain">
              แก้ข้อมูลรุ่น
            </BtnLink>
            <BtnLink href={`/coverage/${model.code}`} variant="secondary">
              สรุปการทดสอบ
            </BtnLink>
            {user.role !== 'VIEWER' && <BtnLink href="/releases/new">อัปโหลดเวอร์ชันใหม่</BtnLink>}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="font-head text-lg mr-1">ฮาร์ดแวร์ที่ใช้ได้</span>
        {hardware.length > 0 ? (
          hardware.map((h) => <Pill key={h}>{h}</Pill>)
        ) : (
          <span className="text-ink/50">
            ยังไม่ได้ระบุ{atLeast(user, 'ENGINEER') ? ' — ใส่ได้ที่หน้ารุ่นตู้' : ''}
          </span>
        )}
      </div>

      {releases.length === 0 ? (
        <Empty>ยังไม่มีเวอร์ชันในรุ่นนี้</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {releases.map((r) => {
            const s = summarize(r);
            const p = s.progress;
            const visible = user.role !== 'VIEWER' || r.status === 'RELEASED' || r.status === 'DEPRECATED';
            return (
              <div
                key={r.id}
                className="border-2 border-dashed border-ink wob-sm bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <span className="font-head text-xl min-w-[92px]">{r.version}</span>
                <span className="flex-1 min-w-[220px]">
                  {visible ? (
                    <Link href={`/releases/${r.id}`} className="hover:text-accent">
                      {r.changelog || <span className="text-ink/50">ไม่ได้ระบุว่าแก้อะไร</span>}
                    </Link>
                  ) : (
                    <span className="text-ink/50">{r.changelog || '—'}</span>
                  )}
                </span>
                <StatusPill status={r.status} />
                <Pill tone={p && p.fail > 0 ? 'red' : p ? 'blue' : 'grey'}>
                  {p ? `${p.pass + p.na} / ${p.total}` : 'ยังไม่ทดสอบ'}
                </Pill>
                <Pill tone="neutral">{r.artifactCount} ไฟล์</Pill>
                <span className="text-sm text-ink/60">
                  {new Date(r.createdAt).toLocaleDateString('th-TH')} · {r.authorName}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Card className="mt-8" tilt={-0.5}>
        <p className="m-0 text-ink/75">
          เวอร์ชันที่ขึ้นสถานะ <b>เลิกใช้</b> ยังดาวน์โหลดได้อยู่ เพื่อให้ย้อนกลับไปเทียบกับตู้ที่ติดตั้งไปแล้วได้
          แต่จะไม่ถูกเสนอเป็นตัวล่าสุดอีก
        </p>
      </Card>
    </Shell>
  );
}
