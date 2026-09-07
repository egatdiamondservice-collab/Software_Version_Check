import { requireRole } from '@/lib/auth';
import { all } from '@/lib/db';
import { Shell } from '@/components/nav';
import { Empty, PageHead } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface LogRow {
  id: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
  userName: string | null;
  employeeId: string | null;
}

export default async function AuditPage() {
  const admin = await requireRole('ADMIN');
  const logs = all<LogRow>(
    `SELECT a.id, a.action, a.target, a.detail, a.createdAt,
            u.name AS userName, u.employeeId AS employeeId
     FROM AuditLog a LEFT JOIN User u ON u.id = a.userId
     ORDER BY a.createdAt DESC LIMIT 300`
  );

  return (
    <Shell user={admin}>
      <PageHead
        tag="ผู้ดูแลระบบ"
        title="บันทึกการใช้งาน"
        sub="300 รายการล่าสุด — เก็บไว้เพราะระบบเปิดให้เข้าจากนอกออฟฟิศได้"
      />

      {logs.length === 0 ? (
        <Empty>ยังไม่มีบันทึก</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2 font-medium">เมื่อไหร่</th>
                <th className="text-left px-4 py-2 font-medium">ใคร</th>
                <th className="text-left px-4 py-2 font-medium">ทำอะไร</th>
                <th className="text-left px-4 py-2 font-medium">กับอะไร</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-sm whitespace-nowrap tabular-nums">
                    {new Date(l.createdAt).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {l.userName ? `${l.userName} (${l.employeeId})` : '—'}
                  </td>
                  <td className="px-4 py-2">{l.action}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {l.target}
                    {l.detail ? ` · ${l.detail}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
