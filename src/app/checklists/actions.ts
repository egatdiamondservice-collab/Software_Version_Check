'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { get, run, newId, now } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { cloneTemplate, sectionsOf, templateById } from '@/lib/queries';

/** ห้ามแก้ template ที่เผยแพร่แล้ว — ต้อง clone เป็นเวอร์ชันใหม่ก่อนเสมอ */
function assertDraft(templateId: string) {
  const t = templateById(templateId);
  if (!t) throw new Error('ไม่พบ checklist นี้');
  if (t.status !== 'DRAFT') {
    throw new Error('แก้ checklist ที่เผยแพร่แล้วไม่ได้ — กด "สร้างร่างเวอร์ชันใหม่" ก่อน');
  }
  return t;
}

export async function createDraftFrom(templateId: string) {
  const user = await requireRole('ADMIN');
  const t = templateById(templateId);
  if (!t) throw new Error('ไม่พบ checklist นี้');
  const existingDraft = get<{ id: string }>(
    "SELECT id FROM ChecklistTemplate WHERE modelId = ? AND status = 'DRAFT' ORDER BY version DESC LIMIT 1",
    t.modelId
  );
  if (existingDraft) redirect(`/checklists/${existingDraft.id}`);
  const newId_ = cloneTemplate(templateId);
  audit(user.id, 'สร้างร่าง checklist ใหม่', newId_, `คัดลอกจาก v${t.version}`);
  redirect(`/checklists/${newId_}`);
}

export async function publishTemplate(templateId: string) {
  const user = await requireRole('ADMIN');
  const t = assertDraft(templateId);
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
  revalidatePath(`/checklists/${templateId}`);
}

export async function addSection(templateId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  const name = String(form.get('name') ?? '').trim();
  if (!name) return;
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
  revalidatePath(`/checklists/${templateId}`);
}

export async function renameSection(templateId: string, sectionId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  const name = String(form.get('name') ?? '').trim();
  if (name) run('UPDATE ChecklistSection SET name = ? WHERE id = ?', name, sectionId);
  revalidatePath(`/checklists/${templateId}`);
}

export async function deleteSection(templateId: string, sectionId: string) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  run('DELETE FROM ChecklistSection WHERE id = ?', sectionId);
  revalidatePath(`/checklists/${templateId}`);
}

export async function addItem(templateId: string, sectionId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  const testCase = String(form.get('testCase') ?? '').trim();
  if (!testCase) return;
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
    String(form.get('expected') ?? ''),
    String(form.get('verify') ?? ''),
    form.get('critical') ? 1 : 0,
    (max?.n ?? 0) + 1
  );
  revalidatePath(`/checklists/${templateId}`);
}

export async function updateItem(templateId: string, itemId: string, form: FormData) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  run(
    'UPDATE ChecklistItem SET testCase = ?, expected = ?, verify = ?, critical = ? WHERE id = ?',
    String(form.get('testCase') ?? ''),
    String(form.get('expected') ?? ''),
    String(form.get('verify') ?? ''),
    form.get('critical') ? 1 : 0,
    itemId
  );
  revalidatePath(`/checklists/${templateId}`);
}

export async function deleteItem(templateId: string, itemId: string) {
  await requireRole('ADMIN');
  assertDraft(templateId);
  run('DELETE FROM ChecklistItem WHERE id = ?', itemId);
  revalidatePath(`/checklists/${templateId}`);
}

export async function createModel(form: FormData) {
  const user = await requireRole('ADMIN');
  const code = String(form.get('code') ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_');
  const name = String(form.get('name') ?? '').trim();
  if (!code || !name) return;
  if (get('SELECT id FROM ChargerModel WHERE code = ?', code)) return;

  const modelId = newId('mdl');
  run(
    'INSERT INTO ChargerModel (id, code, name, note, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
    modelId,
    code,
    name,
    String(form.get('note') ?? ''),
    99,
    now()
  );
  const tplId = newId('tpl');
  run(
    'INSERT INTO ChecklistTemplate (id, modelId, version, status, createdAt) VALUES (?,?,?,?,?)',
    tplId,
    modelId,
    1,
    'DRAFT',
    now()
  );
  audit(user.id, 'เพิ่มรุ่นตู้', name, code);
  redirect(`/checklists/${tplId}`);
}

export async function copyChecklistFromModel(targetTemplateId: string, sourceTemplateId: string) {
  await requireRole('ADMIN');
  const target = assertDraft(targetTemplateId);
  if (sectionsOf(targetTemplateId).length > 0) {
    throw new Error('คัดลอกได้เฉพาะ checklist ที่ยังว่างอยู่');
  }
  // คัดลอกโครงมาแต่ออก itemKey ใหม่ เพราะเป็นเคสของรุ่นอื่น ไม่ใช่เคสเดียวกัน
  for (const s of sectionsOf(sourceTemplateId)) {
    const secId = newId('sec');
    run(
      'INSERT INTO ChecklistSection (id, templateId, name, sortOrder) VALUES (?,?,?,?)',
      secId,
      target.id,
      s.name,
      s.sortOrder
    );
    const items = get<{ c: number }>('SELECT COUNT(*) c FROM ChecklistItem WHERE sectionId = ?', s.id);
    void items;
    for (const i of (await import('@/lib/queries')).itemsOf(s.id)) {
      run(
        `INSERT INTO ChecklistItem (id, sectionId, itemKey, testCase, expected, verify, critical, sortOrder)
         VALUES (?,?,?,?,?,?,?,?)`,
        newId('itm'),
        secId,
        newId('key'),
        i.testCase,
        i.expected,
        i.verify,
        i.critical,
        i.sortOrder
      );
    }
  }
  revalidatePath(`/checklists/${targetTemplateId}`);
}
