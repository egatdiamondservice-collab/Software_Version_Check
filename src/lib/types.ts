export type Role = 'ADMIN' | 'ENGINEER' | 'VIEWER';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  ENGINEER: 'วิศวกร',
  VIEWER: 'ผู้ใช้ทั่วไป',
};

export type ReleaseStatus = 'DRAFT' | 'TESTING' | 'RELEASED' | 'DEPRECATED';

export const RELEASE_LABEL: Record<ReleaseStatus, string> = {
  DRAFT: 'ร่าง',
  TESTING: 'กำลังทดสอบ',
  RELEASED: 'ปล่อยใช้งาน',
  DEPRECATED: 'เลิกใช้',
};

export type ResultStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NA';

export const RESULT_LABEL: Record<ResultStatus, string> = {
  PENDING: 'ยังไม่ทดสอบ',
  PASS: 'ผ่าน',
  FAIL: 'ไม่ผ่าน',
  NA: 'ไม่เกี่ยว',
};

export type RunStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'VOIDED';

export interface UserRow {
  id: string;
  employeeId: string;
  name: string;
  role: Role;
  passwordHash: string | null;
  active: number;
  createdAt: string;
}

export interface ModelRow {
  id: string;
  code: string;
  name: string;
  note: string;
  /** ฮาร์ดแวร์ที่รุ่นนี้ใช้ได้ คั่นด้วยจุลภาค — เป็นคุณสมบัติของรุ่น ไม่ใช่ของแต่ละเวอร์ชัน */
  hardware: string;
  sortOrder: number;
  createdAt: string;
}

export interface ReleaseRow {
  id: string;
  modelId: string;
  version: string;
  status: ReleaseStatus;
  changelog: string;
  hardware: string;
  baseReleaseId: string | null;
  createdById: string;
  createdAt: string;
  releasedAt: string | null;
}

export interface ArtifactRow {
  id: string;
  releaseId: string;
  slot: string;
  filename: string;
  storedPath: string;
  sizeBytes: number;
  sha256: string;
  nodeCount: number;
  tabCount: number;
}

/** โครงที่ถูก freeze ไว้ใน TestRun.snapshot — ผลทดสอบเก่าจึงไม่เพี้ยนเมื่อ checklist ถูกแก้ */
export interface SnapshotItem {
  itemKey: string;
  testCase: string;
  expected: string;
  verify: string;
  critical: boolean;
}

export interface SnapshotSection {
  name: string;
  items: SnapshotItem[];
}

export interface TemplateSnapshot {
  templateId: string;
  templateVersion: number;
  modelName: string;
  sections: SnapshotSection[];
}
