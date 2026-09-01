import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Note, PageHead, Pill, StatusPill } from '@/components/ui';
import { releaseById, resultsOf, runById } from '@/lib/queries';
import type { TemplateSnapshot } from '@/lib/types';
import { RunSheet } from './RunSheet';

export const dynamic = 'force-dynamic';

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const run = runById(id);
  if (!run) notFound();

  const release = releaseById(run.releaseId)!;
  const snapshot = JSON.parse(run.snapshot) as TemplateSnapshot;
  const results = resultsOf(run.id);

  const readOnly =
    run.status !== 'IN_PROGRESS' ||
    user.role === 'VIEWER' ||
    (run.testerId !== user.id && user.role !== 'ADMIN');

  return (
    <Shell user={user}>
      <div className="max-w-2xl mx-auto">
        <PageHead
          tag={`${release.modelName} · ${release.version}`}
          title="ทดสอบ Flow"
          sub={
            <>
              checklist v{snapshot.templateVersion} · ผู้ทดสอบ {run.testerName} ·{' '}
              <Link href={`/releases/${release.id}`} className="underline decoration-wavy">
                กลับไปหน้าเวอร์ชัน
              </Link>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <StatusPill status={run.status} />
          <Pill tone="grey">เริ่ม {new Date(run.startedAt).toLocaleString('th-TH')}</Pill>
        </div>

        {run.status === 'VOIDED' && <Note tone="red">ผลนี้ถูกยกเลิก: {run.voidReason}</Note>}

        {readOnly && run.status === 'IN_PROGRESS' && (
          <Note>
            การทดสอบนี้เป็นของ {run.testerName} — คุณดูได้แต่แก้ไม่ได้
          </Note>
        )}

        {run.note && run.status === 'SUBMITTED' && <Note>สรุปจากผู้ทดสอบ: {run.note}</Note>}

        <div className="mt-5">
          <RunSheet runId={run.id} snapshot={snapshot} initial={results} readOnly={readOnly} />
        </div>
      </div>
    </Shell>
  );
}
