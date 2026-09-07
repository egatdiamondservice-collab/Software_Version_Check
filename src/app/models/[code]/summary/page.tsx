import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Empty } from '@/components/ui';
import { coverageFor, modelByCode } from '@/lib/queries';

export const dynamic = 'force-dynamic';

function cellClass(c: { total: number; pass: number; fail: number; pending: number }) {
  if (c.total === 0) return 'bg-gray-100';
  if (c.fail > 0) return 'bg-red-500';
  if (c.pending === c.total) return 'bg-gray-100';
  if (c.pending > 0) return 'bg-amber-400';
  return 'bg-green-500';
}

export default async function ModelSummaryPage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  const model = modelByCode(decodeURIComponent(code));
  if (!model) notFound();

  const { sectionNames, rows } = coverageFor(model.id);

  return (
    <>
      <p className="text-sm text-gray-600 mb-4">แต่ละเวอร์ชันทดสอบกลุ่มไหนไปแล้วบ้าง และผลออกมาเป็นยังไง — เอาเมาส์ชี้ที่ช่องสีจะเห็นตัวเลข</p>

      {rows.length === 0 ? (
        <Empty>ยังไม่มีอะไรให้สรุป — ต้องมีเวอร์ชันและ checklist ที่เผยแพร่แล้วอย่างน้อยอย่างละหนึ่ง</Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
            <table className="border-separate border-spacing-1 p-3 min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left px-2 font-semibold text-sm">เวอร์ชัน</th>
                  {sectionNames.map((n) => (
                    <th key={n} className="px-1 pb-1 text-xs font-normal align-bottom text-center max-w-[96px]">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.releaseId}>
                    <th className="text-left px-2 font-semibold text-sm whitespace-nowrap">
                      <Link href={`/releases/${r.releaseId}`} className="hover:text-brand-700 hover:underline">
                        {r.version}
                      </Link>
                    </th>
                    {sectionNames.map((n) => {
                      const c = r.cells.find((x) => x.sectionName === n);
                      if (!c)
                        return (
                          <td key={n} className="p-0 text-center">
                            <span className="inline-block w-10 h-8 border border-dashed border-gray-300 rounded" />
                          </td>
                        );
                      return (
                        <td key={n} className="p-0 text-center">
                          <span
                            title={`${n} — ผ่าน ${c.pass} / ไม่ผ่าน ${c.fail} / ยังไม่ทดสอบ ${c.pending} จาก ${c.total}`}
                            className={`inline-block w-10 h-8 border border-gray-300 rounded ${cellClass(c)}`}
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
              ['bg-green-500', 'ผ่านหมด'],
              ['bg-amber-400', 'ทดสอบไปบางส่วน'],
              ['bg-red-500', 'มีเคสไม่ผ่าน'],
              ['bg-gray-100', 'ยังไม่ทดสอบ'],
            ].map(([cls, label]) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`w-6 h-5 border border-gray-300 rounded ${cls}`} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-sm text-gray-500">
          ตารางนี้เทียบข้ามเวอร์ชันได้เพราะทุกเคสมีรหัสถาวรอยู่เบื้องหลัง
          เวลาคุณแก้ข้อความของเคสหรือสลับลำดับใน checklist เวอร์ชันใหม่ ผลเก่ายังจับคู่กับเคสเดิมได้ถูกต้อง
          เอาเมาส์ชี้ที่ช่องสีจะเห็นตัวเลขว่าผ่านกี่เคสจากทั้งหมดกี่เคส
        </p>
    </>
  );
}
