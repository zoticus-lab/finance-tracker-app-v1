# ⚠️ FULL CACHE CLEAR REQUIRED

Database sudah di-update! But browser masih cache data lama.

## LANGKAH 1: Kill semua terminals
```bash
Ctrl + C  # di terminal backend & frontend
taskkill /F /IM node.exe
taskkill /F /IM php.exe
```

## LANGKAH 2: Restart Backend
```bash
cd backend
php artisan serve
```

Backend harus jalan di `http://127.0.0.1:8000`

## LANGKAH 3: Restart Frontend
Di terminal baru:
```bash
cd frontend
npm run dev
```

Frontend harus jalan di `http://localhost:5173` atau `http://localhost:3001`

## LANGKAH 4: Clear Browser Cache Maksimal
1. Tekan `F12` (buka DevTools)
2. Go to: **Application** tab
3. Left sidebar → **Storage** → **Local Storage**
4. Klik `http://localhost:3001` (atau 5173, atau 3000)
5. Click **Clear All** button
6. Go to: **Application** → **Cookies**
7. Delete semua cookies untuk localhost

## LANGKAH 5: Close & Reopen Browser
- Close browser completely (all tabs/windows)
- Wait 3 seconds
- Reopen browser
- Go to `http://localhost:3001` (atau port frontend Anda)

## LANGKAH 6: Logout & Login Fresh
1. Jika sudah logged in, click **Logout**
2. Login kembali dengan credentials Anda

## LANGKAH 7: Test
1. Go to **Reports** page
2. Scroll down ke **Table 3 - Daftar Transaksi Terbaru**
3. Kolom **Kategori** dan **Akun** harus terisi (bukan "-")!

---

**Kalau masih "-" setelah ini:**
- Export PDF lagi (bukan cache PDF lama)
- Buka PDF baru di file manager (jangan di browser)
