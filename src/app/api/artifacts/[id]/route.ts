import { NextRequest } from 'next/server';
import { get } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { readFlowFile } from '@/lib/flow';
import type { ArtifactRow } from '@/lib/types';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response('ต้องเข้าสู่ระบบก่อน', { status: 401 });

  const { id } = await ctx.params;
  const artifact = get<ArtifactRow>('SELECT * FROM FlowArtifact WHERE id = ?', id);
  if (!artifact) return new Response('ไม่พบไฟล์', { status: 404 });

  const rel = get<{ status: string }>('SELECT status FROM Release WHERE id = ?', artifact.releaseId);
  if (user.role === 'VIEWER' && rel?.status !== 'RELEASED' && rel?.status !== 'DEPRECATED') {
    return new Response('สิทธิ์ไม่พอสำหรับเวอร์ชันที่ยังไม่ปล่อยใช้งาน', { status: 403 });
  }

  const data = readFlowFile(artifact.storedPath);
  if (!data) return new Response('ไฟล์หายไปจากที่เก็บ', { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(artifact.filename)}`,
    },
  });
}
