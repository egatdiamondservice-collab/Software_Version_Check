'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { get, run, newId, now } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { buildSnapshot, gatePassed, publishedTemplate, releaseById, runsOfRelease } from '@/lib/queries';

export async function startTestRun(releaseId: string) {
  const user = await requireRole('ENGINEER');
  const release = releaseById(releaseId);
  if (!release) throw new Error('ไม่พบเวอร์ชันนี้');

  const existing = runsOfRelease(releaseId).find(
    (r) => r.status === 'IN_PROGRESS' && r.testerId === user.id
  );
  if (existing) redirect(`/runs/${existing.id}`);

  const tpl = publishedTemplate(release.modelId);
  if (!tpl) throw new Error('รุ่นนี้ยังไม่มี checklist ที่เผยแพร่ — ให้ผู้ดูแลระบบเผยแพร่ก่อน');

  const snapshot = buildSnapshot(tpl.id);
  const runId = newId('run');
  run(
    `INSERT INTO TestRun (id, releaseId, templateId, testerId, status, snapshot, startedAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    runId,
    releaseId,
    tpl.id,
    user.id,
    'IN_PROGRESS',
    JSON.stringify(snapshot),
    now(),
    now()
  );

  if (release.status === 'DRAFT') {
    run("UPDATE Release SET status = 'TESTING' WHERE id = ?", releaseId);
  }

  audit(user.id, 'เริ่มทดสอบ', `${release.modelName} ${release.version}`, `checklist v${tpl.version}`);
  redirect(`/runs/${runId}`);
}

export async function setReleaseStatus(releaseId: string, status: string) {
  const user = await requireRole('ENGINEER');
  const release = releaseById(releaseId);
  if (!release) throw new Error('ไม่พบเวอร์ชันนี้');

  if (status === 'RELEASED') {
    const gate = gatePassed(releaseId);
    if (!gate.ok) throw new Error(`ยังปล่อยใช้งานไม่ได้ — ${gate.reason}`);
    run("UPDATE Release SET status = 'RELEASED', releasedAt = ? WHERE id = ?", now(), releaseId);
    // เวอร์ชันเดิมของรุ่นนี้ที่เคย RELEASED ให้กลายเป็น DEPRECATED
    run(
      "UPDATE Release SET status = 'DEPRECATED' WHERE modelId = ? AND id <> ? AND status = 'RELEASED'",
      release.modelId,
      releaseId
    );
  } else {
    run('UPDATE Release SET status = ? WHERE id = ?', status, releaseId);
  }

  audit(user.id, 'เปลี่ยนสถานะเวอร์ชัน', `${release.modelName} ${release.version}`, status);
  revalidatePath(`/releases/${releaseId}`);
}

export async function updateReleaseMeta(releaseId: string, form: FormData) {
  const user = await requireRole('ENGINEER');
  const changelog = String(form.get('changelog') ?? '');
  run('UPDATE Release SET changelog = ? WHERE id = ?', changelog, releaseId);
  audit(user.id, 'แก้รายละเอียดเวอร์ชัน', releaseId);
  revalidatePath(`/releases/${releaseId}`);
}

export async function voidRun(runId: string, form: FormData) {
  const user = await requireRole('ADMIN');
  const reason = String(form.get('reason') ?? '').trim();
  if (!reason) throw new Error('ต้องระบุเหตุผลในการยกเลิกผลทดสอบ');
  const r = get<{ releaseId: string }>('SELECT releaseId FROM TestRun WHERE id = ?', runId);
  run("UPDATE TestRun SET status = 'VOIDED', voidReason = ?, updatedAt = ? WHERE id = ?", reason, now(), runId);
  audit(user.id, 'ยกเลิกผลทดสอบ', runId, reason);
  if (r) revalidatePath(`/releases/${r.releaseId}`);
}
