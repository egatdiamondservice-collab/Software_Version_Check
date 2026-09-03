/**
 * ตรวจสาเหตุที่ FlowBook เปิดไม่ขึ้น
 *   node scripts/doctor.mjs
 *
 * ตรวจทีละอย่างตามลำดับที่มักพังจริงบนเซิร์ฟเวอร์ Windows
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

let problems = 0;
const ok = (m, extra = '') => console.log(`  [ ผ่าน ]  ${m}${extra ? '  — ' + extra : ''}`);
const bad = (m, how) => {
  problems++;
  console.log(`  [ ปัญหา ] ${m}`);
  console.log(`            วิธีแก้: ${how}`);
};

console.log('\nตรวจสภาพ FlowBook');
console.log('='.repeat(66));
console.log(`โฟลเดอร์ที่กำลังทำงานอยู่ (cwd): ${process.cwd()}\n`);

/* 1. Node ------------------------------------------------------------------ */
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj > 22 || (maj === 22 && min >= 5)) ok('Node เวอร์ชันใช้ได้', 'v' + process.versions.node);
else
  bad(
    `Node เก่าเกินไป (v${process.versions.node}) FlowBook ต้องการ 22.5 ขึ้นไป`,
    'ติดตั้ง Node.js 22 LTS หรือใหม่กว่าจาก nodejs.org แล้วรีสตาร์ต service'
  );

/* 2. node:sqlite ----------------------------------------------------------- */
let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
  ok('เรียกใช้ node:sqlite ได้');
} catch (e) {
  bad(
    'เรียกใช้ node:sqlite ไม่ได้ — ' + e.message,
    maj === 22 && min < 13
      ? 'Node 22.5–22.12 ต้องเติม --experimental-sqlite ทางที่ดีกว่าคืออัปเป็น Node 22.13+ หรือ 24 LTS'
      : 'อัปเกรด Node เป็น 22 LTS ตัวล่าสุด'
  );
}

/* 3. cwd ถูกที่ไหม --------------------------------------------------------- */
if (existsSync(path.join(process.cwd(), 'package.json'))) {
  ok('รันอยู่ในโฟลเดอร์โปรเจกต์ถูกแล้ว');
} else {
  bad(
    'ไม่ได้รันอยู่ในโฟลเดอร์โปรเจกต์ (ไม่เจอ package.json)',
    'ถ้าตั้งเป็น service ต้องกำหนด Startup directory ให้ชี้มาที่โฟลเดอร์ flowbook ' +
      '(NSSM: แท็บ Application ช่อง "Startup directory") ไม่งั้นมันจะไปสร้างไฟล์ใน C:\\Windows\\System32 แล้วโดนปฏิเสธสิทธิ์'
  );
}

