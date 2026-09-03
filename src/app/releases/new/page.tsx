import { redirect } from 'next/navigation';
import { requireRole, audit } from '@/lib/auth';
import { get, run, newId, now } from '@/lib/db';
import { Shell } from '@/components/nav';
import { Btn, Card, Field, inputClass, Note, PageHead } from '@/components/ui';
import { listModels, listReleases } from '@/lib/queries';
import { inspectFlowJson, saveFlowFile } from '@/lib/flow';

export const dynamic = 'force-dynamic';

/**
 * เดาบทบาทของไฟล์จากชื่อไฟล์ เพื่อไม่ต้องให้คนกรอกเอง
 * ชื่อไฟล์ที่ทีมใช้อยู่มีคำว่า master / follower อยู่แล้ว
 */
function slotFromFilename(filename: string, index: number, total: number): string {
  const n = filename.toLowerCase();
  if (/master|หลัก/.test(n)) return 'master';
  if (/follower|slave|ตาม/.test(n)) return 'follower';
  if (total === 1) return 'main';
  return `ไฟล์ ${index + 1}`;
}

async function createRelease(formData: FormData) {
  'use server';
  const user = await requireRole('ENGINEER');

  const modelId = String(formData.get('modelId') ?? '');
  const version = String(formData.get('version') ?? '').trim();
  const changelog = String(formData.get('changelog') ?? '');
  const baseReleaseId = String(formData.get('baseReleaseId') ?? '') || null;

  if (!modelId || !version) redirect('/releases/new?error=' + encodeURIComponent('เลือกรุ่นและใส่เลขเวอร์ชันด้วย'));

  const model = get<{ code: string; name: string }>('SELECT code, name FROM ChargerModel WHERE id = ?', modelId);
  if (!model) redirect('/releases/new?error=' + encodeURIComponent('ไม่พบรุ่นนี้'));

  const dup = get('SELECT id FROM Release WHERE modelId = ? AND version = ?', modelId, version);
  if (dup) {
    redirect('/releases/new?error=' + encodeURIComponent(`รุ่นนี้มีเวอร์ชัน ${version} อยู่แล้ว`));
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) redirect('/releases/new?error=' + encodeURIComponent('ยังไม่ได้เลือกไฟล์ .json'));

  const parsed: Array<{ name: string; text: string; nodeCount: number; tabCount: number }> = [];
  for (const f of files) {
    const text = await f.text();
    const stat = inspectFlowJson(text);
    if (!stat.ok) {
      redirect('/releases/new?error=' + encodeURIComponent(`${f.name}: ${stat.error}`));
    }
    parsed.push({ name: f.name, text, nodeCount: stat.nodeCount, tabCount: stat.tabCount });
  }

  const releaseId = newId('rel');
  run(
    `INSERT INTO Release (id, modelId, version, status, changelog, baseReleaseId, createdById, createdAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    releaseId,
    modelId,
    version,
    'DRAFT',
    changelog,
    baseReleaseId,
    user.id,
    now()
  );

  parsed.forEach((p, i) => {
    const saved = saveFlowFile(model.code, version, p.name, p.text);
    const slot = slotFromFilename(p.name, i, parsed.length);
    run(
      `INSERT INTO FlowArtifact (id, releaseId, slot, filename, storedPath, sizeBytes, sha256, nodeCount, tabCount)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      newId('art'),
      releaseId,
      slot,
      p.name,
      saved.storedPath,
      saved.sizeBytes,
      saved.sha256,
      p.nodeCount,
      p.tabCount
    );
  });

  audit(user.id, 'อัปโหลดเวอร์ชันใหม่', `${model.name} ${version}`, `${parsed.length} ไฟล์`);
  redirect(`/releases/${releaseId}`);
}

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; model?: string }>;
}) {
  const user = await requireRole('ENGINEER');
  const { error, model } = await searchParams;
  const models = listModels();
  const allReleases = listReleases();

  return (
    <Shell user={user}>
      <PageHead tag="อัปโหลด" title="เวอร์ชันใหม่" sub="เลขเวอร์ชันพิมพ์เองได้อิสระ ขอแค่ไม่ซ้ำของเดิมในรุ่นเดียวกัน" />

      {error && <div className="mb-6 border-2 border-ink wob-sm bg-[#ffdede] px-4 py-3">{error}</div>}

      <Card decoration="tape" className="pt-8 max-w-3xl">
        <form action={createRelease} className="flex flex-col gap-5">
          <Field label="รุ่นตู้">
            <select name="modelId" defaultValue={model ?? ''} className={inputClass} required>
              <option value="" disabled>
                เลือกรุ่น
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="เลขเวอร์ชัน" hint="เช่น v1.4 หรือ 2026-09-01 — พิมพ์ตามที่ทีมใช้กันได้เลย">
            <input name="version" className={inputClass} placeholder="v1.4" required />
          </Field>

          <Field
            label="ไฟล์ flow (.json)"
            hint="รุ่นที่ต้องใช้หลายไฟล์ เช่น DC Link ให้เลือกทุกไฟล์พร้อมกันในครั้งเดียว"
          >
            <input
              type="file"
              name="files"
              accept=".json,application/json"
              multiple
              required
              className="w-full bg-white border-2 border-dashed border-ink wob-sm px-4 py-6 file:mr-4 file:border-2 file:border-ink file:bg-muted file:px-4 file:py-1 file:wob-sm file:font-body"
            />
          </Field>

          <Field label="สรุปการเปลี่ยนแปลง">
            <textarea
              name="changelog"
              rows={3}
              className={inputClass}
              placeholder="เช่น แก้ logic แบ่ง power ตอน 3 หัวพร้อมกัน"
            />
          </Field>

          <Field label="แตกมาจากเวอร์ชันไหน" hint="ช่วยให้ตามแก้ bug ข้ามรุ่นได้ตอนมีหลายรุ่น">
            <select name="baseReleaseId" className={inputClass} defaultValue="">
              <option value="">ไม่ระบุ</option>
              {allReleases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.modelName} · {r.version}
                </option>
              ))}
            </select>
          </Field>

          <Note>
            ระบบจะตรวจก่อนว่าไฟล์เป็น Node-RED flow จริง (array ของ node)
            แล้วเก็บ sha256 ไว้ให้ เพื่อยืนยันภายหลังว่าไฟล์ที่โหลดไปตรงกับต้นฉบับ
            ถ้าชื่อไฟล์มีคำว่า master หรือ follower ระบบจะติดป้ายบทบาทให้เอง
            <br />
            ฮาร์ดแวร์ที่ใช้ได้ตั้งอยู่ที่{' '}
            <a href="/models" className="underline decoration-wavy">
              หน้ารุ่นตู้
            </a>{' '}
            เพราะเป็นคุณสมบัติของรุ่น ไม่ใช่ของแต่ละเวอร์ชัน
          </Note>

          <Btn type="submit" className="self-start">
            บันทึกเป็นร่าง
          </Btn>
        </form>
      </Card>
    </Shell>
  );
}
