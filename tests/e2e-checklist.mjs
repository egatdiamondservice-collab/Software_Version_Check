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

// เมนู Checklist ถูกยุบไปอยู่ในหน้ารุ่นแล้ว
check('เมนูบนไม่มี Checklist แยกแล้ว', (await p.locator('header').getByRole('link', { name: 'Checklist' }).count()) === 0);
await p.goto(BASE + '/checklists');
check('ลิงก์เก่า /checklists พากลับหน้าแรก', new URL(p.url()).pathname === '/');

// แท็บ checklist ของรุ่น
await p.goto(BASE + '/models/VECTOR_DCL/checklist');
const before = await p.locator('body').innerText();
check('แท็บ checklist แสดงตัวที่ใช้อยู่', /ใช้อยู่ v1/.test(before));
check('checklist ตั้งต้นมี 7 กลุ่ม 38 เคส', before.includes('7 กลุ่ม · 38 เคส'), before.match(/\d+ กลุ่ม · \d+ เคส/)?.[0]);
check('มีแท็บ เวอร์ชัน / Checklist / สรุปการทดสอบ', (await p.locator('nav[aria-label="ส่วนของรุ่น"] a').count()) === 3);

// กด "แก้ไข" ปุ่มเดียว → ได้ร่าง v2 ทันที
await p.getByRole('button', { name: 'แก้ไข checklist' }).click();
await p.waitForURL(/\/checklists\/tpl_/);
check('กดแก้ไขปุ่มเดียวแล้วเข้าหน้าแก้ร่าง v2', (await p.locator('h1').innerText()).includes('ร่าง v2'), await p.locator('h1').innerText());
check('ร่างใหม่คัดลอกเคสมาครบ', (await p.locator('body').innerText()).includes('7 กลุ่ม · 38 เคส'));

// แก้ข้อความ 2 เคสในฟอร์มเดียว แล้วบันทึกครั้งเดียว
const tcs = p.locator('textarea[name$=":testCase"]');
await tcs.nth(0).fill('เคสที่หนึ่ง (แก้แล้ว)');
await tcs.nth(1).fill('เคสที่สอง (แก้แล้ว)');
await p.getByRole('button', { name: 'บันทึกทั้งหมด' }).click();
await p.waitForURL(/saved=1/);
const v0 = await p.locator('textarea[name$=":testCase"]').nth(0).inputValue();
const v1 = await p.locator('textarea[name$=":testCase"]').nth(1).inputValue();
check('แก้หลายเคสแล้วบันทึกครั้งเดียวได้', v0 === 'เคสที่หนึ่ง (แก้แล้ว)' && v1 === 'เคสที่สอง (แก้แล้ว)', `${v0} | ${v1}`);

// เพิ่มกลุ่มใหม่ + เพิ่มเคส (ปุ่มย่อยต้องไม่ทำให้ที่แก้ไว้หาย)
await tcs.nth(2).fill('เคสที่สาม (แก้ค้างไว้)');
await p.locator('input[name=newSectionName]').fill('OCPP / การเชื่อมต่อ');
await p.getByRole('button', { name: 'เพิ่มกลุ่ม' }).click();
await p.waitForTimeout(800);
check('เพิ่มกลุ่มใหม่ได้', (await p.locator('input[value="OCPP / การเชื่อมต่อ"]').count()) > 0);
check('สิ่งที่แก้ค้างไว้ไม่หายตอนกดเพิ่มกลุ่ม', (await p.locator('textarea[name$=":testCase"]').nth(2).inputValue()) === 'เคสที่สาม (แก้ค้างไว้)');

const newTc = p.locator('textarea[name^="new:"]').last();
await newTc.fill('ตัดเน็ตระหว่างชาร์จ 1 นาที');
await p.getByRole('button', { name: 'เพิ่มเคส' }).last().click();
await p.waitForTimeout(800);
check('เพิ่มเคสใหม่ในกลุ่มได้', (await p.locator('body').innerText()).includes('8 กลุ่ม · 39 เคส'),
  (await p.locator('body').innerText()).match(/\d+ กลุ่ม · \d+ เคส/)?.[0]);

// เลื่อนลำดับ
const firstBefore = await p.locator('textarea[name$=":testCase"]').nth(0).inputValue();
await p.getByTitle('เลื่อนลง').first().click();
await p.waitForTimeout(700);
const secondAfter = await p.locator('textarea[name$=":testCase"]').nth(1).inputValue();
check('เลื่อนลำดับเคสได้', firstBefore === secondAfter, `${firstBefore} → ตำแหน่ง 2`);

// เผยแพร่ v2 จากหน้าแก้ → กลับไปแท็บ checklist
await p.getByRole('button', { name: /บันทึกและเผยแพร่เป็น v2/ }).click();
await p.waitForURL(/\/models\/VECTOR_DCL\/checklist/);
const afterPub = await p.locator('body').innerText();
check('เผยแพร่ v2 แล้ว', /ใช้อยู่ v2/.test(afterPub));
check('เคสที่แก้ไว้ไปโผล่ในตัวที่ใช้อยู่', afterPub.includes('เคสที่หนึ่ง (แก้แล้ว)'));

// ผลทดสอบเก่ายังอ่านได้และยึด snapshot เดิม (v1)
await p.goto(BASE + '/models/VECTOR_DCL');
await p.locator('a[href^="/releases/rel_"]').first().click();
await p.waitForURL(/\/releases\/rel_/);
await p.locator('a[href^="/runs/run_"]').first().click();
await p.waitForURL(/\/runs\/run_/);
const runText = await p.locator('body').innerText();
check('ผลทดสอบเก่ายังชี้ checklist v1 (snapshot ไม่เพี้ยน)', runText.includes('checklist v1'), runText.match(/checklist v\d/)?.[0]);
check('ผลทดสอบเก่ายังไม่มีเคสใหม่ของ v2 ปนเข้ามา', !runText.includes('ตัดเน็ตระหว่างชาร์จ') && !runText.includes('(แก้แล้ว)'));

// สรุปการทดสอบยังจับคู่เคสเดิมได้ (itemKey สืบต่อ)
await p.goto(BASE + '/models/VECTOR_DCL/summary');
check('สรุปการทดสอบยังอ่านผลเก่าได้หลังออก checklist ใหม่', (await p.locator('body').innerText()).includes('Single Connector'));

await b.close();
console.log(`\nสรุป: ผ่าน ${pass.length} / ไม่ผ่าน ${fail.length}`);
if (fail.length) { fail.forEach(f => console.log('  ✘ ' + f)); process.exit(1); }
