'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { get, run, newId, now } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { itemsOf, sectionsOf } from '@/lib/queries';
import type { ModelRow } from '@/lib/types';

/**
 * เพิ่มรุ่นตู้ใหม่ — วิศวกรทำเองได้ เพราะรุ่นใหม่ออกบ่อยและไม่ควรต้องรอ admin
 *
 * ถ้าเลือกคัดลอก checklist มาจากรุ่นอื่น จะเผยแพร่เป็น v1 ให้ทันที
 * เพราะเนื้อหาผ่านการอนุมัติมาแล้วในรุ่นต้นทาง วิศวกรจะได้เริ่มทดสอบได้เลย
 * ถ้าเริ่มจากศูนย์ จะเป็นร่างรอ admin ใส่เคสและกดเผยแพร่
 */
export async function createModel(form: FormData) {
  const user = await requireRole('ENGINEER');

  const code = String(form.get('code') ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_');
  const name = String(form.get('name') ?? '').trim();
  const note = String(form.get('note') ?? '').trim();
  const hardware = String(form.get('hardware') ?? '').trim();
  const copyFromModelId = String(form.get('copyFrom') ?? '');

  if (!code || !name) redirect('/models/new?error=' + encodeURIComponent('ต้องใส่ทั้งรหัสรุ่นและชื่อที่แสดง'));
  if (get('SELECT id FROM ChargerModel WHERE code = ?', code)) {
    redirect('/models/new?error=' + encodeURIComponent(`มีรหัสรุ่น ${code} อยู่แล้ว`));
  }

  const max = get<{ n: number | null }>('SELECT MAX(sortOrder) AS n FROM ChargerModel');
  const modelId = newId('mdl');
  run(
    'INSERT INTO ChargerModel (id, code, name, note, hardware, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)',
    modelId,
    code,
    name,
    note,
    hardware,
    (max?.n ?? 0) + 1,
    now()
  );

  const sourceTemplateId = copyFromModelId
    ? get<{ id: string }>(
        "SELECT id FROM ChecklistTemplate WHERE modelId = ? AND status = 'PUBLISHED' ORDER BY version DESC LIMIT 1",
        copyFromModelId
      )?.id
    : undefined;

  const tplId = newId('tpl');
  run(
    'INSERT INTO ChecklistTemplate (id, modelId, version, status, createdAt, publishedAt) VALUES (?,?,?,?,?,?)',
    tplId,
    modelId,
    1,
    sourceTemplateId ? 'PUBLISHED' : 'DRAFT',
    now(),
    sourceTemplateId ? now() : null
  );

  let copied = 0;
  if (sourceTemplateId) {
    for (const s of sectionsOf(sourceTemplateId)) {
      const secId = newId('sec');
      run(
        'INSERT INTO ChecklistSection (id, templateId, name, sortOrder) VALUES (?,?,?,?)',
        secId,
        tplId,
        s.name,
        s.sortOrder
      );
      for (const i of itemsOf(s.id)) {
        run(
          `INSERT INTO ChecklistItem (id, sectionId, itemKey, testCase, expected, verify, critical, sortOrder)
           VALUES (?,?,?,?,?,?,?,?)`,
          newId('itm'),
          secId,
          // ออกรหัสใหม่ เพราะเป็นเคสของรุ่นอื่น ไม่ใช่เคสเดียวกันกับต้นทาง
          newId('key'),
          i.testCase,
          i.expected,
          i.verify,
          i.critical,
          i.sortOrder
        );
        copied++;
      }
    }
  }

  audit(user.id, 'เพิ่มรุ่นตู้', name, copied ? `คัดลอก checklist มา ${copied} เคส` : 'checklist ว่าง');
  redirect(`/models/${code}`);
}

export async function updateModel(modelId: string, form: FormData) {
  const user = await requireRole('ENGINEER');
  const model = get<ModelRow>('SELECT * FROM ChargerModel WHERE id = ?', modelId);
  if (!model) throw new Error('ไม่พบรุ่นนี้');

  const name = String(form.get('name') ?? '').trim() || model.name;
  const note = String(form.get('note') ?? '').trim();
  const hardware = String(form.get('hardware') ?? '').trim();

  run(
    'UPDATE ChargerModel SET name = ?, note = ?, hardware = ? WHERE id = ?',
    name,
    note,
    hardware,
    modelId
  );
  audit(user.id, 'แก้ข้อมูลรุ่นตู้', name, hardware ? `ฮาร์ดแวร์: ${hardware}` : '');
  revalidatePath('/models');
  revalidatePath(`/models/${model.code}`);
}
