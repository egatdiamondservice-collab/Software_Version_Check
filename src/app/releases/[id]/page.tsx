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
  openRunFor,
  releaseById,
  runProgress,
  runsOfRelease,
} from '@/lib/queries';
import { setReleaseStatus, startTestRun, updateReleaseMeta, voidRun } from './actions';

export const dynamic = 'force-dynamic';

function kb(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

export default async function ReleasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; released?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { created, released } = await searchParams;
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
            <BtnLink href={`/api/releases/${release.id}/download`} variant="secondary">
              ดาวน์โหลดทั้งชุด
            </BtnLink>
            {canEdit && (
              <form
                action={async () => {
                  'use server';
                  await startTestRun(release.id);
                }}
              >
                <Btn type="submit" variant="primary">
                  {openRunFor(release.id, user.id) ? 'ทำต่อการทดสอบ' : 'เริ่มทดสอบ'}
                </Btn>
              </form>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusPill status={release.status} />
        {gate.ok ? (
          <Pill tone="green">ผ่านเกณฑ์ปล่อยใช้งาน</Pill>
        ) : (
          <Pill tone="grey">{gate.reason}</Pill>
        )}
      </div>

      {released && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="font-semibold text-green-800">ปล่อยใช้งานแล้ว</div>
            <div className="text-sm text-gray-700">
              ทีมโหลด {release.version} ได้จากปุ่มดาวน์โหลดบนหน้าแรกทันที
            </div>
          </div>
          <BtnLink href="/" variant="secondary">
            ไปหน้าแรก
          </BtnLink>
        </div>
      )}

      {created && canEdit && (
        <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="font-semibold text-brand-700">อัปโหลดเรียบร้อย</div>
            <div className="text-sm text-gray-700">
              {artifacts.length} ไฟล์ถูกเก็บไว้แล้ว ขั้นต่อไปคือทดสอบ — จะเริ่มเลยไหม
            </div>
          </div>
          <form
            action={async () => {
              'use server';
              await startTestRun(release.id);
            }}
          >
            <Btn type="submit">เริ่มทดสอบเลย</Btn>
          </form>
          <Link href={`/releases/${release.id}`} className="text-sm text-gray-500 hover:underline">
            ไว้ก่อน
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="">
            <h2 className="text-lg mb-3">ไฟล์ในชุดนี้</h2>
            {artifacts.length === 0 ? (
              <Empty>ยังไม่มีไฟล์</Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {artifacts.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3"
                  >
                    <Pill tone="yellow">{a.slot}</Pill>
                    <a
                      href={`/api/artifacts/${a.id}`}
                      className="flex-1 min-w-[200px] text-brand-600 hover:underline break-all"
                    >
                      {a.filename}
                    </a>
                    <span className="text-sm text-gray-600">
                      {kb(a.sizeBytes)} · {a.nodeCount} node · {a.tabCount} tab
                    </span>
                    <span
                      className="text-xs text-gray-500 font-mono w-full break-all"
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
            <h2 className="text-lg mb-3">แก้อะไรบ้าง</h2>
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
              <p className="m-0">{release.changelog || <span className="text-gray-500">ไม่ได้ระบุ</span>}</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg mb-1">ฮาร์ดแวร์ที่ใช้ได้</h2>
            <p className="text-sm text-gray-600 mb-3">
              เป็นคุณสมบัติของรุ่น {model.name} ทุกเวอร์ชันของรุ่นนี้ใช้ค่าเดียวกัน
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {hardware.length > 0 ? (
                hardware.map((h) => <Pill key={h}>{h}</Pill>)
              ) : (
                <span className="text-gray-500">ยังไม่ได้ระบุ</span>
              )}
              {canEdit && (
                <Link href="/models" className="text-brand-600 hover:underline text-sm ml-2">
                  แก้ที่หน้ารุ่นตู้
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg mb-3">ผลทดสอบ</h2>
            {runs.length === 0 ? (
              <Empty>ยังไม่เคยทดสอบเวอร์ชันนี้</Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {runs.map((r) => {
                  const p = runProgress(r);
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3"
                    >
                      <StatusPill status={r.status} />
                      <Link href={`/runs/${r.id}`} className="flex-1 min-w-[160px] text-brand-600 hover:underline">
                        {r.testerName} · checklist v{r.templateVersion}
                      </Link>
                      <Pill tone={p.fail > 0 ? 'red' : 'blue'}>
                        ผ่าน {p.pass} · ไม่ผ่าน {p.fail} · ไม่เกี่ยว {p.na} / {p.total}
                      </Pill>
                      <span className="text-sm text-gray-500">
                        {new Date(r.startedAt).toLocaleDateString('th-TH')}
                      </span>
                      {r.status === 'VOIDED' && (
                        <span className="w-full text-sm text-red-600">เหตุผลที่ยกเลิก: {r.voidReason}</span>
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
                            className="flex-1 min-w-[200px] rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                            required
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
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
            <Card>
              <h2 className="text-lg mb-1">ขั้นถัดไป</h2>
              {release.status === 'RELEASED' ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    เวอร์ชันนี้คือตัวที่ใช้งานอยู่ ถ้าอัปโหลดตัวใหม่แล้วปล่อยใช้งาน ตัวนี้จะกลายเป็น “เลิกใช้” ให้เอง
                  </p>
                  <form
                    action={async () => {
                      'use server';
                      await setReleaseStatus(release.id, 'DEPRECATED');
                    }}
                  >
                    <Btn type="submit" variant="danger" className="w-full">
                      เลิกใช้เวอร์ชันนี้
                    </Btn>
                  </form>
                </>
              ) : release.status === 'DEPRECATED' ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">เวอร์ชันนี้เลิกใช้แล้ว ยังดาวน์โหลดได้เพื่อเทียบกับตู้เก่า</p>
                  <form
                    action={async () => {
                      'use server';
                      await setReleaseStatus(release.id, 'RELEASED');
                    }}
                  >
                    <Btn type="submit" variant="secondary" className="w-full" disabled={!gate.ok}>
                      กลับมาใช้งานเวอร์ชันนี้
                    </Btn>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {gate.ok
                      ? 'ผ่านการทดสอบครบแล้ว กดปล่อยใช้งานได้เลย เวอร์ชันเก่าจะกลายเป็น “เลิกใช้” ให้เอง'
                      : `ยังปล่อยใช้งานไม่ได้ — ${gate.reason}`}
                  </p>
                  <form
                    action={async () => {
                      'use server';
                      await setReleaseStatus(release.id, 'RELEASED');
                    }}
                  >
                    <Btn type="submit" className="w-full" disabled={!gate.ok}>
                      ปล่อยใช้งาน
                    </Btn>
                  </form>
                </>
              )}
            </Card>
          )}

          <Card>
            <h3 className="text-base mb-2">มาจากเวอร์ชันไหน</h3>
            {release.baseReleaseId ? (
              <Link href={`/releases/${release.baseReleaseId}`} className="text-brand-600 hover:underline">
                ดูเวอร์ชันต้นทาง
              </Link>
            ) : (
              <p className="text-gray-500 m-0">ไม่ได้ระบุ</p>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
