import 'server-only';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function storageRoot(): string {
  const raw = process.env.FLOW_STORAGE_DIR || './data/flows';
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

export interface FlowStats {
  ok: boolean;
  error?: string;
  nodeCount: number;
  tabCount: number;
}

/**
 * ตรวจว่าไฟล์เป็น Node-RED flow export จริง
 * (array ของ node ที่มี id/type) และนับจำนวน node กับ tab
 */
export function inspectFlowJson(text: string): FlowStats {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'ไฟล์ไม่ใช่ JSON ที่อ่านได้', nodeCount: 0, tabCount: 0 };
  }
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'ไม่ใช่ Node-RED flow (ต้องเป็น array ของ node)',
      nodeCount: 0,
      tabCount: 0,
    };
  }
  const nodes = parsed as Array<Record<string, unknown>>;
  const typed = nodes.filter((n) => n && typeof n === 'object' && 'type' in n);
  if (typed.length === 0) {
    return { ok: false, error: 'ไม่พบ node ในไฟล์', nodeCount: 0, tabCount: 0 };
  }
  return {
    ok: true,
    nodeCount: typed.length,
    tabCount: typed.filter((n) => n.type === 'tab').length,
  };
}

export function saveFlowFile(
  modelCode: string,
  version: string,
  filename: string,
  content: string
): { storedPath: string; sizeBytes: number; sha256: string } {
  const safeVersion = version.replace(/[^A-Za-z0-9._-]/g, '_');
  const safeName = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, '_');
  const dir = path.join(storageRoot(), modelCode, safeVersion);
  mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, safeName);
  writeFileSync(abs, content, 'utf8');
  const rel = path.relative(storageRoot(), abs).split(path.sep).join('/');
  return { storedPath: rel, sizeBytes: Buffer.byteLength(content), sha256: sha256(content) };
}

export function readFlowFile(storedPath: string): Buffer | null {
  const abs = path.join(storageRoot(), storedPath);
  if (!abs.startsWith(storageRoot()) || !existsSync(abs)) return null;
  return readFileSync(abs);
}

/* ------------------------------------------------------------------ */
/* ZIP แบบ store-only เขียนเองสั้น ๆ เพื่อไม่ต้องพึ่ง dependency เพิ่ม    */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 31),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function makeZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const now = dosTime(new Date());
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filename
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, f.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += 30 + nameBuf.length + f.data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}
