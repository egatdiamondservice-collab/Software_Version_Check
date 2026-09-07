import 'server-only';
import { all, get, run, newId, now } from './db';
import type {
  ArtifactRow,
  ModelRow,
  ReleaseRow,
  ResultStatus,
  SnapshotSection,
  TemplateSnapshot,
} from './types';

/* ---------------------------------- models --------------------------------- */

export function listModels(): ModelRow[] {
  return all<ModelRow>('SELECT * FROM ChargerModel ORDER BY sortOrder, name');
}

export function modelByCode(code: string): ModelRow | undefined {
  return get<ModelRow>('SELECT * FROM ChargerModel WHERE code = ?', code);
}

/* --------------------------------- releases -------------------------------- */

export interface ReleaseWithMeta extends ReleaseRow {
  modelCode: string;
  modelName: string;
  authorName: string;
  artifactCount: number;
}

const RELEASE_SELECT = `
  SELECT r.*, m.code AS modelCode, m.name AS modelName, u.name AS authorName,
         (SELECT COUNT(*) FROM FlowArtifact a WHERE a.releaseId = r.id) AS artifactCount
  FROM Release r
  JOIN ChargerModel m ON m.id = r.modelId
  JOIN User u ON u.id = r.createdById
`;

export function listReleases(modelId?: string): ReleaseWithMeta[] {
  const rows = modelId
    ? all<ReleaseWithMeta>(`${RELEASE_SELECT} WHERE r.modelId = ? ORDER BY r.createdAt DESC`, modelId)
    : all<ReleaseWithMeta>(`${RELEASE_SELECT} ORDER BY r.createdAt DESC`);
  return rows;
}

/** เวอร์ชันที่ "ปล่อยใช้งาน" อยู่ตอนนี้ของรุ่น — ตัวที่ช่างควรโหลดไปลงตู้ */
export function releasedOf(modelId: string): ReleaseWithMeta | undefined {
  return get<ReleaseWithMeta>(
    `${RELEASE_SELECT} WHERE r.modelId = ? AND r.status = 'RELEASED' ORDER BY r.releasedAt DESC LIMIT 1`,
    modelId
  );
}

/** เวอร์ชันล่าสุดที่ยังไม่ปล่อย (ร่างหรือกำลังทดสอบ) — ตัวที่วิศวกรกำลังทำอยู่ */
export function inProgressOf(modelId: string): ReleaseWithMeta | undefined {
  return get<ReleaseWithMeta>(
    `${RELEASE_SELECT} WHERE r.modelId = ? AND r.status IN ('DRAFT','TESTING') ORDER BY r.createdAt DESC LIMIT 1`,
    modelId
  );
}

export function releaseById(id: string): ReleaseWithMeta | undefined {
  return get<ReleaseWithMeta>(`${RELEASE_SELECT} WHERE r.id = ?`, id);
}

export function artifactsOf(releaseId: string): ArtifactRow[] {
  return all<ArtifactRow>(
    'SELECT * FROM FlowArtifact WHERE releaseId = ? ORDER BY slot, filename',
    releaseId
  );
}

/* -------------------------------- checklists ------------------------------- */

export interface TemplateRow {
  id: string;
  modelId: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  publishedAt: string | null;
}

export function templatesOf(modelId: string): TemplateRow[] {
  return all<TemplateRow>(
    'SELECT * FROM ChecklistTemplate WHERE modelId = ? ORDER BY version DESC',
    modelId
  );
}

export function publishedTemplate(modelId: string): TemplateRow | undefined {
  return get<TemplateRow>(
    "SELECT * FROM ChecklistTemplate WHERE modelId = ? AND status = 'PUBLISHED' ORDER BY version DESC LIMIT 1",
    modelId
  );
}

export function templateById(id: string): TemplateRow | undefined {
  return get<TemplateRow>('SELECT * FROM ChecklistTemplate WHERE id = ?', id);
}

export interface SectionRow {
  id: string;
  templateId: string;
  name: string;
  sortOrder: number;
}

export interface ItemRow {
  id: string;
  sectionId: string;
  itemKey: string;
  testCase: string;
  expected: string;
  verify: string;
  critical: number;
  sortOrder: number;
}

export function sectionsOf(templateId: string): SectionRow[] {
  return all<SectionRow>(
    'SELECT * FROM ChecklistSection WHERE templateId = ? ORDER BY sortOrder',
    templateId
  );
}

