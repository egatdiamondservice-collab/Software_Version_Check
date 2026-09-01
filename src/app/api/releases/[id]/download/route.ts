import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { artifactsOf, releaseById } from '@/lib/queries';
import { makeZip, readFlowFile } from '@/lib/flow';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response('ต้องเข้าสู่ระบบก่อน', { status: 401 });

  const { id } = await ctx.params;
  const release = releaseById(id);
  if (!release) return new Response('ไม่พบเวอร์ชันนี้', { status: 404 });

  if (user.role === 'VIEWER' && release.status !== 'RELEASED' && release.status !== 'DEPRECATED') {
    return new Response('สิทธิ์ไม่พอสำหรับเวอร์ชันที่ยังไม่ปล่อยใช้งาน', { status: 403 });
  }

  const artifacts = artifactsOf(release.id);
  if (artifacts.length === 0) return new Response('เวอร์ชันนี้ยังไม่มีไฟล์', { status: 404 });

  const files: Array<{ name: string; data: Buffer }> = [];
  for (const a of artifacts) {
    const data = readFlowFile(a.storedPath);
    if (data) files.push({ name: a.filename, data });
  }

  // ใส่ใบกำกับไปด้วย เพื่อให้คนที่ได้ zip ไปรู้ว่ามันคือเวอร์ชันอะไรและตรวจ sha256 ได้
  const manifest = [
    `รุ่น        : ${release.modelName} (${release.modelCode})`,
    `เวอร์ชัน    : ${release.version}`,
    `สถานะ      : ${release.status}`,
    `อัปโหลดโดย : ${release.authorName}`,
    `วันที่      : ${release.createdAt}`,
    `ฮาร์ดแวร์   : ${release.hardware || '-'}`,
    '',
    'การเปลี่ยนแปลง:',
    release.changelog || '-',
    '',
    'ไฟล์ในชุด:',
    ...artifacts.map((a) => `  [${a.slot}] ${a.filename}  sha256=${a.sha256}`),
  ].join('\r\n');
  files.push({ name: 'MANIFEST.txt', data: Buffer.from(manifest, 'utf8') });

  const zip = makeZip(files);
  const zipName = `${release.modelCode}_${release.version}.zip`.replace(/[^A-Za-z0-9._-]/g, '_');

  return new Response(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    },
  });
}
