import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3100';
const DIR = process.env.FIXTURES || './tests/fixtures';
const pass = [];
const fail = [];
const VER = 'v1.4-' + Date.now().toString(36);
const VIEWER_ID = 'v' + Date.now().toString(36);
const check = (name, ok, extra = '') => { console.log(`${ok ? '  OK ' : '  XX '} ${name}${extra ? ' — ' + extra : ''}`); (ok ? pass : fail).push(name + (extra ? ` — ${extra}` : '')); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } }); // จำลองมือถือหน้าตู้
const page = await ctx.newPage();
page.on('pageerror', (e) => fail.push('JS error: ' + e.message));

// 1) ล็อกอิน
await page.goto(BASE + '/login');
await page.fill('input[name=employeeId]', 'admin');
await page.fill('input[name=password]', 'flowbook123');
await page.click('button[type=submit]');
await page.waitForURL((u) => u.pathname === '/');
check('ล็อกอินด้วยรหัสพนักงาน', true);
check('หน้าแรกแสดงรุ่นที่ seed มา', (await page.getByText('Vector DC Link').count()) > 0);

// 2) อัปโหลดชุด 2 ไฟล์
await page.goto(BASE + '/releases/new');
await page.selectOption('select[name=modelId]', { label: 'Vector DC Link' });
await page.fill('input[name=version]', VER);
await page.setInputFiles('input[type=file]', [
  `${DIR}/vector_dclink_master_v1.4.json`,
  `${DIR}/vector_dclink_follower_v1.4.json`,
]);
await page.fill('input[name=slots]', 'master,follower');
await page.fill('textarea[name=changelog]', 'แก้ logic แบ่ง power ตอน 3 หัวพร้อมกัน');
await page.fill('input[name=hardware]', 'Sinexcel 40 kW, DWIN HMI');
await page.getByRole('button', { name: 'บันทึกเป็นร่าง' }).click();
await page.waitForURL(/\/releases\/rel_/);
const releaseUrl = page.url();
check('อัปโหลด 2 ไฟล์เป็นชุดเดียว', true);
check('แสดงชื่อ slot master/follower', (await page.getByText('follower').count()) > 0);
check('นับ node ในไฟล์ได้', (await page.getByText(/13 node/).count()) > 0, 'master = 1 tab + 12 function');

// 3) ยังปล่อยใช้งานไม่ได้เพราะไม่มีผลทดสอบ
const releasedBtn = page.getByRole('button', { name: 'ปล่อยใช้งาน' });
check('ปุ่มปล่อยใช้งานถูกล็อกไว้ก่อนมีผลทดสอบ', await releasedBtn.isDisabled());

// 4) ไฟล์ที่ไม่ใช่ flow ต้องถูกปฏิเสธ
await page.goto(BASE + '/releases/new');
await page.selectOption('select[name=modelId]', { label: 'Vector DC Link' });
await page.fill('input[name=version]', VER + '-bad');
await page.setInputFiles('input[type=file]', [`${DIR}/not_a_flow.json`]);
await page.getByRole('button', { name: 'บันทึกเป็นร่าง' }).click();
await page.waitForURL(/error=/);
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(500);
{
  const txt = await page.locator('body').innerText();
  check('ปฏิเสธไฟล์ที่ไม่ใช่ Node-RED flow', txt.includes('ไม่ใช่ Node-RED flow'), txt.replace(/\n+/g, ' | ').slice(0, 200));
}

// 5) เริ่มทดสอบ
await page.goto(releaseUrl);
await page.getByRole('button', { name: /เริ่ม \/ ทำต่อการทดสอบ/ }).click();
await page.waitForURL(/\/runs\/run_/);
const runUrl = page.url();
check('เริ่ม test run และ snapshot checklist', true);

// กลุ่มแรกต้องกางอยู่แล้ว และมี 7 กลุ่ม
const sectionBtns = page.locator('button[aria-expanded]');
check('มี 7 กลุ่มทดสอบตามไฟล์จริง', (await sectionBtns.count()) === 7, `เจอ ${await sectionBtns.count()}`);

// 6) ติ๊กเคสแรก แล้วรีโหลดดูว่าค้างไว้จริง
await page.getByRole('button', { name: 'ผ่าน', exact: true }).first().click();
await page.waitForTimeout(600);
await page.reload();
const firstPass = page.getByRole('button', { name: 'ผ่าน', exact: true }).and(page.locator('[aria-pressed="true"]')).first();
check('ติ๊กแล้วบันทึกทันที ปิดแท็บกลับมายังอยู่', await firstPass.isVisible());

// 7) ติ๊กที่เหลือทั้งหมดด้วยการคลิกจริง (ทุกกลุ่ม)
for (let i = 0; i < 7; i++) {
  const btn = sectionBtns.nth(i);
  if ((await btn.getAttribute('aria-expanded')) === 'false') await btn.click();
}
const passButtons = page.getByRole('button', { name: 'ผ่าน', exact: true });
const totalCases = await passButtons.count();
check('เห็นครบ 38 เคสเมื่อกางทุกกลุ่ม', totalCases === 38, `เจอ ${totalCases}`);
for (let i = 0; i < totalCases; i++) {
  await passButtons.nth(i).click();
  await page.waitForTimeout(35);
}
await page.waitForTimeout(1200);

