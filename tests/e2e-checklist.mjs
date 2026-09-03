import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3100';
const pass = [], fail = [];
const check = (n, ok, x='') => { console.log(`  ${ok?'OK ':'XX '} ${n}${x?' — '+x:''}`); (ok?pass:fail).push(n); };

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await (await b.newContext()).newPage();
p.on('pageerror', e => fail.push('JS error: ' + e.message));

await p.goto(BASE + '/login');
await p.fill('input[name=employeeId]', 'admin');
await p.fill('input[name=password]', 'flowbook123');
await p.click('button[type=submit]');
await p.waitForURL(u => u.pathname === '/');

await p.goto(BASE + '/checklists');
check('หน้า Checklist แสดงทั้งสองรุ่น', (await p.getByText('Vector DC Link').count()) > 0);

// เปิด checklist ที่เผยแพร่แล้วของ DC Link
await p.getByText('Vector DC Link').click().catch(()=>{});
const links = p.locator('a[href^="/checklists/tpl_"]');
const n = await links.count();
let target = null;
for (let i = 0; i < n; i++) {
  const href = await links.nth(i).getAttribute('href');
  await p.goto(BASE + href);
  if ((await p.getByText('Vector DC Link').count()) > 0) { target = href; break; }
  await p.goto(BASE + '/checklists');
}
check('เปิด checklist ของ Vector DC Link ได้', !!target);

// เผยแพร่แล้วต้องแก้ไม่ได้
check('checklist ที่เผยแพร่แล้วถูกล็อก', (await p.getByText('เผยแพร่แล้ว แก้ไม่ได้').count()) > 0);
const before = await p.locator('body').innerText();
check('checklist ตั้งต้นมี 7 กลุ่ม 38 เคส', before.includes('7 กลุ่ม · 38 เคส'), before.match(/\d+ กลุ่ม · \d+ เคส/)?.[0]);

// สร้างร่างเวอร์ชันใหม่
const beforeUrl = p.url();
await p.getByRole('button', { name: 'สร้างร่างเวอร์ชันใหม่' }).click();
await p.waitForURL((u) => u.toString() !== beforeUrl && /\/checklists\/tpl_/.test(u.toString()));
check('สร้างร่าง v2 ได้', (await p.locator('h1').innerText()) === 'Checklist v2', await p.locator('h1').innerText());
check('ร่างใหม่คัดลอกเคสมาครบ', (await p.locator('body').innerText()).includes('7 กลุ่ม · 38 เคส'));

// เพิ่มกลุ่มใหม่ + เพิ่มเคส
await p.locator('input[name=name]').last().fill('OCPP / การเชื่อมต่อ');
await p.getByRole('button', { name: 'เพิ่มกลุ่ม' }).click();
await p.waitForTimeout(800);
check('เพิ่มกลุ่มใหม่ได้', (await p.locator('input[value="OCPP / การเชื่อมต่อ"]').count()) > 0);

const addForms = p.locator('form:has(textarea[name=testCase])');
await addForms.last().locator('textarea[name=testCase]').fill('ตัดเน็ตระหว่างชาร์จ 1 นาที');
await addForms.last().locator('input[name=expected]').fill('ชาร์จต่อได้ และส่ง MeterValues ย้อนหลังเมื่อกลับมา');
await addForms.last().getByRole('button', { name: 'เพิ่มเคส' }).click();
await p.waitForTimeout(800);
check('เพิ่มเคสใหม่ในกลุ่มได้', (await p.locator('body').innerText()).includes('8 กลุ่ม · 39 เคส'),
  (await p.locator('body').innerText()).match(/\d+ กลุ่ม · \d+ เคส/)?.[0]);

// เผยแพร่ v2
await p.getByRole('button', { name: /เผยแพร่เป็น v2/ }).click();
await p.waitForTimeout(900);
await p.reload();
check('เผยแพร่ v2 แล้ว', (await p.getByText('ใช้อยู่').count()) > 0);

// ผลทดสอบเก่ายังอ่านได้และยึด snapshot เดิม (v1)
await p.goto(BASE + '/');
await p.getByRole('link', { name: 'ประวัติเวอร์ชัน (1)' }).first().click().catch(async () => {
  await p.goto(BASE + '/models/VECTOR_DCL');
});
await p.goto(BASE + '/models/VECTOR_DCL');
const relLink = p.locator('a[href^="/releases/rel_"]').first();
await relLink.click();
await p.waitForURL(/\/releases\/rel_/);
const runLink = p.locator('a[href^="/runs/run_"]').first();
await runLink.click();
await p.waitForURL(/\/runs\/run_/);
const runText = await p.locator('body').innerText();
check('ผลทดสอบเก่ายังชี้ checklist v1 (snapshot ไม่เพี้ยน)', runText.includes('checklist v1'),
  runText.match(/checklist v\d/)?.[0]);
check('ผลทดสอบเก่ายังไม่มีเคสใหม่ของ v2 ปนเข้ามา', !runText.includes('ตัดเน็ตระหว่างชาร์จ'));

// สรุปการทดสอบยังจับคู่เคสเดิมได้ (itemKey สืบต่อ)
await p.goto(BASE + '/coverage/VECTOR_DCL');
const cov = await p.locator('body').innerText();
check('สรุปการทดสอบยังอ่านผลเก่าได้หลังออก checklist ใหม่', cov.includes('Single Connector'));

await b.close();
console.log(`\nสรุป: ผ่าน ${pass.length} / ไม่ผ่าน ${fail.length}`);
if (fail.length) { fail.forEach(f => console.log('  ✘ ' + f)); process.exit(1); }
