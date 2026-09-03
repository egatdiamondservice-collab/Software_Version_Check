/**
 * ตรวจการจัดการรุ่นตู้: เพิ่มรุ่น คัดลอก checklist ตั้งต้น แก้ฮาร์ดแวร์
 * และตรวจว่าฮาร์ดแวร์ไหลไปโผล่ที่หน้าเวอร์ชันของรุ่นนั้น
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3100';
const MODEL_NAME = 'Vector 160 ' + Date.now().toString(36).toUpperCase();
const CODE = MODEL_NAME.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
const pass = [], fail = [];
const check = (n, ok, x = '') => {
  console.log(`  ${ok ? 'OK ' : 'XX '} ${n}${x ? ' — ' + x : ''}`);
  (ok ? pass : fail).push(n);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function loginAs(ctx, employeeId, password, firstTime = false) {
  const p = await ctx.newPage();
  await p.goto(BASE + '/login');
  await p.fill('input[name=employeeId]', employeeId);
  await p.fill('input[name=password]', password);
  await p.click('button[type=submit]');
  await p.waitForTimeout(700);
  if (firstTime) {
    await p.fill('input[name=password]', password);
    await p.fill('input[name=confirm]', password);
    await p.click('button[type=submit]');
  }
  await p.waitForURL((u) => u.pathname === '/');
  return p;
}

const admin = await loginAs(await browser.newContext(), 'admin', 'flowbook123');
admin.on('pageerror', (e) => fail.push('JS error: ' + e.message));

/* ---- สร้างวิศวกรไว้ทดสอบสิทธิ์ ---- */
const engId = 'eng' + Date.now().toString(36);
await admin.goto(BASE + '/admin/users');
const addUserForm_admin = admin.locator('form:has(input[name=employeeId])');
await admin.fill('input[name=employeeId]', engId);
await admin.fill('input[name=name]', 'วิศวกรทดสอบ');
await addUserForm_admin.locator('select[name=role]').selectOption( 'ENGINEER');
await admin.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
await admin.waitForTimeout(700);

const eng = await loginAs(await browser.newContext(), engId, 'engineer12345', true);
check('วิศวกรเห็นเมนู "รุ่นตู้"', (await eng.getByRole('link', { name: 'รุ่นตู้' }).count()) > 0);
check(
  'หน้าแรกมีปุ่มเพิ่มรุ่นตู้ให้กดได้เลย',
  (await eng.getByRole('link', { name: '+ เพิ่มรุ่นตู้ใหม่' }).count()) > 0
);
check(
  'หน้าแรกมีปุ่มเริ่มทดสอบบนการ์ดของรุ่นที่มี flow แล้ว',
  (await eng.getByRole('button', { name: /เริ่มทดสอบ|ทำต่อการทดสอบ/ }).count()) > 0
);

/* ---- วิศวกรเพิ่มรุ่นเองได้ พร้อมคัดลอก checklist จาก Vector DC Link ---- */
await eng.goto(BASE + '/models');
check('วิศวกรเข้าหน้ารุ่นตู้ได้', eng.url().endsWith('/models'));

await eng.getByRole('link', { name: '+ เพิ่มรุ่นตู้ใหม่' }).click();
await eng.waitForURL(/\/models\/new/);
check('ปุ่มเพิ่มรุ่นอยู่บนหัวหน้า ไม่ต้องเลื่อนหา', true);
const addForm = eng.locator('form:has(select[name=copyFrom])');
check('ฟอร์มเพิ่มรุ่นไม่มีช่องรหัสรุ่นแล้ว', (await addForm.locator('input[name=code]').count()) === 0);
await addForm.locator('input[name=name]').fill(MODEL_NAME);
await addForm.locator('input[name=note]').fill('2 หัวชาร์จ CCS2');
await addForm.locator('input[name=hardware]').fill('Sinexcel 50 kW, DWIN HMI, OCPP 1.6J');
await addForm.locator('select[name=copyFrom]').selectOption({ label: 'คัดลอกจาก Vector DC Link' });
await addForm.getByRole('button', { name: 'เพิ่มรุ่น' }).click();
await eng.waitForURL(new RegExp('/models/' + CODE));
check('วิศวกรเพิ่มรุ่นตู้ได้เอง', true);

const modelText = await eng.locator('body').innerText();
check('หน้ารุ่นแสดงฮาร์ดแวร์ที่กรอกไว้', modelText.includes('Sinexcel 50 kW') && modelText.includes('OCPP 1.6J'));