export function itemsOf(sectionId: string): ItemRow[] {
  return all<ItemRow>(
    'SELECT * FROM ChecklistItem WHERE sectionId = ? ORDER BY sortOrder',
    sectionId
  );
}

export function templateItemCount(templateId: string): number {
  const r = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ChecklistItem i
     JOIN ChecklistSection s ON s.id = i.sectionId
     WHERE s.templateId = ?`,
    templateId
  );
  return r?.n ?? 0;
}

export function buildSnapshot(templateId: string): TemplateSnapshot {
  const tpl = templateById(templateId)!;
  const model = get<ModelRow>('SELECT * FROM ChargerModel WHERE id = ?', tpl.modelId)!;
  const sections: SnapshotSection[] = sectionsOf(templateId).map((s) => ({
    name: s.name,
    items: itemsOf(s.id).map((i) => ({
      itemKey: i.itemKey,
      testCase: i.testCase,
      expected: i.expected,
      verify: i.verify,
      critical: !!i.critical,
    })),
  }));
  return {
    templateId,
    templateVersion: tpl.version,
    modelName: model.name,
    sections,
  };
}

/**
 * คัดลอก template เป็นเวอร์ชันใหม่ โดย "คง itemKey เดิมไว้"
 * นี่คือหัวใจที่ทำให้สรุปการทดสอบเทียบข้ามเวอร์ชันได้
 */
export function cloneTemplate(templateId: string): string {
  const src = templateById(templateId)!;
  const maxV = get<{ v: number | null }>(
    'SELECT MAX(version) AS v FROM ChecklistTemplate WHERE modelId = ?',
    src.modelId
  );
  const newVersion = (maxV?.v ?? 0) + 1;
  const newTplId = newId('tpl');
  run(
    'INSERT INTO ChecklistTemplate (id, modelId, version, status, createdAt) VALUES (?,?,?,?,?)',
    newTplId,
    src.modelId,
    newVersion,
    'DRAFT',
    now()
  );
  for (const s of sectionsOf(templateId)) {
    const newSecId = newId('sec');
    run(
      'INSERT INTO ChecklistSection (id, templateId, name, sortOrder) VALUES (?,?,?,?)',
      newSecId,
      newTplId,
      s.name,
      s.sortOrder
    );
    for (const i of itemsOf(s.id)) {
      run(
        `INSERT INTO ChecklistItem (id, sectionId, itemKey, testCase, expected, verify, critical, sortOrder)
         VALUES (?,?,?,?,?,?,?,?)`,
        newId('itm'),
        newSecId,
        i.itemKey, // <- คงรหัสเดิม
        i.testCase,
        i.expected,
        i.verify,
        i.critical,
        i.sortOrder
      );
    }
  }
  return newTplId;
}

/* --------------------------------- test runs ------------------------------- */

export interface RunRow {
  id: string;
  releaseId: string;
  templateId: string;
  testerId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'VOIDED';
  snapshot: string;
  note: string;
  voidReason: string;
  startedAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface RunWithMeta extends RunRow {
  testerName: string;
  templateVersion: number;
}

export function runsOfRelease(releaseId: string): RunWithMeta[] {
  return all<RunWithMeta>(
    `SELECT r.*, u.name AS testerName, t.version AS templateVersion
     FROM TestRun r JOIN User u ON u.id = r.testerId
     JOIN ChecklistTemplate t ON t.id = r.templateId
     WHERE r.releaseId = ? ORDER BY r.startedAt DESC`,
    releaseId
  );
}

export function runById(id: string): RunWithMeta | undefined {
  return get<RunWithMeta>(
    `SELECT r.*, u.name AS testerName, t.version AS templateVersion
     FROM TestRun r JOIN User u ON u.id = r.testerId
     JOIN ChecklistTemplate t ON t.id = r.templateId
     WHERE r.id = ?`,
    id
  );
}

export function resultsOf(runId: string): Record<string, { status: ResultStatus; note: string }> {
  const rows = all<{ itemKey: string; status: ResultStatus; note: string }>(
    'SELECT itemKey, status, note FROM TestResult WHERE runId = ?',
    runId
  );
  const map: Record<string, { status: ResultStatus; note: string }> = {};
  for (const r of rows) map[r.itemKey] = { status: r.status, note: r.note };
  return map;
}

export interface RunProgress {
  total: number;
  pass: number;
  fail: number;
  na: number;
  done: number;
  criticalOpen: number;
}

export function runProgress(run: RunRow): RunProgress {
  const snap = JSON.parse(run.snapshot) as TemplateSnapshot;
  const results = resultsOf(run.id);
  let total = 0,
    pass = 0,
    fail = 0,
    na = 0,
    criticalOpen = 0;
  for (const s of snap.sections) {
    for (const it of s.items) {
      total++;
      const st = results[it.itemKey]?.status ?? 'PENDING';
      if (st === 'PASS') pass++;
      else if (st === 'FAIL') fail++;
      else if (st === 'NA') na++;
      if (it.critical && st !== 'PASS' && st !== 'NA') criticalOpen++;
    }
  }
  return { total, pass, fail, na, done: pass + fail + na, criticalOpen };
}

/** Test Gate: release จะ RELEASED ได้ต่อเมื่อมี run ที่ submit แล้วและไม่มีเคส critical ค้าง */
export function gatePassed(releaseId: string): { ok: boolean; reason: string } {
  const runs = runsOfRelease(releaseId).filter((r) => r.status === 'SUBMITTED');
  if (runs.length === 0) return { ok: false, reason: 'ยังไม่มีผลทดสอบที่ส่งแล้ว' };
  for (const r of runs) {
    const p = runProgress(r);
    if (p.criticalOpen === 0 && p.fail === 0) return { ok: true, reason: '' };
  }
  return { ok: false, reason: 'ผลทดสอบล่าสุดยังมีเคสที่ไม่ผ่านหรือยังไม่ได้ทดสอบ' };
}

/** งานทดสอบที่ค้างอยู่ของคนนี้กับเวอร์ชันนี้ ใช้ตัดสินว่าปุ่มควรเขียนว่า "เริ่ม" หรือ "ทำต่อ" */
export function openRunFor(releaseId: string, userId: string): RunWithMeta | undefined {
  return runsOfRelease(releaseId).find(
    (r) => r.status === 'IN_PROGRESS' && r.testerId === userId
  );
}

export interface ReleaseSummary {
  release: ReleaseWithMeta;
  progress: RunProgress | null;
  latestRunId: string | null;
}

export function summarize(release: ReleaseWithMeta): ReleaseSummary {
  const runs = runsOfRelease(release.id);
  const chosen = runs.find((r) => r.status === 'SUBMITTED') ?? runs[0] ?? null;
  return {
    release,
    progress: chosen ? runProgress(chosen) : null,
    latestRunId: chosen?.id ?? null,
  };
}

/* --------------------------------- coverage -------------------------------- */

export interface CoverageCell {
  sectionName: string;
  total: number;
  pass: number;
  fail: number;
  pending: number;
}

export interface CoverageRow {
  version: string;
  releaseId: string;
  status: string;
  cells: CoverageCell[];
}

export function coverageFor(modelId: string): {
  sectionNames: string[];
  rows: CoverageRow[];
} {
  const releases = listReleases(modelId);
  const sectionNames: string[] = [];
  const rows: CoverageRow[] = [];

  for (const rel of releases) {
    const runs = runsOfRelease(rel.id);
    const chosen = runs.find((r) => r.status === 'SUBMITTED') ?? runs[0];
    const tplId = publishedTemplate(modelId)?.id;
    const snap: TemplateSnapshot | null = chosen
      ? (JSON.parse(chosen.snapshot) as TemplateSnapshot)
      : tplId
        ? buildSnapshot(tplId)
        : null;
    if (!snap) continue;

    const results = chosen ? resultsOf(chosen.id) : {};
    const cells: CoverageCell[] = snap.sections.map((s) => {
      if (!sectionNames.includes(s.name)) sectionNames.push(s.name);
      let pass = 0,
        fail = 0,
        pending = 0;
      for (const it of s.items) {
        const st = results[it.itemKey]?.status ?? 'PENDING';
        if (st === 'PASS' || st === 'NA') pass++;
        else if (st === 'FAIL') fail++;
        else pending++;
      }
      return { sectionName: s.name, total: s.items.length, pass, fail, pending };
    });
    rows.push({ version: rel.version, releaseId: rel.id, status: rel.status, cells });
  }
  return { sectionNames, rows };
}
