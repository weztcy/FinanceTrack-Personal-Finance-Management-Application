# Kontrak API FinanceTrack v1

Base URL: `/api`. Semua payload request/response JSON, kecuali ekspor CSV/PDF. Waktu audit ISO 8601 UTC, tanggal keuangan `YYYY-MM-DD`, periode anggaran `YYYY-MM`. ID UUID. Nominal request berupa string desimal (direkomendasikan) atau angka finite, > 0 dengan maksimal 2 desimal; saldo awal boleh 0/negatif. Maksimum nominal per catatan 10 miliar unit mata uang.

## Sesi dan mutasi

`POST /auth/register` dan `POST /auth/login` mengembalikan `{user, csrfToken}` dan cookie HttpOnly `ft_session`. Browser harus menyimpan cookie melalui `credentials: same-origin`. `GET /profile` mengembalikan profil dan token CSRF dari sesi saat ini.

Semua mutasi privat memerlukan `Content-Type: application/json`, cookie sesi, dan `X-CSRF-Token`. Origin harus sesuai `APP_ORIGIN` bila header Origin disertakan. POST membuat rekening/kategori/transaksi/transfer/anggaran/jadwal/target/kontribusi/tagihan, serta pembayaran tagihan, juga memerlukan `Idempotency-Key` 8–100 karakter `[A-Za-z0-9_-]`; gunakan UUID. Retry harus memakai key, path, dan payload yang sama. Data berbeda dengan key sama menghasilkan 409. Frontend mempertahankan key pada kegagalan jaringan/5xx.

Status: `200` sukses, `201` dibuat/replay create, `400` aturan bisnis, `401` sesi tidak valid, `403` CSRF/origin/password salah, `404` tidak ditemukan atau bukan pemilik, `409` konflik, `415` content type, `422` validasi, `429` rate limit. Error `{message, errors?: [{field,message}]}`; error 500 tidak memuat detail internal.

## Autentikasi/profil

| Method | Path | Body / respons |
|---|---|---|
| POST | `/auth/register` | `{name,email,password,currency?,timezone?}`; default IDR, Asia/Jakarta; kategori bawaan dibuat per user |
| POST | `/auth/login` | `{email,password}` |
| POST | `/auth/logout` | `{}`; sesi saat ini dicabut |
| POST | `/auth/forgot-password` | `{email}`; selalu pesan generik untuk email terdaftar/tidak terdaftar |
| POST | `/auth/reset-password` | `{token,password}`; token 64 karakter; mencabut seluruh sesi |
| POST | `/auth/change-password` | `{currentPassword,password}`; mencabut sesi lain |
| GET | `/profile` | `{user,csrfToken}` |
| PATCH | `/profile` | bagian dari `{name,currency,timezone,theme,notificationPreferences:{budget,bill,recurring}}` |
| DELETE | `/profile` | `{password,confirmation:"HAPUS AKUN"}` |
| GET | `/health` | publik `{status:"ok",service:"FinanceTrack API"}` |

Mata uang: IDR/USD/EUR/SGD/MYR. Tema: light/dark/system. Zona waktu harus valid menurut Intl. Email tidak bisa diubah pada rilis ini.

## Rekening dan kategori

| Method | Path | Body |
|---|---|---|
| GET/POST | `/accounts` | POST `{name,type,openingBalance,openingBalanceDate,description?}`; type cash/bank/ewallet/other |
| GET/PATCH | `/accounts/:id` | PATCH hanya `{name?,type?,description?}` |
| POST | `/accounts/:id/archive` | `{}` |
| GET/POST | `/categories` | POST `{name,type,color?}`; income/expense; warna hex `#RRGGBB` |
| PATCH | `/categories/:id` | `{name?,type?,color?}`; perubahan tipe ditolak jika sudah direferensikan |
| DELETE | `/categories/:id` | `{}`; mengarsipkan, bukan menghilangkan riwayat |

GET list mengembalikan array, termasuk arsip. Rekening berisi `balance`, `openingBalance`, `currency`, `isArchived`. Saldo awal immutable.

## Transaksi

`POST /transactions`: `{type,amount,date,description?,accountId,categoryId}` untuk income/expense. Transfer: `{type:"transfer",amount,date,description?,fromAccountId,toAccountId}`. `POST /transfers` menerima payload transfer tanpa `type`. Rekening sumber dan tujuan berbeda; kategori tidak diperbolehkan untuk transfer.

`GET /transactions` mendukung:

| Query | Validasi |
|---|---|
| `startDate`, `endDate` | tanggal valid; mulai <= akhir |
| `accountId`, `categoryId` | UUID |
| `type` | income/expense/transfer |
| `search` | substring deskripsi, maksimal 200 karakter |
| `sort` | date_desc (default), date_asc, amount_desc, amount_asc |
| `page` | integer 1–100000, default 1 |
| `pageSize` | integer 1–100, default 20 |