/* 4. .env ------------------------------------------------------------------ */
const envPath = path.join(process.cwd(), '.env');
const env = {};
if (!existsSync(envPath)) {
  bad('ไม่มีไฟล์ .env', 'สั่ง  npm run seed  — มันจะสร้าง .env พร้อมสุ่ม SESSION_SECRET ให้เอง');
} else {
  ok('มีไฟล์ .env');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const secret = process.env.SESSION_SECRET || env.SESSION_SECRET || '';
if (!secret) {
  bad(
    'ยังไม่ได้ตั้ง SESSION_SECRET',
    'ลบไฟล์ .env ทิ้งแล้วสั่ง  npm run seed  เพื่อให้สร้างใหม่พร้อมสุ่มค่าให้ หรือใส่เองด้วย  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
  );
} else if (secret.length < 32) {
  bad(`SESSION_SECRET สั้นเกินไป (${secret.length} ตัว ต้องอย่างน้อย 32)`, 'สุ่มค่าใหม่ให้ยาวกว่านี้');
} else if (secret.startsWith('change-me')) {
  bad('SESSION_SECRET ยังเป็นค่าตัวอย่างที่แจกมา', 'เปลี่ยนเป็นค่าสุ่มของคุณเอง');
} else {
  ok('SESSION_SECRET ใช้ได้', `${secret.length} ตัวอักษร`);
}

const cookieSecure = (process.env.COOKIE_SECURE || env.COOKIE_SECURE || 'false') === 'true';
if (cookieSecure)
  console.log(
    '  [ เตือน ] COOKIE_SECURE=true — ใช้ได้เฉพาะตอนเปิดผ่าน https\n' +
      '            ถ้ายังเข้าผ่าน http://<ip>:3000 อยู่ จะล็อกอินไม่ติดแบบไม่มี error ให้ตั้งเป็น false'
  );
else ok('COOKIE_SECURE=false เหมาะกับการเข้าผ่าน http');

/* 5. เขียนไฟล์ลง data ได้ไหม ------------------------------------------------ */
const rawDb = process.env.DATABASE_FILE || env.DATABASE_FILE || './data/flowbook.db';
const dbFile = path.isAbsolute(rawDb) ? rawDb : path.join(process.cwd(), rawDb);
try {
  mkdirSync(path.dirname(dbFile), { recursive: true });
  const probe = path.join(path.dirname(dbFile), '.write-test');
  writeFileSync(probe, 'x');
  unlinkSync(probe);
  ok('เขียนไฟล์ลงโฟลเดอร์ data ได้', path.dirname(dbFile));
} catch (e) {
  bad(
    `เขียนลงโฟลเดอร์ data ไม่ได้ (${path.dirname(dbFile)}) — ${e.code || e.message}`,
    'ให้สิทธิ์เขียนกับบัญชีที่รัน service หรือย้ายโปรเจกต์ออกจาก C:\\Program Files ' +
      'ไปไว้ที่ C:\\flowbook แทน'
  );
}

/* 6. ฐานข้อมูลเปิดได้และมีข้อมูลตั้งต้นไหม ---------------------------------- */
if (DatabaseSync && !existsSync(dbFile)) {
  bad('ยังไม่มีไฟล์ฐานข้อมูล', 'สั่ง  npm run seed');
} else if (DatabaseSync) {
  try {
    const db = new DatabaseSync(dbFile);
    const t = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('User','ChargerModel')")
      .all();
    if (t.length < 2) {
      bad('ฐานข้อมูลยังไม่มีตาราง', 'สั่ง  npm run seed');
    } else {
      const u = db.prepare('SELECT COUNT(*) AS n FROM User').get();
      const m = db.prepare('SELECT COUNT(*) AS n FROM ChargerModel').get();
      if (u.n === 0) bad('ยังไม่มีผู้ใช้ในระบบ', 'สั่ง  npm run seed');
      else ok('ฐานข้อมูลเปิดได้', `ผู้ใช้ ${u.n} คน · รุ่นตู้ ${m.n} รุ่น`);
    }
    db.close();
  } catch (e) {
    bad(
      `เปิดฐานข้อมูลไม่ได้ — ${e.message}`,
      /locked|busy/i.test(e.message)
        ? 'มีอีกโปรเซสเปิดไฟล์นี้ค้างอยู่ ปิดหน้าต่างที่รัน npm start ค้างไว้ (หรือหยุด service) แล้วลองใหม่'
        : 'ลบไฟล์ใน data\\ แล้วสั่ง npm run seed ใหม่'
    );
  }
}

/* 7. build แล้วหรือยัง ------------------------------------------------------ */
if (existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'))) ok('มีผลลัพธ์จากการ build แล้ว');
else bad('ยังไม่ได้ build', 'สั่ง  npm run build  ก่อน npm start');

/* 8. seed-data ------------------------------------------------------------- */
if (existsSync(path.join(process.cwd(), 'seed-data', 'checklist-seed.json'))) ok('มีไฟล์ checklist ตั้งต้น');
else console.log('  [ เตือน ] ไม่มี seed-data/checklist-seed.json — จะไม่มี checklist ตั้งต้นให้');

console.log('='.repeat(66));
console.log(problems === 0 ? '\nไม่พบปัญหา — ถ้ายังเปิดไม่ขึ้น ส่ง stack trace จาก npm start มาดูครับ\n' : `\nพบ ${problems} จุดที่ต้องแก้ตามด้านบน\n`);
process.exit(problems ? 1 : 0);
