import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, atLeast } from '@/lib/auth';
import { get } from '@/lib/db';
import type { ModelRow } from '@/lib/types';
import { Shell } from '@/components/nav';
import { Btn, BtnLink, Card, Empty, Field, inputClass, Note, PageHead, Pill, StatusPill } from '@/components/ui';
import {
  artifactsOf,
  gatePassed,
  releaseById,
  runProgress,
  runsOfRelease,
} from '@/lib/queries';
import { setReleaseStatus, startTestRun, updateReleaseMeta, voidRun } from './actions';

export const dynamic = 'force-dynamic';

function kb(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const release = releaseById(id);
  if (!release) notFound();

  // Viewer เห็นได้เฉพาะเวอร์ชันที่ปล่อยแล้ว
  if (user.role === 'VIEWER' && release.status !== 'RELEASED' && release.status !== 'DEPRECATED') {
    redirect('/?denied=1');
  }

  const artifacts = artifactsOf(release.id);
  const runs = runsOfRelease(release.id);
  const gate = gatePassed(release.id);
  const canEdit = atLeast(user, 'ENGINEER');
  const model = get<ModelRow>('SELECT * FROM ChargerModel WHERE id = ?', release.modelId)!;
  const hardware = model.hardware.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <Shell user={user}>
      <PageHead
        tag={release.modelName}
        title={`เวอร์ชัน ${release.version}`}
        sub={
          <>
            อัปโหลดโดย {release.authorName} ·{' '}
            {new Date(release.createdAt).toLocaleString('th-TH')}
          </>
        }
        actions={
          <>
            <BtnLink href={`/api/releases/${release.id}/download`} variant="primary">
              ดาวน์โหลดทั้งชุด
            </BtnLink>
            {canEdit && (
              <form
                action={async () => {
                  'use server';
                  await startTestRun(release.id);
                }}
              >
                <Btn type="submit" variant="secondary">
                  เริ่ม / ทำต่อการทดสอบ
                </Btn>
              </form>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusPill status={release.status} />
        {gate.ok ? (
          <Pill tone="blue">ผ่านเกณฑ์ปล่อยใช้งาน</Pill>
        ) : (
          <Pill tone="grey">{gate.reason}</Pill>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card decoration="tape" className="pt-7">
            <h2 className="text-2xl mb-3">ไฟล์ในชุดนี้</h2>
            {artifacts.length === 0 ? (
              <Empty>ยังไม่มีไฟล์</Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {artifacts.map((a) => (
                  <div
                    key={a.id}
                    className="border-2 border-dashed border-ink wob-sm px-4 py-3 flex flex-wrap items-center gap-3 bg-paper"
                  >
                    <Pill tone="yellow">{a.slot}</Pill>
                    <a
                      href={`/api/artifacts/${a.id}`}
                      className="flex-1 min-w-[200px] underline decoration-wavy hover:text-accent break-all"
                    >
                      {a.filename}
                    </a>
                    <span className="text-sm text-ink/70">
                      {kb(a.sizeBytes)} · {a.nodeCount} node · {a.tabCount} tab
                    </span>
                    <span
                      className="text-xs text-ink/50 font-mono w-full break-all"
                      title="sha256 ใช้ยืนยันว่าไฟล์ที่โหลดไปตรงกับต้นฉบับ"
                    >
                      sha256 {a.sha256.slice(0, 24)}…
                    </span>
                  </div>
                ))}
              </div>
            )}
            {artifacts.length > 1 && (
              <Note>
                รุ่นนี้ต้องใช้ทุกไฟล์คู่กัน ปุ่ม “ดาวน์โหลดทั้งชุด” จะให้เป็น .zip
                ไฟล์เดียวเพื่อไม่ให้หยิบไปครึ่งเดียว
              </Note>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl mb-3">แก้อะไรบ้าง</h2>
            {canEdit ? (
              <form
                action={async (fd: FormData) => {
                  'use server';
                  await updateReleaseMeta(release.id, fd);
                }}
                className="flex flex-col gap-4"
              >
                <Field label="สรุปการเปลี่ยนแปลง">
                  <textarea
                    name="changelog"
                    rows={3}
                    defaultValue={release.changelog}
                    className={inputClass}
                    placeholder="เช่น แก้ logic แบ่ง power ตอน 3 หัวพร้อมกัน"
                  />
                </Field>
                <Btn type="submit" variant="secondary" className="self-start">
                  บันทึก
                </Btn>
              </form>
            ) : (
              <p className="m-0">{release.changelog || <span className="text-ink/50">ไม่ได้ระบุ</span>}</p>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl mb-1">ฮาร์ดแวร์ที่ใช้ได้</h2>
            <p className="text-sm text-ink/70 mb-3">
              เป็นคุณสมบัติของรุ่น {model.name} ทุกเวอร์ชันของรุ่นนี้ใช้ค่าเดียวกัน
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {hardware.length > 0 ? (
                hardware.map((h) => <Pill key={h}>{h}</Pill>)
              ) : (
                <span className="text-ink/50">ยังไม่ได้ระบุ</span>
              )}
              {canEdit && (
                <Link href="/models" className="underline decoration-wavy hover:text-accent text-sm ml-2">
                  แก้ที่หน้ารุ่นตู้
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl mb-3">ผลทดสอบ</h2>
            {runs.length === 0 ? (
              <Empty>ยังไม่เคยทดสอบเวอร์ชันนี้</Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {runs.map((r) => {
                  const p = runProgress(r);
                  return (
                    <div
                      key={r.id}
                      className="border-2 border-dashed border-ink wob-sm px-4 py-3 bg-paper flex flex-wrap items-center gap-3"
                    >
                      <StatusPill status={r.status} />
                      <Link href={`/runs/${r.id}`} className="flex-1 min-w-[160px] underline decoration-wavy hover:text-accent">
                        {r.testerName} · checklist v{r.templateVersion}
                      </Link>
                      <Pill tone={p.fail > 0 ? 'red' : 'blue'}>
                        ผ่าน {p.pass} · ไม่ผ่าน {p.fail} · ไม่เกี่ยว {p.na} / {p.total}
                      </Pill>
                      <span className="text-sm text-ink/60">
                        {new Date(r.startedAt).toLocaleDateString('th-TH')}
                      </span>
                      {r.status === 'VOIDED' && (
                        <span className="w-full text-sm text-accent">เหตุผลที่ยกเลิก: {r.voidReason}</span>
                      )}
                      {user.role === 'ADMIN' && r.status === 'SUBMITTED' && (
                        <form
                          action={async (fd: FormData) => {
                            'use server';
                            await voidRun(r.id, fd);
                          }}
                          className="w-full flex flex-wrap gap-2 items-center"
                        >
                          <input
                            name="reason"
                            placeholder="เหตุผลที่ยกเลิกผลนี้"
                            className="flex-1 min-w-[200px] border-2 border-ink wob-sm px-3 py-1 bg-white text-sm"
                            required
                          />
                          <button
                            type="submit"
                            className="border-2 border-ink wob-sm px-3 py-1 bg-white text-sm shadow-hardSm hover:bg-accent hover:text-white"
                          >
                            ยกเลิกผล
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {canEdit && (
            <Card decoration="tack" className="pt-7" tilt={1}>
              <h2 className="text-2xl mb-1">สถานะ</h2>
              <p className="text-sm text-ink/70 mb-4">
                จะกด “ปล่อยใช้งาน” ได้ต่อเมื่อมีผลทดสอบที่ส่งแล้วและไม่มีเคสสำคัญค้าง
              </p>
              <div className="flex flex-col gap-3">
                {(['DRAFT', 'TESTING', 'RELEASED', 'DEPRECATED'] as const).map((s) => (
                  <form
                    key={s}
                    action={async () => {
                      'use server';
                      await setReleaseStatus(release.id, s);
                    }}
                  >
                    <Btn
                      type="submit"
                      variant={s === 'RELEASED' ? 'primary' : 'plain'}
                      className="w-full text-base"
                      disabled={release.status === s || (s === 'RELEASED' && !gate.ok)}
                    >
                      {s === 'DRAFT'
                        ? 'ตั้งเป็นร่าง'
                        : s === 'TESTING'
                          ? 'กำลังทดสอบ'
                          : s === 'RELEASED'
                            ? 'ปล่อยใช้งาน'
                            : 'เลิกใช้'}
                    </Btn>
                  </form>
                ))}
              </div>
            </Card>
          )}

          <Card tilt={-1}>
            <h3 className="text-xl mb-2">มาจากเวอร์ชันไหน</h3>
            {release.baseReleaseId ? (
              <Link href={`/releases/${release.baseReleaseId}`} className="underline decoration-wavy">
                ดูเวอร์ชันต้นทาง
              </Link>
            ) : (
              <p className="text-ink/60 m-0">ไม่ได้ระบุ</p>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
