'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { get, run, newId, now } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { cloneTemplate, itemsOf, sectionsOf, templateById } from '@/lib/queries';

/** ห้ามแก้ template ที่เผยแพร่แล้ว — ต้อง clone เป็นเวอร์ชันใหม่ก่อนเสมอ */
function assertDraft(templateId: string) {
  const t = templateById(templateId);
  if (!t) throw new Error('ไม่พบ checklist นี้');
  if (t.status !== 'DRAFT') {
    throw new Error('แก้ checklist ที่เผยแพร่แล้วไม่ได้ — กด "แก้ไข" เพื่อสร้างร่างก่อน');
  }
  return t;
}

/**
 * ปุ่ม "แก้ไข" กดเดียว — ผู้ใช้ไม่ต้องรู้เรื่องร่างก่อน
 * ถ้ามีร่างค้างอยู่ก็เปิดร่างนั้น ถ้าไม่มีก็คัดลอกตัวที่ใช้อยู่มาเป็นร่างให้
 */
export async function editChecklist(modelId: string) {
  const user = await requireRole('ADMIN');
  const draft = get<{ id: string }>(
    "SELECT id FROM ChecklistTemplate WHERE modelId = ? AND status = 'DRAFT' ORDER BY version DESC LIMIT 1",
    modelId
  );
  if (draft) redirect(`/checklists/${draft.id}`);

  const published = get<{ id: string; version: number }>(
    "SELECT id, version FROM ChecklistTemplate WHERE modelId = ? AND status = 'PUBLISHED' ORDER BY version DESC LIMIT 1",
    modelId
  );
  if (!published) throw new Error('รุ่นนี้ยังไม่มี checklist เลย');

  const newTplId = cloneTemplate(published.id);
  audit(user.id, 'สร้างร่าง checklist ใหม่', newTplId, `คัดลอกจาก v${published.version}`);
  redirect(`/checklists/${newTplId}`);
}

/** เผยแพร่ — บันทึกสิ่งที่แก้ค้างอยู่ในฟอร์มก่อนเสมอ */
export async function publishTemplate(templateId: string, form: FormData | null) {
  const user = await requireRole('ADMIN');
  const t = assertDraft(templateId);
  applyEdits(templateId, form);
  run(
    "UPDATE ChecklistTemplate SET status = 'ARCHIVED' WHERE modelId = ? AND status = 'PUBLISHED'",
    t.modelId
  );
  run(
    "UPDATE ChecklistTemplate SET status = 'PUBLISHED', publishedAt = ? WHERE id = ?",
    now(),
    templateId
  );
  audit(user.id, 'เผยแพร่ checklist', templateId, `v${t.version}`);
  const model = get<{ code: string }>('SELECT code FROM ChargerModel WHERE id = ?', t.modelId)!;
  redirect(`/models/${model.code}/checklist?published=${t.version}`);
}

/**
 * บันทึกทุกอย่างที่แก้ในหน้าเดียวพร้อมกัน — ชื่อกลุ่มและทุกช่องของทุกเคส
 * ชื่อ field ในฟอร์ม:  sec:<sectionId>:name   item:<itemId>:testCase|expected|verify|critical
 */
function applyEdits(templateId: string, form: FormData | null) {
  if (!form) return;
  for (const s of sectionsOf(templateId)) {
    const name = form.get(`sec:${s.id}:name`);
    if (typeof name === 'string' && name.trim() && name.trim() !== s.name) {
      run('UPDATE ChecklistSection SET name = ? WHERE id = ?', name.trim(), s.id);
    }
    for (const it of itemsOf(s.id)) {
      const tc = form.get(`item:${it.id}:testCase`);
      if (typeof tc !== 'string') continue; // เคสนี้ไม่ได้อยู่ในฟอร์ม
      run(
        'UPDATE ChecklistItem SET testCase = ?, expected = ?, verify = ?, critical = ? WHERE id = ?',
        tc.trim() || it.testCase,
        String(form.get(`item:${it.id}:expected`) ?? ''),
        String(form.get(`item:${it.id}:verify`) ?? ''),
        form.get(`item:${it.id}:critical`) ? 1 : 0,
        it.id
      );
    }
  }
}

