'use client';

/**
 * หน้าที่แสดงเมื่อเซิร์ฟเวอร์พังตั้งแต่ระดับ layout
 * Next.js ซ่อนรายละเอียด error ตอน production ไว้ที่ log ของเซิร์ฟเวอร์
 * หน้านี้จึงมีหน้าที่บอกว่าต้องไปดูตรงไหนต่อ ไม่ใช่แค่ขึ้นว่า error
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#f9fafb',
          color: '#111827',
          fontFamily: "Inter, 'Noto Sans Thai', 'Segoe UI', Tahoma, system-ui, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            padding: '28px 28px',
          }}
        >
          <h1 style={{ fontSize: 22, margin: '0 0 8px', fontWeight: 600 }}>เซิร์ฟเวอร์ทำงานผิดพลาด</h1>
          <p style={{ margin: '0 0 16px', color: '#4b5563', fontSize: 14 }}>
            รายละเอียดของข้อผิดพลาดถูกเขียนไว้ที่ console หรือ log ของเซิร์ฟเวอร์
            หน้าเว็บจะไม่แสดงให้เห็นด้วยเหตุผลด้านความปลอดภัย
          </p>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            <b>ตรวจหาสาเหตุด้วยคำสั่งนี้บนเซิร์ฟเวอร์</b>
            <pre style={{ margin: '6px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>npm run doctor</pre>
          </div>

          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            สาเหตุที่พบบ่อย: Node เก่ากว่า 22.5 · service ไม่ได้ตั้ง Startup directory ให้ชี้มาที่โฟลเดอร์โปรเจกต์ ·
            เขียนโฟลเดอร์ data ไม่ได้ · ยังไม่ได้ตั้ง SESSION_SECRET · ยังไม่ได้สั่ง npm run seed ·
            มีเซิร์ฟเวอร์ตัวเก่ารันค้างอยู่ (database is locked)
          </p>

          {error.digest && (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#9ca3af' }}>
              รหัสอ้างอิงสำหรับค้นใน log: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              minHeight: 40,
              padding: '0 16px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#2563eb',
              color: '#fff',
              border: '1px solid #2563eb',
              borderRadius: 6,
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
