import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { SCHEMA, prepareConnection, applyMigrations } from '../../scripts/schema.mjs';

/**
 * ใช้ node:sqlite ที่ติดมากับ Node 22 เอง — ไม่ต้องคอมไพล์ native module
 * ทำให้ `git pull && npm ci && npm run build` ทำงานได้บน Windows Server
 * โดยไม่ต้องลง Visual Studio Build Tools
 *
 * เปิดฐานข้อมูลแบบ lazy คือเปิดตอนมีคนสั่ง query จริง ๆ ไม่ใช่ตอน import โมดูล
 * เพราะ `next build` จะ import ทุก route เพื่อเก็บข้อมูลหน้า ถ้าเปิดตั้งแต่ import
 * ตัว build จะไปแย่งไฟล์กับเซิร์ฟเวอร์ที่รันค้างอยู่ แล้วล้มด้วย "database is locked"
 */


function resolveDbFile(): string {
  const raw = process.env.DATABASE_FILE || './data/flowbook.db';
  const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  try {
    mkdirSync(path.dirname(abs), { recursive: true });
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(
      `สร้างโฟลเดอร์เก็บข้อมูลไม่ได้ที่ ${path.dirname(abs)} — ${why}\n` +
        `โฟลเดอร์ที่กำลังทำงานอยู่คือ ${process.cwd()} — สั่ง "npm run doctor" เพื่อตรวจ`
    );
  }
  return abs;
}

declare global {
  // eslint-disable-next-line no-var
  var __flowbookDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  const file = resolveDbFile();
  try {
    const db = new DatabaseSync(file);
    prepareConnection(db);
    db.exec(SCHEMA);
    applyMigrations(db);
    // พิมพ์ครั้งเดียวตอนเปิด เพื่อให้ log ของ service บอกได้ทันทีว่ามันไปอ่านฐานข้อมูลที่ไหน
    console.log(`[FlowBook] cwd=${process.cwd()}`);
    console.log(`[FlowBook] ฐานข้อมูล=${file}`);
    return db;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(
      `เปิดฐานข้อมูลไม่ได้ที่ ${file} — ${why}\n` +
        `โฟลเดอร์ที่กำลังทำงานอยู่คือ ${process.cwd()}\n` +
        `ถ้าขึ้นว่า database is locked แปลว่ามีอีกโปรเซสเปิดไฟล์นี้ค้างอยู่ ปิดเซิร์ฟเวอร์ตัวเก่าก่อน\n` +
        `ถ้ารันเป็น service ให้ตรวจว่าตั้ง Startup directory ชี้มาที่โฟลเดอร์โปรเจกต์แล้ว ` +
        `และบัญชีที่รันมีสิทธิ์เขียนโฟลเดอร์ data — สั่ง "npm run doctor" เพื่อตรวจทั้งหมด`
    );
  }
}

/** เปิดครั้งแรกที่มีคนเรียกใช้ แล้วใช้ตัวเดิมตลอดทั้งโปรเซส */
function conn(): DatabaseSync {
  if (!global.__flowbookDb) global.__flowbookDb = open();
  return global.__flowbookDb;
}

type Row = Record<string, unknown>;

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return conn().prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return conn().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return conn().prepare(sql).run(...(params as never[]));
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