export async function saveAll(templateId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  revalidatePath(`/checklists/${templateId}`);
  redirect(`/checklists/${templateId}?saved=1`);
}

/* ปุ่มย่อยทุกปุ่มบันทึกสิ่งที่แก้ค้างไว้ก่อนเสมอ จะได้ไม่มีอะไรหาย */

export async function addSection(templateId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  const name = String(form.get('newSectionName') ?? '').trim();
  if (name) {
    const max = get<{ n: number | null }>(
      'SELECT MAX(sortOrder) AS n FROM ChecklistSection WHERE templateId = ?',
      templateId
    );
    run(
      'INSERT INTO ChecklistSection (id, templateId, name, sortOrder) VALUES (?,?,?,?)',
      newId('sec'),
      templateId,
      name,
      (max?.n ?? 0) + 1
    );
  }
  revalidatePath(`/checklists/${templateId}`);
}

export async function deleteSection(templateId: string, sectionId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  run('DELETE FROM ChecklistSection WHERE id = ?', sectionId);
  revalidatePath(`/checklists/${templateId}`);
}

export async function addItem(templateId: string, sectionId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  const testCase = String(form.get(`new:${sectionId}:testCase`) ?? '').trim();
  if (testCase) {
    const max = get<{ n: number | null }>(
      'SELECT MAX(sortOrder) AS n FROM ChecklistItem WHERE sectionId = ?',
      sectionId
    );
    run(
      `INSERT INTO ChecklistItem (id, sectionId, itemKey, testCase, expected, verify, critical, sortOrder)
       VALUES (?,?,?,?,?,?,?,?)`,
      newId('itm'),
      sectionId,
      newId('key'), // รหัสถาวรของเคส สร้างครั้งเดียวแล้วสืบต่อไปทุกเวอร์ชัน
      testCase,
      String(form.get(`new:${sectionId}:expected`) ?? ''),
      String(form.get(`new:${sectionId}:verify`) ?? ''),
      1,
      (max?.n ?? 0) + 1
    );
  }
  revalidatePath(`/checklists/${templateId}`);
}

export async function deleteItem(templateId: string, itemId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  run('DELETE FROM ChecklistItem WHERE id = ?', itemId);
  revalidatePath(`/checklists/${templateId}`);
}

/** เลื่อนเคสขึ้น/ลงหนึ่งตำแหน่งในกลุ่มเดียวกัน */
export async function moveItem(templateId: string, itemId: string, dir: 'up' | 'down', form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  applyEdits(templateId, form);
  const me = get<{ sectionId: string; sortOrder: number }>(
    'SELECT sectionId, sortOrder FROM ChecklistItem WHERE id = ?',
    itemId
  );
  if (!me) return;
  const items = itemsOf(me.sectionId);
  const idx = items.findIndex((i) => i.id === itemId);
  const swapWith = dir === 'up' ? items[idx - 1] : items[idx + 1];
  if (!swapWith) return;
  // ให้ลำดับเป็นเลขเรียงเสมอ แล้วสลับสองตัว
  items.forEach((i, n) => run('UPDATE ChecklistItem SET sortOrder = ? WHERE id = ?', n, i.id));
  const a = idx, b = dir === 'up' ? idx - 1 : idx + 1;
  run('UPDATE ChecklistItem SET sortOrder = ? WHERE id = ?', b, items[a].id);
  run('UPDATE ChecklistItem SET sortOrder = ? WHERE id = ?', a, items[b].id);
  revalidatePath(`/checklists/${templateId}`);
}

export async function discardDraft(templateId: string) {
  const user = await requireRole('ADMIN');
  const t = assertDraft(templateId);
  const model = get<{ code: string }>('SELECT code FROM ChargerModel WHERE id = ?', t.modelId)!;
  run('DELETE FROM ChecklistTemplate WHERE id = ?', templateId);
  audit(user.id, 'ทิ้งร่าง checklist', templateId, `v${t.version}`);
  redirect(`/models/${model.code}/checklist`);
}
