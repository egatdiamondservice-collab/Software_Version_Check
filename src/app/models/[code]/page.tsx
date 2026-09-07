import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, atLeast } from '@/lib/auth';
import { Empty, Pill, StatusPill, linkClass, rowClass, smallBtn } from '@/components/ui';
import { listReleases, modelByCode, openRunFor, publishedTemplate, summarize } from '@/lib/queries';
import { startTestRun } from '@/app/releases/[id]/actions';

export const dynamic = 'force-dynamic';

export default async function ModelVersionsPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const releases = listReleases(model.id);
  const canTest = atLeast(user, 'ENGINEER') && !!publishedTemplate(model.id);

  if (releases.length === 0) {
    return <Empty>ยังไม่มีเวอร์ชันในรุ่นนี้</Empty>;
  }

  return (
    <div className="flex flex-col gap-3">
      {releases.map((r) => {
        const s = summarize(r);
        const p = s.progress;
        const visible = user.role !== 'VIEWER' || r.status === 'RELEASED' || r.status === 'DEPRECATED';
        return (
          <div key={r.id} className={rowClass}>
            <span className="font-semibold min-w-[92px]">{r.version}</span>
            <span className="flex-1 min-w-[220px] text-sm">
              {visible ? (
                <Link href={`/releases/${r.id}`} className={linkClass}>
                  {r.changelog || <span className="text-gray-400">ไม่ได้ระบุว่าแก้อะไร</span>}
                </Link>
              ) : (
                <span className="text-gray-400">{r.changelog || '—'}</span>
              )}
            </span>
            <StatusPill status={r.status} />
            <Pill tone={p && p.fail > 0 ? 'red' : p ? 'blue' : 'grey'}>
              {p ? `${p.pass + p.na} / ${p.total}` : 'ยังไม่ทดสอบ'}
            </Pill>
            <span className="text-xs text-gray-500">
              {new Date(r.createdAt).toLocaleDateString('th-TH')} · {r.authorName}
            </span>
            {visible && (
              <Link href={`/api/releases/${r.id}/download`} className={smallBtn}>
                ดาวน์โหลด
              </Link>
            )}
            {canTest && r.status !== 'DEPRECATED' && (
              <form
                action={async () => {
                  'use server';
                  await startTestRun(r.id);
                }}
              >
                <button type="submit" className={smallBtn}>
                  {openRunFor(r.id, user.id) ? 'ทำต่อ' : 'ทดสอบ'}
                </button>
              </form>
            )}
          </div>
        );
      })}

      <p className="text-sm text-gray-500 mt-2">
        เวอร์ชันที่ “เลิกใช้” ยังดาวน์โหลดได้ เพื่อย้อนไปเทียบกับตู้ที่ติดตั้งไปแล้ว แต่จะไม่ถูกเสนอเป็นตัวล่าสุดอีก
      </p>
    </div>
  );
}
