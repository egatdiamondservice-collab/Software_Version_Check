/**
 * เตรียมฐานข้อมูลครั้งแรก — รันซ้ำได้ ไม่ลบของเดิม
 *   node scripts/seed.mjs
 *
 * ใส่ข้อมูลตั้งต้น:
 *   - ผู้ใช้ admin
 *   - รุ่น Vector และ Vector DC Link
 *   - checklist v1 ของทั้งสองรุ่น แปลงตรงมาจาก Flow_Test_CheckList.xlsx
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { SCHEMA } from './schema.mjs';

// อ่าน .env แบบง่าย ๆ เพื่อไม่ต้องเพิ่ม dependency
function loadEnv() {
  const file = path.join(process.cwd(), '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv();

const dbPath = (() => {
  const raw = process.env.DATABASE_FILE || './data/flowbook.db';
  const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
})();

const db = new DatabaseSync(dbPath);
db.exec(SCHEMA);

const now = () => new Date().toISOString();
const newId = (p) => {
  const s = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) out += s[Math.floor(Math.random() * s.length)];
  return `${p}_${out}`;
};
const one = (sql, ...a) => db.prepare(sql).get(...a);
const exec = (sql, ...a) => db.prepare(sql).run(...a);

/* ---------------------------------- admin --------------------------------- */

const adminId = process.env.SEED_ADMIN_ID || 'admin';
const adminPw = process.env.SEED_ADMIN_PASSWORD || 'flowbook123';

if (!one('SELECT id FROM User WHERE employeeId = ?', adminId)) {
  exec(
    'INSERT INTO User (id, employeeId, name, role, passwordHash, active, createdAt) VALUES (?,?,?,?,?,?,?)',
    newId('usr'),
    adminId,
    'ผู้ดูแลระบบ',
    'ADMIN',
    bcrypt.hashSync(adminPw, 10),
    1,
    now()
  );
  console.log(`สร้างผู้ใช้ admin แล้ว — รหัสพนักงาน "${adminId}" รหัสผ่าน "${adminPw}"`);
  console.log('  >> เปลี่ยนรหัสผ่านทันทีหลังล็อกอินครั้งแรก');
} else {
  console.log('มีผู้ใช้ admin อยู่แล้ว ข้ามไป');
}

/* -------------------------- รุ่นตู้ + checklist v1 -------------------------- */

const seedFile = path.join(process.cwd(), 'seed-data', 'checklist-seed.json');
if (!existsSync(seedFile)) {
  console.log('ไม่พบ seed-data/checklist-seed.json — ข้ามการใส่ checklist ตั้งต้น');
} else {
  const seed = JSON.parse(readFileSync(seedFile, 'utf8'));
  let order = 1;

  for (const entry of seed) {
    let model = one('SELECT * FROM ChargerModel WHERE code = ?', entry.model.code);
    if (!model) {
      const id = newId('mdl');
      exec(
        'INSERT INTO ChargerModel (id, code, name, note, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
        id,
        entry.model.code,
        entry.model.name,
        '',
        order++,
        now()
      );
      model = { id, code: entry.model.code, name: entry.model.name };
      console.log(`เพิ่มรุ่น ${entry.model.name}`);
    }

    if (one('SELECT id FROM ChecklistTemplate WHERE modelId = ?', model.id)) {
      console.log(`  ${entry.model.name} มี checklist อยู่แล้ว ข้ามไป`);
      continue;
    }

    const tplId = newId('tpl');
    exec(
      'INSERT INTO ChecklistTemplate (id, modelId, version, status, createdAt, publishedAt) VALUES (?,?,?,?,?,?)',
      tplId,
      model.id,
      1,
      'PUBLISHED',
      now(),
      now()
    );

    let s = 0;
    let count = 0;
    for (const section of entry.sections) {
      const secId = newId('sec');
      exec(
        'INSERT INTO ChecklistSection (id, templateId, name, sortOrder) VALUES (?,?,?,?)',
        secId,
        tplId,
        section.name,
        s++
      );
      let i = 0;
      for (const item of section.items) {
        exec(
          `INSERT INTO ChecklistItem (id, sectionId, itemKey, testCase, expected, verify, critical, sortOrder)
           VALUES (?,?,?,?,?,?,?,?)`,
          newId('itm'),
          secId,
          newId('key'),
          item.testCase,
          item.expected,
          item.verify,
          1,
          i++
        );
        count++;
      }
    }
    console.log(`  ใส่ checklist v1 ของ ${entry.model.name}: ${entry.sections.length} กลุ่ม ${count} เคส`);
  }
}

console.log(`\nเสร็จแล้ว — ฐานข้อมูลอยู่ที่ ${dbPath}`);
db.close();
