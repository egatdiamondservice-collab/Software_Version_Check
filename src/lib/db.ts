import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { SCHEMA } from '../../scripts/schema.mjs';

/**
 * ใช้ node:sqlite ที่ติดมากับ Node 22 เอง — ไม่ต้องคอมไพล์ native module
 * ทำให้ `git pull && npm ci && npm run build` ทำงานได้บน Windows Server
 * โดยไม่ต้องลง Visual Studio Build Tools
 */


function resolveDbFile(): string {
  const raw = process.env.DATABASE_FILE || './data/flowbook.db';
  const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}

declare global {
  // eslint-disable-next-line no-var
  var __flowbookDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  const db = new DatabaseSync(resolveDbFile());
  db.exec(SCHEMA);
  return db;
}

/** ใช้ตัวเดียวทั้งกระบวนการ และไม่ให้ hot-reload ตอน dev เปิดซ้ำ */
export const db: DatabaseSync = global.__flowbookDb ?? open();
if (process.env.NODE_ENV !== 'production') global.__flowbookDb = db;

type Row = Record<string, unknown>;

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...(params as never[]));
}

export function now(): string {
  return new Date().toISOString();
}

export function newId(prefix = ''): string {
  const s = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) out += s[Math.floor(Math.random() * s.length)];
  return prefix ? `${prefix}_${out}` : out;
}
