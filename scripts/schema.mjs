// โครงตารางของ FlowBook — ใช้ร่วมกันระหว่างตัวแอปและสคริปต์ seed
// CREATE TABLE IF NOT EXISTS ทั้งหมด จึงรันซ้ำได้เสมอ
export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  employeeId TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  passwordHash TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ChargerModel (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Release (
  id TEXT PRIMARY KEY,
  modelId TEXT NOT NULL REFERENCES ChargerModel(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  changelog TEXT NOT NULL DEFAULT '',
  hardware TEXT NOT NULL DEFAULT '',
  baseReleaseId TEXT,
  createdById TEXT NOT NULL REFERENCES User(id),
  createdAt TEXT NOT NULL,
  releasedAt TEXT,
  UNIQUE (modelId, version)
);

CREATE TABLE IF NOT EXISTS FlowArtifact (
  id TEXT PRIMARY KEY,
  releaseId TEXT NOT NULL REFERENCES Release(id) ON DELETE CASCADE,
  slot TEXT NOT NULL DEFAULT 'main',
  filename TEXT NOT NULL,
  storedPath TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL DEFAULT '',
  nodeCount INTEGER NOT NULL DEFAULT 0,
  tabCount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ChecklistTemplate (
  id TEXT PRIMARY KEY,
  modelId TEXT NOT NULL REFERENCES ChargerModel(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  createdAt TEXT NOT NULL,
  publishedAt TEXT,
  UNIQUE (modelId, version)
);

CREATE TABLE IF NOT EXISTS ChecklistSection (
  id TEXT PRIMARY KEY,
  templateId TEXT NOT NULL REFERENCES ChecklistTemplate(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ChecklistItem (
  id TEXT PRIMARY KEY,
  sectionId TEXT NOT NULL REFERENCES ChecklistSection(id) ON DELETE CASCADE,
  itemKey TEXT NOT NULL,
  testCase TEXT NOT NULL,
  expected TEXT NOT NULL DEFAULT '',
  verify TEXT NOT NULL DEFAULT '',
  critical INTEGER NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS TestRun (
  id TEXT PRIMARY KEY,
  releaseId TEXT NOT NULL REFERENCES Release(id) ON DELETE CASCADE,
  templateId TEXT NOT NULL REFERENCES ChecklistTemplate(id),
  testerId TEXT NOT NULL REFERENCES User(id),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  snapshot TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  voidReason TEXT NOT NULL DEFAULT '',
  startedAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  submittedAt TEXT
);

CREATE TABLE IF NOT EXISTS TestResult (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL REFERENCES TestRun(id) ON DELETE CASCADE,
  itemKey TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL,
  UNIQUE (runId, itemKey)
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_release_model ON Release(modelId);
CREATE INDEX IF NOT EXISTS idx_artifact_release ON FlowArtifact(releaseId);
CREATE INDEX IF NOT EXISTS idx_run_release ON TestRun(releaseId);
CREATE INDEX IF NOT EXISTS idx_result_run ON TestResult(runId);
CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog(createdAt);
`;