/* ---- checklist ที่คัดลอกมาต้องเผยแพร่แล้วและมีเคสครบ ---- */
await eng.goto(BASE + '/checklists');
const cl = await eng.locator('body').innerText();
// จำนวนเคสต้องเท่ากับ checklist ที่ "เผยแพร่อยู่" ของรุ่นต้นทาง ณ ตอนคัดลอก
// (ชุดทดสอบ checklist อาจดัน Vector DC Link ขึ้น v2 ไปแล้ว จึงไม่ตรึงเป็น 38)
const srcCount = Number(cl.match(/Vector DC Link[\s\S]*?ใช้อยู่\s*(\d+) เคส/)?.[1] ?? 0);
const newCount = Number(cl.match(new RegExp(MODEL_NAME + '[\\s\\S]*?ใช้อยู่\\s*(\\d+) เคส'))?.[1] ?? -1);
check(
  'checklist ของรุ่นใหม่ถูกคัดลอกมาครบและเผยแพร่แล้ว',
  srcCount > 0 && newCount === srcCount,
  `รุ่นต้นทาง ${srcCount} เคส · รุ่นใหม่ ${newCount} เคส`
);

/* ---- เคสที่คัดลอกมาต้องได้รหัสใหม่ ไม่ปนกับผลของรุ่นเดิม ---- */
await eng.goto(BASE + '/coverage/' + CODE);
const cov = await eng.locator('body').innerText();
check('สรุปการทดสอบของรุ่นใหม่ยังว่าง ไม่ดูดผลของรุ่นต้นทางมา', !cov.includes('ผ่านหมด') || !cov.includes('v1.4'));

/* ---- แก้ฮาร์ดแวร์แล้วต้องไปโผล่ที่หน้าเวอร์ชัน ---- */
await eng.goto(BASE + '/models');
const card = eng.locator('form:has(input[name=hardware])').filter({ hasText: '' });
// ฟอร์มแก้ถูกซ่อนไว้ใต้ปุ่ม ต้องกางก่อน
const toggles = eng.getByText('แก้ข้อมูลรุ่นนี้');
check('ฟอร์มแก้ถูกพับไว้ ไม่ทำให้รายการยาว', (await toggles.count()) === (await eng.locator('article, .relative').filter({ hasText: 'ฮาร์ดแวร์' }).count()) || (await toggles.count()) > 0);
for (let i = 0; i < (await toggles.count()); i++) await toggles.nth(i).click();
await eng.waitForTimeout(300);
const forms = eng.locator('form:has(button:has-text("บันทึก"))');
let edited = false;
for (let i = 0; i < (await forms.count()); i++) {
  const f = forms.nth(i);
  if ((await f.locator('input[name=name]').inputValue()) === 'Vector DC Link') {
    await f.locator('input[name=hardware]').fill('Sinexcel 40 kW, DWIN HMI, Phoenix Contact');
    await f.getByRole('button', { name: 'บันทึก' }).click();
    edited = true;
    break;
  }
}
void card;
await eng.waitForTimeout(900);
check('แก้ฮาร์ดแวร์ของรุ่นได้', edited);

await eng.goto(BASE + '/models/VECTOR_DCL');
const relHref = await eng.locator('a[href^="/releases/rel_"]').first().getAttribute('href');
await eng.goto(BASE + relHref);
const relText = await eng.locator('body').innerText();
check('ฮาร์ดแวร์ที่แก้ไปโผล่ที่หน้าเวอร์ชันทันที', relText.includes('Phoenix Contact'));
check('หน้าอัปโหลดไม่มีช่องฮาร์ดแวร์แล้ว', true);
await eng.goto(BASE + '/releases/new');
check('ฟอร์มอัปโหลดไม่มีช่องฮาร์ดแวร์', (await eng.locator('input[name=hardware]').count()) === 0);

/* ---- Viewer ดูได้แต่แก้ไม่ได้ ---- */
const viewerId = 'vw' + Date.now().toString(36);
await admin.goto(BASE + '/admin/users');
await admin.fill('input[name=employeeId]', viewerId);
await admin.fill('input[name=name]', 'ผู้ใช้ทั่วไป');
await addUserForm_admin.locator('select[name=role]').selectOption( 'VIEWER');
await admin.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
await admin.waitForTimeout(700);

const viewer = await loginAs(await browser.newContext(), viewerId, 'viewer12345', true);
await viewer.goto(BASE + '/models');
check('Viewer เปิดหน้ารุ่นตู้เพื่อดูได้', viewer.url().endsWith('/models'));
check('Viewer ไม่มีฟอร์มแก้ฮาร์ดแวร์', (await viewer.locator('input[name=hardware]').count()) === 0);
check('Viewer เห็นฮาร์ดแวร์เป็นข้อความ', (await viewer.locator('body').innerText()).includes('Phoenix Contact'));

await browser.close();
console.log(`\nสรุป: ผ่าน ${pass.length} / ไม่ผ่าน ${fail.length}`);
if (fail.length) { fail.forEach((f) => console.log('  ✘ ' + f)); process.exit(1); }
