'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ResultStatus, TemplateSnapshot } from '@/lib/types';
import { saveResult, submitRun } from './actions';

type ResultMap = Record<string, { status: ResultStatus; note: string }>;

const CHOICES: Array<{ value: ResultStatus; label: string; on: string }> = [
  { value: 'PASS', label: 'ผ่าน', on: 'bg-pen text-white' },
  { value: 'FAIL', label: 'ไม่ผ่าน', on: 'bg-accent text-white' },
  { value: 'NA', label: 'ไม่เกี่ยว', on: 'bg-ink text-white' },
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

  return (
    <div className="flex flex-col gap-4">
      {/* แถบสรุปติดบนสุด มองเห็นตลอดตอนไถ */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-paper/95 backdrop-blur border-b-2 border-dashed border-ink">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-head text-lg">
            {totals.done} / {totals.total}
          </span>
          {totals.fail > 0 && (
            <span className="border-2 border-ink wob-sm px-2 text-sm bg-[#ffdede] text-accent">
              ไม่ผ่าน {totals.fail}
            </span>
          )}
          <span className="ml-auto text-sm border-2 border-ink wob-sm px-2 bg-postit">
            {readOnly ? 'ส่งแล้ว' : saving > 0 ? 'กำลังบันทึก…' : 'บันทึกอัตโนมัติแล้ว'}
          </span>
        </div>
        <div className="h-3 border-2 border-ink wob-sm bg-white overflow-hidden mt-2">
          <div
            className={totals.fail > 0 ? 'h-full bg-accent' : 'h-full bg-pen'}
            style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {error && <div className="border-2 border-ink wob-sm bg-[#ffdede] px-4 py-2">{error}</div>}

      {snapshot.sections.map((section) => {
        const done = section.items.filter(
          (i) => (results[i.itemKey]?.status ?? 'PENDING') !== 'PENDING'
        ).length;
        const isOpen = open[section.name];
        return (
          <div key={section.name}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [section.name]: !o[section.name] }))}
              aria-expanded={isOpen}
              className={`w-full flex items-center gap-3 border-2 border-ink wob-sm px-4 py-2 font-head text-lg shadow-hardSm ${
                done === section.items.length ? 'bg-[#dbe6f5]' : 'bg-muted'
              }`}
            >
              <span aria-hidden>{isOpen ? '▾' : '▸'}</span>
              <span className="text-left flex-1">{section.name}</span>
              <span className="font-body text-base">
                {done} / {section.items.length}
              </span>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-3 mt-3 pl-1">
                {section.items.map((item, idx) => {
                  const cur = results[item.itemKey]?.status ?? 'PENDING';
                  const curNote = results[item.itemKey]?.note ?? '';
                  return (
                    <div
                      key={item.itemKey}
                      className={`border-2 border-dashed wob-sm p-3 ${
                        cur === 'FAIL' ? 'border-accent bg-[#fff5f5]' : 'border-ink bg-white'
                      }`}
                    >
                      <div className="flex gap-2">
                        <span className="font-head text-lg w-7 shrink-0">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="m-0">{item.testCase}</p>
                          {item.expected && (
                            <p className="m-0 mt-1 text-sm text-ink/70">หวังผล: {item.expected}</p>
                          )}
                          {item.verify && <p className="m-0 text-sm text-ink/70">ตรวจเพิ่ม: {item.verify}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {CHOICES.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            disabled={readOnly}
                            aria-pressed={cur === c.value}
                            onClick={() => push(item.itemKey, c.value, curNote)}
                            className={`min-h-[48px] min-w-[92px] border-2 border-ink wob-sm px-4 shadow-hardSm
                              transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px]
                              disabled:opacity-60 disabled:pointer-events-none
                              ${cur === c.value ? c.on : 'bg-white'}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      {(cur === 'FAIL' || curNote) && (
                        <input
                          defaultValue={curNote}
                          disabled={readOnly}
                          placeholder="อาการที่เจอ / หมายเหตุ"
                          onBlur={(e) => {
                            if (e.target.value !== curNote) push(item.itemKey, cur, e.target.value);
                          }}
                          className="mt-3 w-full border-2 border-ink wob-sm px-3 py-2 bg-white focus:border-pen focus:outline-none"
                        />
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
        <div className="border-2 border-ink wob-md bg-postit p-4 mt-4">
          <h2 className="text-2xl mb-2">ส่งผลการทดสอบ</h2>
          <p className="text-sm text-ink/75 mb-3">
            ส่งแล้วจะแก้ไม่ได้อีก ยกเลิกได้อย่างเดียวโดยผู้ดูแลระบบพร้อมเหตุผล
            เพราะผลนี้ถูกใช้เป็นหลักฐานว่าเวอร์ชันนี้ทดสอบอะไรไปแล้วบ้าง
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="สรุปภาพรวมการทดสอบครั้งนี้ (ไม่บังคับ)"
            className="w-full border-2 border-ink wob-sm px-3 py-2 bg-white mb-3 focus:border-pen focus:outline-none"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending || totals.done < totals.total}
            className="min-h-[48px] px-6 text-lg wob border-[3px] border-ink shadow-hard bg-white
              hover:bg-accent hover:text-white hover:shadow-hardSm hover:translate-x-[2px] hover:translate-y-[2px]
              active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-transform duration-100"
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
