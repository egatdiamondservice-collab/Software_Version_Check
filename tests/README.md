# ชุดทดสอบอัตโนมัติ

ขับเบราว์เซอร์จริงผ่าน Playwright ตรวจตั้งแต่ล็อกอิน อัปโหลดชุดไฟล์
ติ๊ก checklist ครบ 38 เคส ส่งผล กด Test Gate ดาวน์โหลด zip
ไปจนถึงสิทธิ์ของแต่ละ role และการออก checklist เวอร์ชันใหม่

รันแบบนี้ (ต้องมีเซิร์ฟเวอร์เปิดอยู่ที่ port 3100 และฐานข้อมูลว่าง):

```bash
npm i -D playwright && npx playwright install chromium
rm -f data/flowbook.db* && rm -rf data/flows && npm run seed
PORT=3100 npm start &
npm run test:e2e
```
