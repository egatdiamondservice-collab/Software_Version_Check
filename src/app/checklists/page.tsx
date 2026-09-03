import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Card, PageHead, Pill, StatusPill } from '@/components/ui';
import { listModels, templateItemCount, templatesOf } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ChecklistsPage() {
  const user = await requireUser();
  const models = listModels();
  const isAdmin = user.role === 'ADMIN';

  return (
    <Shell user={user}>
      <PageHead
        tag="Checklist"
        title="แบบทดสอบของแต่ละรุ่น"
        sub={
          isAdmin
            ? 'แก้ได้เฉพาะร่าง เผยแพร่แล้วจะถูกล็อก เพื่อไม่ให้ผลทดสอบเก่าเพี้ยน'
            : 'ดูได้อย่างเดียว — การแก้ไขทำโดยผู้ดูแลระบบ'
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {models.map((m, i) => {
          const templates = templatesOf(m.id);
          return (
            <Card key={m.id} tilt={i % 2 ? 0.8 : -0.8}>
              <h2 className="text-2xl mb-3">{m.name}</h2>
              <div className="flex flex-col gap-3">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="border-2 border-dashed border-ink wob-sm px-4 py-2 flex flex-wrap items-center gap-3 bg-paper"
                  >
                    <Link href={`/checklists/${t.id}`} className="font-head text-lg hover:text-accent">
                      v{t.version}
                    </Link>
                    <StatusPill status={t.status} />
                    <Pill tone="neutral">{templateItemCount(t.id)} เคส</Pill>
                  </div>
                ))}
                {templates.length === 0 && <p className="text-ink/60 m-0">ยังไม่มี checklist</p>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 max-w-2xl" tilt={-0.5}>
        <p className="m-0 text-ink/75">
          การเพิ่มรุ่นตู้ใหม่ย้ายไปอยู่ที่หน้า{' '}
          <Link href="/models/new" className="underline decoration-wavy">
            เพิ่มรุ่นตู้ใหม่
          </Link>{' '}
          — ตอนเพิ่มรุ่นสามารถคัดลอก checklist จากรุ่นเดิมมาตั้งต้นได้เลย
        </p>
      </Card>

    </Shell>
  );
}