// 8) ส่งผล
const submit = page.getByRole('button', { name: 'ส่งผลการทดสอบ' });
check('ปุ่มส่งเปิดใช้เมื่อติ๊กครบ', await submit.isEnabled());
await submit.click();
await page.waitForTimeout(1500);
await page.reload();
check('ส่งแล้วหน้ากลายเป็นอ่านอย่างเดียว', (await page.getByText('ส่งแล้ว').count()) > 0);

// 9) ตอนนี้ปล่อยใช้งานได้
await page.goto(releaseUrl);
console.log('  [debug] release page text:', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));
const releasedBtn2 = page.getByRole('button', { name: 'ปล่อยใช้งาน' });
check('ผ่าน Test Gate แล้วปุ่มปล่อยใช้งานเปิด', await releasedBtn2.isEnabled());
if (await releasedBtn2.isEnabled()) await releasedBtn2.click();
await page.waitForTimeout(900);
await page.reload();
check('สถานะเปลี่ยนเป็นปล่อยใช้งาน', (await page.getByText('ปล่อยใช้งาน').count()) > 0);

// 10) ดาวน์โหลดทั้งชุดเป็น zip
const resp = await page.request.get(`${releaseUrl}/../../api/releases/${releaseUrl.split('/').pop()}/download`);
const zipResp = await page.request.get(
  `${BASE}/api/releases/${releaseUrl.split('/').pop()}/download`
);
const body = Buffer.from(await zipResp.body());
check(
  'ดาวน์โหลดทั้งชุดได้เป็น zip',
  body.length > 100 && body.subarray(0, 2).toString() === 'PK',
  `status=${zipResp.status()} ${body.length} bytes ct=${zipResp.headers()['content-type']} head=${JSON.stringify(body.subarray(0, 30).toString('utf8'))}`
);
void resp;
{
  const names = [];
  let off = 0;
  while (off < body.length - 4 && body.readUInt32LE(off) === 0x04034b50) {
    const nameLen = body.readUInt16LE(off + 26);
    const extraLen = body.readUInt16LE(off + 28);
    const size = body.readUInt32LE(off + 18);
    names.push(body.subarray(off + 30, off + 30 + nameLen).toString('utf8'));
    off += 30 + nameLen + extraLen + size;
  }
  check('zip มีไฟล์ครบทั้งชุด + ใบกำกับ', names.length === 3 && names.includes('MANIFEST.txt'), names.join(', '));
}

// 11) ตารางความครอบคลุม
await page.goto(BASE + '/coverage/VECTOR_DCL');
check('ตารางความครอบคลุมมี 7 คอลัมน์', (await page.locator('thead th').count()) === 8, 'รวมคอลัมน์เวอร์ชัน');

// 12) สิทธิ์ของ Viewer
await page.goto(BASE + '/admin/users');
await page.fill('input[name=employeeId]', VIEWER_ID);
await page.fill('input[name=name]', 'ช่างดู');
await page.selectOption('select[name=role]', 'VIEWER');
await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
await page.waitForTimeout(600);
check('เพิ่มผู้ใช้ใหม่ได้', (await page.getByText('ช่างดู').count()) > 0);

const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(BASE + '/login');
await p2.fill('input[name=employeeId]', VIEWER_ID);
await p2.fill('input[name=password]', 'viewer12345');
await p2.click('button[type=submit]');
await p2.waitForTimeout(700);
check('เข้าครั้งแรกถูกขอให้ตั้งรหัสผ่าน', (await p2.locator('input[name=confirm]').count()) > 0);
await p2.fill('input[name=password]', 'viewer12345');
await p2.fill('input[name=confirm]', 'viewer12345');
await p2.click('button[type=submit]');
await p2.waitForURL((u) => u.pathname === '/');
check('ตั้งรหัสผ่านครั้งแรกแล้วเข้าได้', true);
check('Viewer ไม่เห็นเมนูอัปโหลด', (await p2.getByRole('link', { name: 'อัปโหลด' }).count()) === 0);
await p2.goto(BASE + '/releases/new');
check('Viewer เข้าหน้าอัปโหลดตรง ๆ ไม่ได้', p2.url().includes('denied'));
await p2.goto(BASE + '/admin/users');
check('Viewer เข้าหน้าผู้ใช้ไม่ได้', p2.url().includes('denied'));

await browser.close();

console.log('\n=== ผ่าน ===');
pass.forEach((p) => console.log('  ✔ ' + p));
if (fail.length) {
  console.log('\n=== ไม่ผ่าน ===');
  fail.forEach((f) => console.log('  ✘ ' + f));
}
console.log(`\nสรุป: ผ่าน ${pass.length} / ไม่ผ่าน ${fail.length}`);
process.exit(fail.length ? 1 : 0);
