# Keputusan implementasi

## Tahapan yang telah dikerjakan

1. P0 fondasi: autentikasi, sesi server-side, isolasi user, rekening dan kategori, ledger transaksi/transfer, filter, dashboard, anggaran/notifikasi, CSV.
2. P1: recurring otomatis, target dan kontribusi, tagihan berulang/pengingat, preferensi, perbandingan bulan, PDF.
3. Integrasi dan verifikasi: frontend berbasis API nyata, database persisten, Docker Compose, email lokal, pengujian integrasi, browser desktop/mobile, backup/restore, dokumentasi.

## Penyesuaian model database

PRD menyatakan model koleksi MongoDB bersifat konseptual dan dapat disesuaikan. Implementasi ini menggunakan SQLite untuk menyediakan database persisten yang langsung berjalan tanpa replica set, dengan transaksi ACID pada operasi ledger, pembayaran, idempotensi, dan scheduler. Ini merupakan **penyesuaian teknis dari rekomendasi MongoDB**, bukan implementasi MongoDB.

Tabel `users`, `sessions`, `password_resets`, `records`, `idempotency`, dan `schema_migrations` memiliki constraint dan relasi kepemilikan. Entitas keuangan pada `records` menyimpan dokumen JSON tervalidasi yang dibedakan oleh `kind`. Indeks mencakup pemilik/jenis, tanggal, rekening, kategori, serta constraint unik untuk periode anggaran, deduplikasi notifikasi, pembayaran, dan kejadian recurring.

Repository hanya menyediakan operasi dengan `userId` eksplisit. Semua route mengambil userId dari sesi yang diverifikasi, bukan dari payload. Referensi rekening, kategori, transaksi, goal, kontribusi, dan tagihan selalu diperiksa kepemilikannya sebelum dipakai.

Migrasi awal dijalankan saat membuka database; skema diberi versi. Untuk perubahan skema berikutnya, tambahkan migrasi berversi yang dijalankan berurutan, dengan backup sebelum deploy. File database native dan volume Docker berbeda secara sengaja.

## Integritas

Saldo dan anggaran merupakan hasil agregasi transaksi aktif, sehingga tidak ada cache saldo yang bisa tertinggal. Transfer satu dokumen mengikat dua rekening dan dua dampaknya. Pencatatan, perubahan, void, pembayaran, serta kunci idempotensi dibungkus `BEGIN IMMEDIATE` dan rollback pada kegagalan.

Kunci idempotensi dibatasi per user, method, dan path, menyimpan fingerprint payload dan respons setelah sukses. Payload berbeda dengan kunci yang sama ditolak 409. Kunci disimpan selama akun ada agar retry lama tidak membuat transaksi baru. Pada volume besar, rancang retensi dengan jaminan periode retry yang eksplisit.

Kejadian recurring unik berdasarkan jadwal + tanggal. Perubahan `nextRunAt` dan pembuatan transaksi berada dalam commit yang sama. Jadwal gagal mempertahankan tanggal berikutnya dan memberi notifikasi deduplikasi. Proses berjalan di backend saat startup dan setiap 60 detik, tidak bergantung pada browser terbuka. Setiap pengguna diproses menurut zona waktunya.

Notifikasi anggaran dikeluarkan sekali per ambang/ID anggaran. Pengingat tagihan dikeluarkan sekali untuk fase mendatang/hari ini/terlambat. Perubahan data tetap dihitung meski notifikasi dimatikan.

## Keamanan dan privasi

Password bcrypt cost 12, minimal 10 karakter, huruf+angka, maksimal 72 byte UTF-8. Sesi cookie HttpOnly + SameSite Strict, hash token di database, expiry 7 hari. Token CSRF server-side diverifikasi untuk semua mutasi privat; guard origin dan JSON content type melindungi route autentikasi serta API. Endpoint autentikasi dibatasi 20 request per 15 menit per alamat IP per proses.

Token reset hanya hash di database, 30 menit, sekali pakai; reset mencabut seluruh sesi. SMTP menangkap email hanya di Mailpit untuk Compose lokal. Development tanpa SMTP menggunakan outbox lokal yang diabaikan Git. Token/email/kata sandi tidak dicatat ke log aplikasi.

Input diperiksa Zod, query SQL memakai parameter, error internal tidak diteruskan ke client, output JSX tidak memakai HTML dari pengguna. CSV mengawali formula-like values dengan apostrof. CSP dan header keamanan dipasang oleh Express/nginx. Mode development menerima alias loopback localhost/127.0.0.1 pada port/protokol yang sama; produksi hanya menerima APP_ORIGIN persis.

Penghapusan akun memerlukan password serta frasa konfirmasi dan menghapus baris pemilik beserta data turunannya melalui foreign key. Backup lama dapat masih memuat data yang dihapus; pengelola harus menentukan retensi backup dan kontrol akses. Kebijakan retensi operasional tidak diasumsikan sebagai persetujuan pengguna untuk menyimpan data tanpa batas.

## Frontend

React Router menyediakan navigasi. Halaman dimuat secara lazy, sehingga library grafik tidak membebani halaman login. Context menyimpan sesi/CSRF di memori; token sesi tidak ditaruh di localStorage. Request ke API memakai cookie origin yang sama, dan proxy Vite/nginx memisahkan frontend dari backend tanpa CORS permisif.

Perubahan memuat ulang data terkait dan dashboard. Form memiliki validasi browser/server, status loading/error/sukses, serta tombol disabled selama request. Dialog native mendukung Escape/fokus. Sidebar ponsel memakai inert agar menu tersembunyi tidak ikut urutan Tab. Fetch list transaksi membatalkan request filter lama; hasil milik user sebelumnya diabaikan bila sesi berubah saat request berjalan.

## Batas rilis

SQLite dan rate limiter in-memory ditujukan untuk satu instance. Tidak ada integrasi bank/payment gateway dan tidak ada transaksi uang sungguhan. Tidak ada konversi kurs, push, impor CSV, fitur bersama, atau insight AI. Perubahan mata uang dibatasi setelah data dibuat. Kontribusi hanya progres. Font PDF menyertakan Noto Sans; glyph CJK dan emoji perlu font fallback tambahan. Sasaran metrik produk dalam PRD belum diberi baseline; belum ada pengiriman analytics ke layanan eksternal.
