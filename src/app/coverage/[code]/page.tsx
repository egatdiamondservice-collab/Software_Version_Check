import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/nav';
import { Card, Empty, PageHead } from '@/components/ui';
import { coverageFor, modelByCode } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function cellClass(c: { total: number; pass: number; fail: number; pending: number }) {
  if (c.total === 0) return 'bg-muted';
  if (c.fail > 0) return 'bg-accent';
  if (c.pending === c.total) return 'bg-muted';
  if (c.pending > 0) return 'bg-postit';
  return 'bg-pen';
}

export default async function CoveragePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const { sectionNames, rows } = coverageFor(model.id);

  return (
    <Shell user={user}>
      <PageHead
        tag={model.name}
        title="สรุปการทดสอบ"
        sub="แต่ละเวอร์ชันทดสอบกลุ่มไหนไปแล้วบ้าง และผลออกมาเป็นยังไง"
      />

      {rows.length === 0 ? (
        <Empty>ยังไม่มีอะไรให้สรุป — ต้องมีเวอร์ชันและ checklist ที่เผยแพร่แล้วอย่างน้อยอย่างละหนึ่ง</Empty>
      ) : (
        <>
          <div className="overflow-x-auto border-2 border-ink wob-sm bg-white shadow-hard">
            <table className="border-separate border-spacing-1 p-3 min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left px-2 font-head text-base">เวอร์ชัน</th>
                  {sectionNames.map((n) => (
                    <th key={n} className="px-1 pb-1 text-xs font-body font-normal align-bottom text-center max-w-[96px]">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.releaseId}>
                    <th className="text-left px-2 font-head text-base whitespace-nowrap">
                      <Link href={`/releases/${r.releaseId}`} className="hover:text-accent">
                        {r.version}
                      </Link>
                    </th>
                    {sectionNames.map((n) => {
                      const c = r.cells.find((x) => x.sectionName === n);
                      if (!c)
                        return (
                          <td key={n} className="p-0 text-center">
                            <span className="inline-block w-10 h-8 border-2 border-dashed border-ink/40 rounded-[8px_3px_7px_3px/3px_7px_3px_8px]" />
                          </td>
                        );
                      return (
                        <td key={n} className="p-0 text-center">
                          <span
                            title={`${n} — ผ่าน ${c.pass} / ไม่ผ่าน ${c.fail} / ยังไม่ทดสอบ ${c.pending} จาก ${c.total}`}
                            className={`inline-block w-10 h-8 border-2 border-ink rounded-[8px_3px_7px_3px/3px_7px_3px_8px] ${cellClass(c)}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-5 mt-5 items-center text-sm">
            {[
              ['bg-pen', 'ผ่านหมด'],
              ['bg-postit', 'ทดสอบไปบางส่วน'],
              ['bg-accent', 'มีเคสไม่ผ่าน'],
              ['bg-muted', 'ยังไม่ทดสอบ'],
            ].map(([cls, label]) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`w-6 h-5 border-2 border-ink rounded-[8px_3px_7px_3px/3px_7px_3px_8px] ${cls}`} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}

      <Card className="mt-8" tilt={-0.6}>
        <p className="m-0 text-ink/75">
          ตารางนี้เทียบข้ามเวอร์ชันได้เพราะทุกเคสมีรหัสถาวรอยู่เบื้องหลัง
          เวลาคุณแก้ข้อความของเคสหรือสลับลำดับใน checklist เวอร์ชันใหม่ ผลเก่ายังจับคู่กับเคสเดิมได้ถูกต้อง
          เอาเมาส์ชี้ที่ช่องสีจะเห็นตัวเลขว่าผ่านกี่เคสจากทั้งหมดกี่เคส
        </p>
      </Card>
    </Shell>
  );
}
