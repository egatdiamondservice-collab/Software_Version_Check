'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ResultStatus, TemplateSnapshot } from '@/lib/types';
import { saveResult, submitRun } from './actions';

type ResultMap = Record<string, { status: ResultStatus; note: string }>;

const CHOICES: Array<{ value: ResultStatus; label: string; on: string }> = [
  { value: 'PASS', label: 'ผ่าน', on: 'bg-green-600 border-green-600 text-white' },
  { value: 'FAIL', label: 'ไม่ผ่าน', on: 'bg-red-600 border-red-600 text-white' },
  { value: 'NA', label: 'ไม่เกี่ยว', on: 'bg-gray-700 border-gray-700 text-white' },
];

export function RunSheet({
  runId,
  snapshot,
  initial,
  readOnly,
}: {
  runId: string;
  snapshot: TemplateSnapshot;
  initial: ResultMap;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [results, setResults] = useState<ResultMap>(initial);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const first = snapshot.sections.findIndex((s) =>
      s.items.some((i) => (initial[i.itemKey]?.status ?? 'PENDING') === 'PENDING')
    );
    const state: Record<string, boolean> = {};
    snapshot.sections.forEach((s, i) => (state[s.name] = i === (first === -1 ? 0 : first)));
    return state;
  });
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => {
    let total = 0,
      done = 0,
      fail = 0;
    for (const s of snapshot.sections)
      for (const it of s.items) {
        total++;
        const st = results[it.itemKey]?.status ?? 'PENDING';
        if (st !== 'PENDING') done++;
        if (st === 'FAIL') fail++;
      }
    return { total, done, fail };
  }, [results, snapshot]);

  const push = useCallback(
    (itemKey: string, status: ResultStatus, noteText: string) => {
      setResults((prev) => ({ ...prev, [itemKey]: { status, note: noteText } }));
      setSaving((n) => n + 1);
      saveResult(runId, itemKey, status, noteText)
        .then((r) => {
          if (!r.ok) setError(r.error ?? 'บันทึกไม่สำเร็จ');
          else setError('');
        })
        .catch(() => setError('บันทึกไม่สำเร็จ — ตรวจสัญญาณเน็ต'))
        .finally(() => setSaving((n) => n - 1));
    },
    [runId]
  );

  const onSubmit = () => {
    startTransition(async () => {
      const r = await submitRun(runId, note);
      if (!r.ok) setError(r.error ?? 'ส่งไม่สำเร็จ');
      else {
        setError('');
        router.refresh();
      }
    });
  };

  const pct = totals.total ? (totals.done / totals.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* แถบสรุปติดบนสุด มองเห็นตลอดตอนไถ */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold tabular-nums">
            {totals.done} / {totals.total}
          </span>
          {totals.fail > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              ไม่ผ่าน {totals.fail}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-500">
            {readOnly ? 'ส่งแล้ว' : saving > 0 ? 'กำลังบันทึก…' : 'บันทึกอัตโนมัติแล้ว'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden mt-2">
          <div className={totals.fail > 0 ? 'h-full bg-red-500' : 'h-full bg-brand-600'} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      )}

      {snapshot.sections.map((section) => {
        const done = section.items.filter(
          (i) => (results[i.itemKey]?.status ?? 'PENDING') !== 'PENDING'
        ).length;
        const isOpen = open[section.name];
        const complete = done === section.items.length;
        return (
          <div key={section.name}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [section.name]: !o[section.name] }))}
              aria-expanded={isOpen}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left font-medium transition-colors ${
                complete
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span aria-hidden className="text-gray-400 text-xs">
                {isOpen ? '▼' : '▶'}
              </span>
              <span className="flex-1">{section.name}</span>
              <span className="text-sm text-gray-500 tabular-nums">
                {done} / {section.items.length}
              </span>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-3 mt-3">
                {section.items.map((item, idx) => {
                  const cur = results[item.itemKey]?.status ?? 'PENDING';
                  const curNote = results[item.itemKey]?.note ?? '';
                  return (
                    <div
                      key={item.itemKey}
                      className={`rounded-lg border p-4 ${
                        cur === 'FAIL' ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-sm font-semibold text-gray-400 w-6 shrink-0 tabular-nums">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="m-0 text-sm font-medium text-gray-900">{item.testCase}</p>
                          {item.expected && (
                            <p className="m-0 mt-1 text-sm text-gray-600">หวังผล: {item.expected}</p>
                          )}
                          {item.verify && <p className="m-0 text-sm text-gray-600">ตรวจเพิ่ม: {item.verify}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 pl-9">
                        {CHOICES.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            disabled={readOnly}
                            aria-pressed={cur === c.value}
                            onClick={() => push(item.itemKey, c.value, curNote)}
                            className={`min-h-[44px] min-w-[92px] rounded-md border px-4 text-sm font-medium transition-colors
                              disabled:opacity-60 disabled:pointer-events-none
                              ${cur === c.value ? c.on : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      {(cur === 'FAIL' || curNote) && (
                        <div className="pl-9">
                          <input
                            defaultValue={curNote}
                            disabled={readOnly}
                            placeholder="อาการที่เจอ / หมายเหตุ"
                            onBlur={(e) => {
                              if (e.target.value !== curNote) push(item.itemKey, cur, e.target.value);
                            }}
                            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
          <h2 className="text-lg mb-1">ส่งผลการทดสอบ</h2>
          <p className="text-sm text-gray-600 mb-3">
            ส่งแล้วจะแก้ไม่ได้อีก ยกเลิกได้อย่างเดียวโดยผู้ดูแลระบบพร้อมเหตุผล
            เพราะผลนี้ถูกใช้เป็นหลักฐานว่าเวอร์ชันนี้ทดสอบอะไรไปแล้วบ้าง
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="สรุปภาพรวมการทดสอบครั้งนี้ (ไม่บังคับ)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending || totals.done < totals.total}
            className="inline-flex items-center justify-center min-h-[40px] px-4 rounded-md text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {pending
              ? 'กำลังส่ง…'
              : totals.done < totals.total
                ? `ยังเหลือ ${totals.total - totals.done} เคส`
                : 'ส่งผลการทดสอบ'}
          </button>
        </div>
      )}
    </div>
  );
}