Respons `{items,total,page,pageSize,pages}`. Hanya transaksi active. Semua filter dikombinasikan AND. Filter rekening mencakup kedua sisi transfer.

`GET /transactions/:id` mengembalikan detail, status, sumber, timestamps, dan `history` audit. Detail void tetap bisa dibuka dengan ID milik sendiri. `PATCH /transactions/:id` menerima subset field transaksi, menghitung ulang dampak. `POST /transactions/:id/void` body `{}` membatalkan transaksi. Edit pembayaran tagihan harus mempertahankan type expense, nominal, dan kategori yang sesuai. Void pembayaran membuka kembali tagihan.

## Anggaran, jadwal, target

| Method | Path | Body |
|---|---|---|
| GET/POST | `/budgets` | POST `{categoryId,period,limitAmount,warningThreshold?}` default ambang 80, range 1–99 |
| PATCH/DELETE | `/budgets/:id` | PATCH subset; DELETE menghapus batas, transaksi tetap |
| GET/POST | `/recurring` | POST `{type,amount,accountId,categoryId,description?,startDate,endDate?,frequency}` |
| PATCH | `/recurring/:id` | subset field serta `{isPaused?,isEnded?}`; endDate bisa null; jadwal diakhiri tidak bisa diaktifkan lagi |
| POST | `/recurring/process` | `{}`; proses jadwal jatuh tempo milik user saat ini; scheduler juga berjalan tanpa endpoint ini |
| GET/POST | `/goals` | POST `{name,targetAmount,targetDate?,accountId?,status?}` |
| PATCH | `/goals/:id` | subset; status active/paused/completed/archived; optional date/account bisa null |
| GET/POST | `/goals/:id/contributions` | POST `{amount,date,note?}`; hanya target active; mode progress-only |
| PATCH | `/goals/:id/contributions/:contributionId` | subset `{amount,date,note}` |
| POST | `/goals/:id/contributions/:contributionId/void` | `{}` |

Budget respons berisi `spent`, `remaining`, `percentage`, status safe/warning/exceeded. Goal respons berisi `currentAmount`, `remaining`, `percentage`, `isAchieved`; persentase aktual bisa >100, progressbar UI dibatasi. Frekuensi recurring daily/weekly/monthly/yearly. Perubahan tanggal mulai setelah eksekusi wajib setelah `lastRunAt` untuk menjaga sejarah. Mengubah frekuensi jadwal yang sudah berjalan dapat dilakukan bersama tanggal mulai baru.

## Tagihan, notifikasi

| Method | Path | Body |
|---|---|---|
| GET/POST | `/bills` | POST `{name,amount,dueDate,categoryId,frequency?,reminderDays?,note?}`; frequency once/daily/weekly/monthly/yearly; reminder 0–30 default 3 |
| PATCH | `/bills/:id` | subset ditambah isArchived; tagihan dibayar immutable |
| POST | `/bills/:id/pay` | `{accountId,date?}` membuat expense atau `{transactionId}` menghubungkan expense aktif dengan nominal/kategori sama |
| GET | `/notifications` | array notifikasi, termasuk history terbaca |
| PATCH | `/notifications/:id/read` | `{}` |
| POST | `/notifications/read-all` | `{}` |

Pembayaran yang diulang mengembalikan hasil pembayaran yang ada dan tidak membuat transaksi/periode ganda. Periode tagihan berikutnya memiliki ID baru dan referensi parent. Status bill: upcoming/due/overdue/paid.

## Dashboard dan laporan

- `GET /dashboard/summary` dan `/dashboard/trends`: periode default bulan berjalan dalam zona waktu user; menerima filter transaksi. Berisi `income`, `expense`, `net`, `transfer`, `totalBalance`, `accounts`, `categories`, `daily`, `trends`, `comparison`, `recent`, `budgets`, `goals`, `bills`. Total saldo adalah saldo saat ini rekening aktif, sedangkan arus kas/grafik mengikuti periode. Perbandingan mencakup enam bulan sampai periode akhir terpilih.
- `GET /reports/summary`: filter transaksi yang sama; seluruh periode bila rentang tidak diisi. Berisi summary dan `transactions` berpagination.
- `GET /reports/export.csv`: seluruh hasil filter tanpa batas pagination; kolom tanggal, jenis, deskripsi, kategori, rekening, tujuan, nominal, mata uang. UTF-8 BOM, CRLF, nominal desimal konsisten.
- `GET /reports/export.pdf`: seluruh hasil filter tanpa batas pagination; metadata laporan, pemilik, periode, filter, ringkasan, rincian, header/footer, dan nomor halaman. Font Noto Sans tersemat.

Ekspor menggunakan cookie sesi dan tidak membutuhkan token di URL. Query pagination tidak membatasi ekspor; filter lainnya sama dengan laporan yang sedang dilihat.
