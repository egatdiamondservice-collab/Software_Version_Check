import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Note, PageHead, Pill, StatusPill, linkClass } from '@/components/ui';
import { gatePassed, releaseById, resultsOf, runById } from '@/lib/queries';
import { setReleaseStatus } from '@/app/releases/[id]/actions';
import { Btn } from '@/components/ui';
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
              <Link href={`/releases/${release.id}`} className="text-brand-600 hover:underline">
                กลับไปหน้าเวอร์ชัน
              </Link>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <StatusPill status={run.status} />
          <Pill tone="grey">เริ่ม {new Date(run.startedAt).toLocaleString('th-TH')}</Pill>
        </div>

        {run.status === 'VOIDED' && <Note tone="danger">ผลนี้ถูกยกเลิก: {run.voidReason}</Note>}

        {readOnly && run.status === 'IN_PROGRESS' && (
          <Note>
            การทดสอบนี้เป็นของ {run.testerName} — คุณดูได้แต่แก้ไม่ได้
          </Note>
        )}

        {run.note && run.status === 'SUBMITTED' && <Note>สรุปจากผู้ทดสอบ: {run.note}</Note>}

        {/* ส่งผลแล้ว → ถ้าผ่านเกณฑ์ ให้ปล่อยใช้งานได้ตรงนี้เลย ไม่ต้องย้อนกลับไปหาปุ่ม */}
        {run.status === 'SUBMITTED' &&
          user.role !== 'VIEWER' &&
          release.status !== 'RELEASED' &&
          (() => {
            const gate = gatePassed(release.id);
            return (
              <div
                className={`mt-4 rounded-xl border p-5 flex flex-wrap items-center gap-4 ${
                  gate.ok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex-1 min-w-[240px]">
                  <div className={`font-semibold ${gate.ok ? 'text-green-800' : 'text-amber-900'}`}>
                    {gate.ok ? 'ผ่านเกณฑ์ปล่อยใช้งานแล้ว' : 'ส่งผลแล้ว แต่ยังปล่อยใช้งานไม่ได้'}
                  </div>
                  <div className="text-sm text-gray-700">
                    {gate.ok
                      ? `ปล่อย ${release.version} ให้ทีมโหลดไปใช้ได้เลย เวอร์ชันเก่าจะกลายเป็น “เลิกใช้” ให้เอง`
                      : gate.reason}
                  </div>
                </div>
                {gate.ok ? (
                  <form
                    action={async () => {
                      'use server';
                      await setReleaseStatus(release.id, 'RELEASED');
                    }}
                  >
                    <Btn type="submit">ปล่อยใช้งาน {release.version}</Btn>
                  </form>
                ) : (
                  <Link href={`/releases/${release.id}`} className={linkClass}>
                    ดูรายละเอียดเวอร์ชัน
                  </Link>
                )}
              </div>
            );
          })()}

        <div className="mt-5">
          <RunSheet runId={run.id} snapshot={snapshot} initial={results} readOnly={readOnly} />
        </div>
      </div>
    </Shell>
  );
}
