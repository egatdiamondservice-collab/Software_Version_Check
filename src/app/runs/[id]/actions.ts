'use server';

import { revalidatePath } from 'next/cache';
import { run as sql, get, newId, now } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { runById, runProgress } from '@/lib/queries';
import type { ResultStatus } from '@/lib/types';

function editableRun(runId: string, userId: string, isAdmin: boolean) {
  const r = runById(runId);
  if (!r) throw new Error('ไม่พบการทดสอบนี้');
  if (r.status !== 'IN_PROGRESS') throw new Error('การทดสอบนี้ส่งแล้ว แก้ไม่ได้');
  if (r.testerId !== userId && !isAdmin) throw new Error('นี่ไม่ใช่การทดสอบของคุณ');
  return r;
}

/** บันทึกทันทีทุกครั้งที่ติ๊ก — ปิดแท็บกลางคันแล้วกลับมาทำต่อได้ */
export async function saveResult(
  runId: string,
  itemKey: string,
  status: ResultStatus,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireRole('ENGINEER');
    editableRun(runId, user.id, user.role === 'ADMIN');

    const existing = get<{ id: string }>(
      'SELECT id FROM TestResult WHERE runId = ? AND itemKey = ?',
      runId,
      itemKey
    );
    if (existing) {
      sql(
        'UPDATE TestResult SET status = ?, note = ?, updatedAt = ? WHERE id = ?',
        status,
        note,
        now(),
        existing.id
      );
    } else {
      sql(
        'INSERT INTO TestResult (id, runId, itemKey, status, note, updatedAt) VALUES (?,?,?,?,?,?)',
        newId('res'),
        runId,
        itemKey,
        status,
        note,
        now()
      );
    }
    sql('UPDATE TestRun SET updatedAt = ? WHERE id = ?', now(), runId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ' };
  }
}

export async function submitRun(runId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireRole('ENGINEER');
    const r = editableRun(runId, user.id, user.role === 'ADMIN');
    const p = runProgress(r);
    if (p.done < p.total) {
      return { ok: false, error: `ยังเหลืออีก ${p.total - p.done} เคสที่ยังไม่ได้ติ๊ก` };
    }
    sql(
      "UPDATE TestRun SET status = 'SUBMITTED', note = ?, submittedAt = ?, updatedAt = ? WHERE id = ?",
      note,
      now(),
      now(),
      runId
    );
    audit(user.id, 'ส่งผลทดสอบ', runId, `ผ่าน ${p.pass} ไม่ผ่าน ${p.fail} ไม่เกี่ยว ${p.na}`);
    revalidatePath(`/runs/${runId}`);
    revalidatePath(`/releases/${r.releaseId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ส่งไม่สำเร็จ' };
  }
}
