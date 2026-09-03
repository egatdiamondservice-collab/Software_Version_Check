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
          background: '#fdfbf7',
          backgroundImage: 'radial-gradient(#e5e0d8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          color: '#2d2d2d',
          fontFamily: "'Mali','Comic Sans MS',Tahoma,sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          lineHeight: 1.75,
        }}
      >
        <div
          style={{
            maxWidth: 620,
            background: '#fff',
            border: '3px solid #2d2d2d',
            borderRadius: '35px 6px 30px 6px / 6px 30px 6px 35px',
            boxShadow: '8px 8px 0 0 #2d2d2d',
            padding: '32px 28px',
          }}
        >
          <h1 style={{ fontSize: 32, margin: '0 0 8px' }}>เซิร์ฟเวอร์ทำงานผิดพลาด</h1>
          <p style={{ margin: '0 0 20px', color: 'rgba(45,45,45,.75)' }}>
            รายละเอียดของข้อผิดพลาดถูกเขียนไว้ที่ console หรือ log ของเซิร์ฟเวอร์
            หน้าเว็บจะไม่แสดงให้เห็นด้วยเหตุผลด้านความปลอดภัย
          </p>

          <div
            style={{
              background: '#fff9c4',
              border: '2px solid #2d2d2d',
              borderRadius: '14px 4px 12px 4px / 4px 12px 4px 14px',
              padding: '14px 18px',
              marginBottom: 20,
            }}
          >
            <b>ตรวจหาสาเหตุด้วยคำสั่งนี้บนเซิร์ฟเวอร์</b>
            <pre style={{ margin: '8px 0 0', fontSize: 15, whiteSpace: 'pre-wrap' }}>npm run doctor</pre>
          </div>

          <p style={{ margin: '0 0 20px', fontSize: 15, color: 'rgba(45,45,45,.7)' }}>
            สาเหตุที่พบบ่อย: Node เก่ากว่า 22.5 · service ไม่ได้ตั้ง Startup directory ให้ชี้มาที่โฟลเดอร์โปรเจกต์ ·
            เขียนโฟลเดอร์ <code>data</code> ไม่ได้ · ยังไม่ได้ตั้ง <code>SESSION_SECRET</code> ·
            ยังไม่ได้สั่ง <code>npm run seed</code>
          </p>

          {error.digest && (
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(45,45,45,.55)' }}>
              รหัสอ้างอิงสำหรับค้นใน log: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              minHeight: 48,
              padding: '0 24px',
              fontSize: 17,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#fff',
              border: '3px solid #2d2d2d',
              borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
              boxShadow: '4px 4px 0 0 #2d2d2d',
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
