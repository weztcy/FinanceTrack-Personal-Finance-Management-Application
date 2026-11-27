# Hasil verifikasi

Tanggal: **10 November 2026 (Asia/Bangkok)**.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | **18/18 lulus**, tanpa skipped tests |
| `npm run build` | **Lulus**, bundle halaman dimuat secara lazy |
| `npm audit --omit=dev` | **0 vulnerabilities** pada dependensi terpasang saat verifikasi |
| `docker compose config --quiet` | **Lulus** |
| `docker compose up --build -d` | **Lulus**, nginx frontend, backend sehat, Mailpit sehat |
| `npm run smoke -w backend` | **Lulus** lewat HTTP sungguhan pada port 8080 |
| Restart/persistensi | **Lulus**, pengguna/sesi/rekening tetap setelah dua restart backend Docker |
| Scheduler sungguhan | **Lulus**, startup backend membuat satu transaksi due; restart berikutnya tidak menggandakan |
| Backup/restore | **Lulus**, file hasil backup dibuka kembali, jumlah record sama, integrity_check ok, foreign_key_check kosong |

Lingkungan: Windows, Node.js v26.13.0 native, Node.js 24 pada container Alpine, Docker Engine 29.9.2. Source kompatibel Node >=24.

## Cakupan 18 skenario integrasi

1. Endpoint privat memerlukan sesi, mutasi memerlukan CSRF, origin asing ditolak, password disimpan sebagai hash.
2. Penolakan nominal nol/negatif/presisi berlebih/berbahaya, tanggal tidak valid, tanggal sebelum saldo awal, kategori salah, transfer rekening sama, idempotency key kosong, serta perubahan saldo awal.
3. Pemasukan, pengeluaran, transfer, edit nominal, void, saldo kedua rekening, arus kas, dan history audit.
4. Perubahan jenis transaksi membersihkan field rekening/kategori yang tidak lagi sesuai.
5. Tiga request create serentak dengan key sama menghasilkan satu transaksi; payload berbeda menghasilkan 409.
6. Pembacaan/perubahan lintas user dan referensi rekening asing ditolak; laporan pengguna lain tidak membocorkan data.
7. Unique budget per kategori/periode, warning 80%, exceed 100%, sisa negatif, deduplikasi notifikasi, serta perhitungan setelah void.
8. Filter, pencarian, sorting, pagination, ekspor seluruh hasil filter CSV/PDF, dan penolakan query tidak valid.
9. Rekening arsip tidak menerima transaksi baru, history tetap tersedia, currency terkunci, timezone tidak valid ditolak.
10. Recurring catch-up, satu kejadian per periode, jeda/lanjut, akhir jadwal, tanggal 31 dan tahun kabisat.
11. Recurring gagal pada rekening arsip tanpa transaksi parsial; notifikasi tidak berulang untuk kejadian sama; jadwal bisa diakhiri.
12. Kontribusi tabungan idempotent, edit/void progres, indikator tercapai, saldo tidak berubah, otorisasi kontribusi.
13. Pembayaran tagihan baru/existing, retry, satu periode berikutnya, void/pembayaran ulang, penolakan satu transaksi untuk dua tagihan.
14. Preferensi notifikasi, baca notifikasi, isolasi data, dan jumlah transaksi tidak berubah.
15. Backup database konsisten dan restore dengan integrity/foreign key check.
16. Respons pemulihan seragam, token sekali pakai/kedaluwarsa, pencabutan sesi, login kata sandi baru, logout mencabut sesi.
17. Penghapusan memerlukan kata sandi/konfirmasi, cascade data, sesi tidak bisa dipakai lagi.
18. Rate limit autentikasi menghasilkan 429 setelah batas tercapai.

## Smoke test Docker

Melalui nginx port 8080: health API, direct SPA route `/transactions`, registrasi, cookie/CSRF, tambah rekening, pengeluaran 25,50 dari saldo 1.000 menjadi 974,50, laporan terfilter, CSV, signature PDF, serta email pemulihan diterima pada Mailpit. Akun uji dihapus melalui API dan akses sesi ditolak sesudahnya.

Uji restart terpisah membuat jadwal due, merestart backend dua kali, memeriksa saldo bertambah tepat 25 dan jumlah transaksi recurring tetap satu, lalu menghapus akun uji. Pengujian ini menggunakan scheduler server sungguhan saat startup, bukan endpoint process.

## Pemeriksaan browser

- Login pengguna development berisi data fiktif berhasil.
- Dashboard menampilkan saldo, arus kas, grafik harian, distribusi kategori, anggaran, target, tagihan, dan perbandingan bulan dari database.
- Form pengeluaran diisi dan disimpan melalui browser. Transaksi 25.000 tampil pada aktivitas terbaru; saldo turun 25.000 dan penggunaan anggaran kategori naik 25.000.
- Navigasi menu ponsel dan pencarian transaksi diperiksa; pencarian `Uji browser` menghasilkan satu baris yang sesuai.
- Breakpoint ponsel 390 × 844 dan desktop 1440 × 1000 diperiksa. Tidak ada overflow horizontal pada halaman; tabel transaksi memiliki scroll lokal untuk kolom tambahan.
- Sidebar tersembunyi pada ponsel menggunakan inert agar tidak menerima fokus keyboard; dialog menggunakan elemen native `<dialog>`.
- Sempat terjadi error React Fast Refresh ketika file context diganti saat sesi pengembangan aktif; full reload digunakan untuk memeriksa versi akhir. Hal ini tidak muncul pada build produksi.

Screenshot: [desktop dashboard](screenshots/desktop-dashboard.jpg), [mobile transactions](screenshots/mobile-transactions.jpg). Data pada screenshot adalah data fiktif development dan tidak disertakan sebagai database dalam arsip source.

## Pemeriksaan PDF

Ekspor dari 56 transaksi development menghasilkan laporan **5 halaman A4**, setelah font Noto Sans tersemat. Halaman pertama dan terakhir dirender memakai Poppler dan diperiksa secara visual: identitas, pemilik, periode/filter, ringkasan, rincian, header lanjutan, serta penomoran halaman terbaca tanpa tumpang tindih. Ekstraksi pypdf mengonfirmasi karakter `·` pada nama rekening dipertahankan. PDF ini merupakan hasil verifikasi sementara, bukan data keuangan pengguna.

## Batas verifikasi

Pengujian dilakukan lokal dan dalam Compose pada satu mesin. Belum ada uji beban skala besar, audit keamanan independen, email SMTP internet, domain/HTTPS produksi, screen-reader end-to-end, atau proses operasional backup terjadwal. Font PDF belum menyertakan glyph CJK/emoji. P2 yang dikecualikan PRD tidak diimplementasikan. Tidak ada klaim aplikasi sudah diaudit atau disertifikasi untuk penggunaan finansial produksi.
