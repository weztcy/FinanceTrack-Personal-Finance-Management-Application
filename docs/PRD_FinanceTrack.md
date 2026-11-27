# Product Requirements Document (PRD)

## FinanceTrack --- Personal Finance Management Application

**Versi:** 1.0\
**Tanggal:** 9 November 2026\
**Status:** Draft awal untuk pengembangan MVP\
**Platform:** Web application

------------------------------------------------------------------------

## 1. Ringkasan Produk

FinanceTrack adalah aplikasi web pengelolaan keuangan pribadi yang
memungkinkan pengguna mencatat transaksi, mengelola beberapa rekening,
menyusun anggaran, memantau target tabungan, mengingat pembayaran
tagihan, serta menganalisis kondisi keuangan melalui dashboard dan
laporan.

Produk berfokus pada pencatatan manual yang terstruktur dan pemantauan
keuangan personal. Setiap pengguna hanya dapat mengakses data yang
dimilikinya. Sistem harus menjaga konsistensi saldo, mencegah pencatatan
transaksi ganda akibat pengiriman form berulang, serta menyediakan
riwayat transaksi yang dapat ditelusuri.

### 1.1 Tujuan Produk

1.  Memudahkan pengguna mencatat seluruh pemasukan, pengeluaran, dan
    transfer antarrekening.
2.  Memberikan gambaran kondisi keuangan terkini melalui saldo dan
    ringkasan arus kas.
3.  Membantu pengguna mengendalikan pengeluaran melalui anggaran per
    kategori.
4.  Membantu pengguna mencapai tujuan finansial melalui target tabungan.
5.  Mengurangi risiko keterlambatan pembayaran melalui pengingat
    tagihan.
6.  Menyediakan laporan yang dapat difilter dan diekspor untuk evaluasi
    keuangan.

### 1.2 Prinsip Produk

-   **Personal dan privat:** data keuangan terisolasi per akun.
-   **Akurat:** saldo dan ringkasan dihitung dari transaksi yang valid.
-   **Mudah digunakan:** proses pencatatan transaksi dibuat singkat dan
    konsisten.
-   **Transparan:** perubahan data penting dapat ditelusuri melalui
    riwayat.
-   **Berbasis MVP:** fitur inti diselesaikan terlebih dahulu sebelum
    integrasi eksternal atau otomasi lanjutan.

------------------------------------------------------------------------

## 2. Target Pengguna dan Kebutuhan

### 2.1 Target Pengguna

Individu yang ingin mengelola keuangan pribadi, termasuk mahasiswa,
pekerja, freelancer, dan keluarga yang melakukan pencatatan keuangan
secara mandiri.

### 2.2 Kebutuhan Utama Pengguna

-   Mengetahui total saldo seluruh rekening.
-   Mengetahui sumber pemasukan dan penggunaan uang.
-   Mencatat transaksi harian dengan cepat.
-   Memisahkan uang berdasarkan rekening atau dompet.
-   Mengetahui apakah pengeluaran masih sesuai anggaran.
-   Melihat perkembangan tabungan dan kewajiban pembayaran.
-   Membandingkan kondisi keuangan antarperiode.

------------------------------------------------------------------------

## 3. Ruang Lingkup Produk

### 3.1 Cakupan MVP

1.  Registrasi, login, logout, dan pengelolaan profil dasar.
2.  Dashboard ringkasan keuangan.
3.  Pengelolaan rekening.
4.  Pengelolaan kategori pemasukan dan pengeluaran.
5.  Pencatatan pemasukan, pengeluaran, dan transfer.
6.  Daftar transaksi, pencarian, filter, edit, dan hapus.
7.  Anggaran bulanan per kategori pengeluaran.
8.  Notifikasi penggunaan anggaran.
9.  Transaksi berulang.
10. Target tabungan dan pencatatan kontribusi.
11. Tagihan dan pengingat jatuh tempo.
12. Laporan dan ekspor CSV/PDF.
13. Pengaturan dasar aplikasi dan preferensi pengguna.

### 3.2 Di Luar Cakupan MVP

-   Sinkronisasi otomatis dengan bank atau open banking.
-   Pembayaran tagihan langsung dari aplikasi.
-   Pembelian atau penjualan investasi.
-   Pengelolaan pajak dan akuntansi bisnis.
-   Fitur multi-user, keluarga, atau shared wallet.
-   OCR otomatis untuk membaca struk.
-   Integrasi WhatsApp, SMS, atau push notification native.
-   Rekomendasi finansial berbasis AI.

Fitur di luar cakupan dapat dipertimbangkan setelah kebutuhan MVP
tervalidasi.

------------------------------------------------------------------------

## 4. Peran dan Hak Akses

### 4.1 Pengguna Terdaftar

Pengguna terdaftar dapat: - Mengakses dan mengubah profil miliknya. -
Mengelola rekening, kategori, transaksi, anggaran, target tabungan, dan
tagihan miliknya. - Melihat dashboard serta laporan miliknya. - Mengatur
preferensi notifikasi dan mata uang. - Mengekspor data keuangannya
sendiri.

### 4.2 Administrator Sistem

Untuk MVP, antarmuka administrator tidak wajib disediakan. Operasional
teknis dapat dilakukan melalui lingkungan server dan database yang
dibatasi aksesnya. Administrator teknis tidak boleh memperoleh akses
rutin ke data finansial pengguna tanpa dasar operasional dan kontrol
akses yang sah.

------------------------------------------------------------------------

## 5. Kebutuhan Fungsional

### 5.1 Autentikasi dan Akun

**FR-AUTH-01 --- Registrasi** - Pengguna dapat membuat akun menggunakan
nama, alamat email, dan kata sandi. - Sistem memvalidasi format email
dan kekuatan minimum kata sandi. - Email harus unik. - Kata sandi
disimpan dalam bentuk hash, bukan teks asli. - Sistem menampilkan pesan
kesalahan yang jelas jika data tidak valid atau email telah digunakan.

**FR-AUTH-02 --- Login** - Pengguna dapat login menggunakan email dan
kata sandi. - Sistem membuat sesi autentikasi yang aman setelah
kredensial valid. - Sistem menolak login jika kredensial tidak sesuai.

**FR-AUTH-03 --- Logout** - Pengguna dapat mengakhiri sesi. - Token atau
sesi autentikasi harus tidak dapat digunakan kembali setelah logout
sesuai mekanisme autentikasi yang dipilih.

**FR-AUTH-04 --- Pemulihan Kata Sandi** - Pengguna dapat meminta tautan
atau kode pemulihan melalui email. - Token pemulihan memiliki masa
berlaku dan hanya dapat digunakan satu kali. - Sistem tidak
mengungkapkan apakah suatu email terdaftar melalui pesan respons yang
berbeda.

**FR-AUTH-05 --- Profil dan Preferensi** - Pengguna dapat mengubah nama,
zona waktu, mata uang utama, dan preferensi tampilan. - Perubahan mata
uang utama tidak boleh secara diam-diam mengonversi nominal transaksi
lama. - Sistem harus menjelaskan bahwa nominal transaksi disimpan sesuai
mata uang yang dipilih saat pencatatan, jika aplikasi mendukung lebih
dari satu mata uang.

### 5.2 Dashboard

**FR-DASH-01 --- Ringkasan Saldo** - Menampilkan total saldo seluruh
rekening aktif milik pengguna. - Menampilkan saldo per rekening. - Saldo
dihitung dari saldo awal ditambah pemasukan, dikurangi pengeluaran,
serta memperhitungkan transfer masuk dan keluar.

**FR-DASH-02 --- Ringkasan Arus Kas** - Menampilkan total pemasukan dan
pengeluaran untuk periode yang dipilih. - Periode default adalah bulan
berjalan. - Transfer antarrekening tidak dihitung sebagai pemasukan atau
pengeluaran.

**FR-DASH-03 --- Visualisasi** - Menampilkan grafik tren pemasukan dan
pengeluaran. - Menampilkan distribusi pengeluaran berdasarkan
kategori. - Menampilkan perbandingan pengeluaran antarbulan. - Grafik
harus mengikuti rentang periode dan filter yang dipilih.

**FR-DASH-04 --- Aktivitas Terbaru** - Menampilkan daftar transaksi
terbaru. - Setiap item menampilkan tanggal, deskripsi, kategori,
rekening, jenis transaksi, dan nominal. - Pengguna dapat membuka detail
transaksi dari daftar tersebut.

**FR-DASH-05 --- Ringkasan Anggaran dan Target** - Menampilkan anggaran
yang paling mendekati batas. - Menampilkan progres target tabungan
aktif. - Menampilkan tagihan yang akan jatuh tempo atau terlambat.

### 5.3 Pengelolaan Rekening

**FR-ACC-01 --- Tambah Rekening** - Pengguna dapat membuat rekening
dengan nama, jenis rekening, saldo awal, mata uang, dan keterangan
opsional. - Jenis rekening minimal: tunai, rekening bank, e-wallet, dan
lainnya. - Saldo awal dan tanggal saldo awal wajib dicatat.

**FR-ACC-02 --- Lihat dan Ubah Rekening** - Pengguna dapat melihat
daftar rekening dan saldo masing-masing. - Pengguna dapat mengubah nama,
jenis, dan keterangan rekening. - Perubahan saldo awal harus memiliki
aturan yang jelas agar tidak mengubah saldo historis secara tidak
terduga.

**FR-ACC-03 --- Arsipkan Rekening** - Pengguna dapat menonaktifkan atau
mengarsipkan rekening. - Rekening yang memiliki riwayat transaksi tidak
dihapus permanen melalui operasi biasa. - Rekening arsip tidak tersedia
sebagai pilihan transaksi baru, tetapi tetap muncul pada riwayat.

**FR-ACC-04 --- Saldo Rekening** - Saldo rekening dihitung dari saldo
awal dan transaksi yang terkait. - Transfer mengurangi saldo rekening
sumber dan menambah saldo rekening tujuan. - Sistem harus menjaga agar
transfer tidak dihitung sebagai pendapatan atau pengeluaran.

### 5.4 Kategori Transaksi

**FR-CAT-01 --- Kategori Bawaan** - Sistem menyediakan kategori awal
untuk pemasukan dan pengeluaran. - Contoh pengeluaran: makanan,
transportasi, pendidikan, hiburan, kesehatan, tempat tinggal, belanja,
dan kebutuhan rumah tangga. - Contoh pemasukan: gaji, bisnis, hadiah,
investasi, dan pemasukan lainnya.

**FR-CAT-02 --- Kategori Kustom** - Pengguna dapat menambah, mengubah,
dan mengarsipkan kategori miliknya. - Kategori memiliki nama, tipe
(pemasukan/pengeluaran), warna atau ikon opsional. - Kategori tidak
boleh dihapus jika masih digunakan transaksi; pengguna dapat
mengarsipkannya.

**FR-CAT-03 --- Validasi Kategori** - Kategori pemasukan hanya dapat
digunakan untuk transaksi pemasukan. - Kategori pengeluaran hanya dapat
digunakan untuk transaksi pengeluaran. - Transfer tidak menggunakan
kategori pemasukan atau pengeluaran.

### 5.5 Pencatatan Transaksi

**FR-TRX-01 --- Pemasukan** - Pengguna dapat mencatat pemasukan dengan
nominal, tanggal, rekening tujuan, kategori, dan deskripsi opsional. -
Nominal harus lebih besar dari nol. - Transaksi pemasukan menambah saldo
rekening.

**FR-TRX-02 --- Pengeluaran** - Pengguna dapat mencatat pengeluaran
dengan nominal, tanggal, rekening sumber, kategori, dan deskripsi
opsional. - Nominal harus lebih besar dari nol. - Transaksi pengeluaran
mengurangi saldo rekening.

**FR-TRX-03 --- Transfer** - Pengguna dapat memindahkan dana dari satu
rekening ke rekening lain. - Rekening sumber dan tujuan harus berbeda. -
Nominal harus lebih besar dari nol. - Transfer menghasilkan dampak debit
dan kredit yang saling terhubung. - Transfer tidak dimasukkan ke total
pemasukan atau pengeluaran.

**FR-TRX-04 --- Daftar Transaksi** - Pengguna dapat melihat transaksi
dalam bentuk daftar atau tabel. - Daftar mendukung pagination atau
pemuatan bertahap. - Pengguna dapat mencari berdasarkan deskripsi. -
Pengguna dapat memfilter berdasarkan jenis transaksi, rekening,
kategori, dan rentang tanggal. - Pengguna dapat mengurutkan berdasarkan
tanggal dan nominal.

**FR-TRX-05 --- Detail Transaksi** - Pengguna dapat membuka detail
transaksi untuk melihat seluruh informasi dan waktu
pencatatan/perubahan.

**FR-TRX-06 --- Edit Transaksi** - Pengguna dapat mengubah transaksi
miliknya. - Sistem menghitung ulang saldo dan ringkasan terkait setelah
perubahan. - Perubahan transfer harus memperbarui kedua sisi transfer
secara konsisten.

**FR-TRX-07 --- Hapus Transaksi** - Pengguna dapat menghapus transaksi
miliknya setelah konfirmasi. - Penghapusan transaksi mengembalikan
dampaknya terhadap saldo, anggaran, dan laporan. - Untuk menjaga
keterlacakan, implementasi sebaiknya menggunakan soft delete atau status
void, bukan menghilangkan jejak perubahan secara langsung.

**FR-TRX-08 --- Validasi dan Pencegahan Duplikasi** - Sistem menolak
nominal nol atau negatif. - Sistem mencegah transaksi ganda akibat
pengiriman request berulang melalui idempotency key atau mekanisme
setara. - Tanggal transaksi tidak boleh memiliki format tidak valid.

### 5.6 Anggaran Bulanan

**FR-BUD-01 --- Membuat Anggaran** - Pengguna dapat membuat anggaran
untuk kategori pengeluaran pada bulan dan tahun tertentu. - Setiap
anggaran memiliki batas nominal. - Sistem dapat mendukung beberapa
kategori anggaran dalam satu bulan. - Untuk MVP, satu kategori hanya
memiliki satu anggaran aktif per periode.

**FR-BUD-02 --- Perhitungan Penggunaan** - Sistem menjumlahkan transaksi
pengeluaran pada kategori dan periode yang sesuai. - Transfer dan
transaksi yang dibatalkan tidak dihitung. - Pengeluaran yang diedit atau
dihapus harus memperbarui penggunaan anggaran.

**FR-BUD-03 --- Status Anggaran** - Menampilkan nominal anggaran, jumlah
terpakai, sisa anggaran, dan persentase penggunaan. - Status minimal:
aman, mendekati batas, dan melewati batas. - Ambang notifikasi mendekati
batas dapat diatur pengguna; nilai awal yang disarankan adalah 80%.

**FR-BUD-04 --- Notifikasi Anggaran** - Sistem membuat notifikasi ketika
penggunaan mencapai ambang peringatan. - Sistem membuat notifikasi
ketika penggunaan mencapai atau melewati 100%. - Notifikasi tidak
dikirim berulang untuk kondisi yang sama secara tidak terkendali. -
Pengguna dapat melihat notifikasi di dalam aplikasi.

### 5.7 Recurring Transactions

**FR-REC-01 --- Membuat Transaksi Berulang** - Pengguna dapat membuat
jadwal transaksi rutin untuk pemasukan atau pengeluaran. - Data minimal:
jenis transaksi, nominal, rekening, kategori, deskripsi, tanggal mulai,
frekuensi, dan tanggal berakhir opsional. - Frekuensi minimal: harian,
mingguan, bulanan, dan tahunan.

**FR-REC-02 --- Pemrosesan Jadwal** - Sistem memproses jadwal yang jatuh
tempo dan membuat transaksi sesuai konfigurasi. - Sistem tidak boleh
membuat transaksi ganda untuk satu jadwal dan satu periode. - Tanggal
eksekusi berikutnya dihitung berdasarkan aturan frekuensi.

**FR-REC-03 --- Pengelolaan Jadwal** - Pengguna dapat melihat, mengubah,
menjeda, melanjutkan, dan mengakhiri jadwal. - Perubahan jadwal berlaku
untuk eksekusi berikutnya dan tidak mengubah transaksi historis yang
telah dibuat. - Pengguna dapat membedakan transaksi hasil jadwal
otomatis dan transaksi manual.

**FR-REC-04 --- Kegagalan Eksekusi** - Jika rekening tidak aktif atau
data jadwal tidak valid, sistem mencatat kegagalan dan memberi tahu
pengguna. - Sistem tidak boleh membuat transaksi parsial yang mengubah
saldo secara tidak konsisten.

### 5.8 Target Tabungan

**FR-SAV-01 --- Membuat Target** - Pengguna dapat membuat target
tabungan dengan nama, nominal target, tanggal target opsional, dan
rekening terkait opsional. - Nominal target harus lebih besar dari nol.

**FR-SAV-02 --- Kontribusi Target** - Pengguna dapat mencatat kontribusi
ke target tabungan. - Kontribusi dapat dicatat sebagai alokasi dari
rekening atau sebagai catatan progres, dengan aturan yang eksplisit. -
Jika kontribusi memindahkan uang antarrekening, sistem mencatatnya
sebagai transfer dan bukan pengeluaran. - Sistem harus menghindari
penghitungan ganda antara saldo rekening dan progres target.

**FR-SAV-03 --- Progres Target** - Menampilkan jumlah terkumpul, sisa
target, dan persentase progres. - Progres diperbarui ketika kontribusi
ditambah, diubah, atau dibatalkan. - Sistem menandai target tercapai
ketika jumlah terkumpul sama dengan atau melebihi nominal target.

**FR-SAV-04 --- Pengelolaan Target** - Pengguna dapat mengubah, menjeda,
menyelesaikan, atau mengarsipkan target. - Riwayat kontribusi tetap
dapat dilihat.

### 5.9 Tagihan dan Pengingat Pembayaran

**FR-BILL-01 --- Membuat Tagihan** - Pengguna dapat mencatat nama
tagihan, nominal perkiraan atau tetap, tanggal jatuh tempo, frekuensi,
kategori, dan catatan. - Contoh tagihan: listrik, air, internet, sewa,
cicilan, dan langganan.

**FR-BILL-02 --- Pengingat** - Sistem membuat pengingat sebelum tanggal
jatuh tempo sesuai preferensi pengguna. - Pengingat ditampilkan pada
pusat notifikasi aplikasi. - Pengingat dapat dikonfigurasi, misalnya 1,
3, atau 7 hari sebelum jatuh tempo.

**FR-BILL-03 --- Status Tagihan** - Status tagihan minimal: akan jatuh
tempo, jatuh tempo hari ini, terlambat, dan dibayar. - Pengguna dapat
menandai tagihan sebagai telah dibayar. - Pengguna dapat menghubungkan
pembayaran dengan transaksi pengeluaran yang sudah ada atau membuat
transaksi pengeluaran saat menandai pembayaran. - Sistem mencegah satu
pembayaran tercatat dua kali.

**FR-BILL-04 --- Tagihan Berulang** - Pengguna dapat mengatur tagihan
berulang. - Sistem membuat periode tagihan berikutnya sesuai
frekuensi. - Tagihan yang telah dibayar tidak boleh otomatis ditandai
belum dibayar kembali pada periode yang sama.

### 5.10 Notifikasi Dalam Aplikasi

**FR-NOT-01 --- Pusat Notifikasi** - Pengguna dapat melihat daftar
notifikasi. - Notifikasi mencakup peringatan anggaran, pengingat
tagihan, dan kegagalan transaksi berulang. - Setiap notifikasi memiliki
waktu, jenis, pesan, dan status telah dibaca/belum dibaca.

**FR-NOT-02 --- Status Notifikasi** - Pengguna dapat menandai notifikasi
sebagai telah dibaca. - Sistem dapat menampilkan jumlah notifikasi yang
belum dibaca. - Notifikasi lama dapat tetap diakses melalui riwayat.

**FR-NOT-03 --- Preferensi** - Pengguna dapat mengaktifkan atau
menonaktifkan jenis notifikasi yang tersedia. - Preferensi notifikasi
tidak boleh mengubah status atau data transaksi.

### 5.11 Laporan dan Ekspor

**FR-REP-01 --- Filter Laporan** - Pengguna dapat memilih rentang
tanggal. - Pengguna dapat memfilter laporan berdasarkan rekening,
kategori, dan jenis transaksi. - Sistem memvalidasi tanggal mulai agar
tidak melewati tanggal akhir.

**FR-REP-02 --- Ringkasan Laporan** - Menampilkan total pemasukan, total
pengeluaran, selisih arus kas, dan rincian transaksi. - Menampilkan
ringkasan pengeluaran berdasarkan kategori. - Transfer ditampilkan
terpisah dan tidak memengaruhi total pemasukan/pengeluaran.

**FR-REP-03 --- Ekspor CSV** - Pengguna dapat mengunduh transaksi sesuai
filter dalam format CSV. - Kolom minimal: tanggal, jenis transaksi,
deskripsi, kategori, rekening, nominal, dan mata uang. - Format CSV
harus menggunakan encoding UTF-8 dan nilai yang konsisten agar dapat
dibuka di aplikasi spreadsheet.

**FR-REP-04 --- Ekspor PDF** - Pengguna dapat mengunduh laporan ringkas
dalam format PDF. - PDF memuat identitas FinanceTrack, periode laporan,
ringkasan, rincian transaksi, dan tanggal pembuatan. - Tata letak harus
tetap terbaca untuk laporan dengan banyak transaksi, misalnya melalui
pagination.

**FR-REP-05 --- Konsistensi Laporan** - Data laporan harus sesuai dengan
transaksi yang tercatat dan tidak memasukkan transaksi yang
dibatalkan. - Laporan yang diekspor harus mengikuti filter yang sedang
dipilih.

### 5.12 Pengaturan dan Privasi Data

**FR-SET-01 --- Pengaturan Akun** - Pengguna dapat memperbarui profil
dan preferensi. - Pengguna dapat meminta penghapusan akun melalui alur
konfirmasi. - Penghapusan akun harus menjelaskan konsekuensi terhadap
data keuangan.

**FR-SET-02 --- Isolasi Data** - Setiap dokumen keuangan harus terhubung
dengan user ID pemilik. - Seluruh operasi baca, tambah, ubah, dan hapus
harus memeriksa kepemilikan data di sisi backend. - Sistem tidak boleh
mengandalkan penyaringan data di frontend sebagai kontrol keamanan.

**FR-SET-03 --- Ekspor Data Pribadi** - Pengguna hanya dapat mengekspor
data miliknya. - Permintaan ekspor harus divalidasi dengan sesi pengguna
yang sah.

------------------------------------------------------------------------

## 6. Aturan Bisnis dan Perhitungan

### 6.1 Perhitungan Saldo

Untuk rekening dengan satu mata uang:

`Saldo akhir = Saldo awal + Total pemasukan + Transfer masuk - Total pengeluaran - Transfer keluar`

Transaksi yang berstatus void/dibatalkan tidak ikut dihitung.

### 6.2 Perhitungan Arus Kas

`Arus kas bersih = Total pemasukan - Total pengeluaran`

Transfer antarrekening milik pengguna tidak masuk ke perhitungan arus
kas.

### 6.3 Perhitungan Anggaran

`Persentase penggunaan = (Total pengeluaran kategori / Batas anggaran) × 100%`

`Sisa anggaran = Batas anggaran - Total pengeluaran kategori`

Sisa anggaran dapat bernilai negatif jika pengeluaran melampaui batas.

### 6.4 Perhitungan Target Tabungan

`Persentase progres = (Jumlah kontribusi valid / Target nominal) × 100%`

Tampilan progres dapat dibatasi 100%, tetapi jumlah terkumpul tetap
menampilkan nilai aktual jika melebihi target.

### 6.5 Aturan Transfer

-   Transfer wajib memiliki rekening sumber dan tujuan yang berbeda.
-   Transfer harus diproses secara atomik agar debit dan kredit tidak
    terpisah.
-   Transfer tidak boleh memunculkan pemasukan atau pengeluaran pada
    laporan arus kas.
-   Pembatalan transfer harus membalik kedua sisi secara konsisten.

### 6.6 Mata Uang

Untuk MVP, direkomendasikan satu mata uang utama per akun dan satu mata
uang yang sama untuk seluruh rekening agar perhitungan saldo keseluruhan
tidak ambigu. Jika multi-currency diaktifkan pada tahap berikutnya,
sistem harus menyimpan mata uang asli, kurs, tanggal kurs, dan nilai
konversi secara eksplisit.

------------------------------------------------------------------------

## 7. Alur Pengguna Utama

### 7.1 Pengguna Baru

1.  Pengguna membuka halaman FinanceTrack.
2.  Pengguna melakukan registrasi.
3.  Sistem memvalidasi dan membuat akun.
4.  Pengguna login.
5.  Pengguna diarahkan ke proses onboarding.
6.  Pengguna menentukan mata uang dan zona waktu.
7.  Pengguna membuat rekening pertama dan mengisi saldo awal.
8.  Pengguna dapat mulai mencatat transaksi.

### 7.2 Mencatat Pengeluaran

1.  Pengguna memilih menu Transaksi.
2.  Pengguna memilih jenis Pengeluaran.
3.  Pengguna mengisi nominal, tanggal, rekening, kategori, dan
    deskripsi.
4.  Sistem memvalidasi data.
5.  Pengguna menyimpan transaksi.
6.  Sistem menyimpan transaksi dan memperbarui saldo, dashboard,
    anggaran, serta laporan.
7.  Sistem menampilkan konfirmasi berhasil.

### 7.3 Melakukan Transfer

1.  Pengguna memilih menu Transfer.
2.  Pengguna memilih rekening sumber dan tujuan.
3.  Pengguna mengisi nominal, tanggal, dan catatan opsional.
4.  Sistem memvalidasi rekening dan nominal.
5.  Sistem menyimpan transfer sebagai satu operasi yang saling
    terhubung.
6.  Sistem memperbarui saldo kedua rekening.
7.  Dashboard dan laporan diperbarui tanpa mengubah total
    pemasukan/pengeluaran.

### 7.4 Membuat Anggaran

1.  Pengguna membuka menu Anggaran.
2.  Pengguna memilih periode dan kategori.
3.  Pengguna memasukkan batas anggaran.
4.  Sistem menyimpan anggaran.
5.  Sistem menghitung penggunaan berdasarkan transaksi pada periode
    tersebut.
6.  Sistem memperbarui status dan notifikasi saat ambang tercapai.

### 7.5 Menandai Tagihan Dibayar

1.  Pengguna membuka menu Tagihan.
2.  Pengguna memilih tagihan.
3.  Pengguna menekan tindakan Tandai Dibayar.
4.  Pengguna memilih transaksi pengeluaran yang sudah ada atau membuat
    transaksi baru.
5.  Sistem menghubungkan pembayaran dengan tagihan.
6.  Status tagihan berubah menjadi Dibayar dan transaksi tidak
    diduplikasi.

### 7.6 Mengunduh Laporan

1.  Pengguna membuka menu Laporan.
2.  Pengguna memilih rentang tanggal dan filter.
3.  Sistem menampilkan ringkasan serta daftar transaksi.
4.  Pengguna memilih CSV atau PDF.
5.  Sistem menghasilkan file berdasarkan filter.
6.  Pengguna mengunduh file.

------------------------------------------------------------------------

## 8. Struktur Halaman dan Navigasi

  -----------------------------------------------------------------------
  Halaman                             Fungsi utama
  ----------------------------------- -----------------------------------
  Landing / Login / Register          Akses akun dan informasi singkat
                                      produk

  Onboarding                          Pengaturan awal akun, mata uang,
                                      zona waktu, rekening

  Dashboard                           Ringkasan saldo, arus kas, grafik,
                                      aktivitas, peringatan

  Transactions                        Daftar, pencarian, filter, tambah,
                                      edit, dan detail transaksi

  Add Transaction                     Form pemasukan, pengeluaran, dan
                                      transfer

  Accounts                            Daftar dan pengelolaan rekening

  Categories                          Pengelolaan kategori transaksi

  Budgets                             Anggaran per kategori dan progres
                                      penggunaan

  Recurring                           Jadwal transaksi berulang

  Savings Goals                       Target tabungan dan riwayat
                                      kontribusi

  Bills & Reminders                   Daftar tagihan, status, dan
                                      pengingat

  Reports                             Filter, ringkasan, dan ekspor
                                      CSV/PDF

  Notifications                       Daftar notifikasi dan status baca

  Settings                            Profil, preferensi, keamanan, dan
                                      pengaturan akun
  -----------------------------------------------------------------------

Navigasi utama harus dapat digunakan pada desktop dan perangkat mobile.
Menu yang jarang digunakan dapat ditempatkan pada bagian pengaturan atau
menu sekunder.

------------------------------------------------------------------------

## 9. Model Data Konseptual

Seluruh entitas data personal wajib memiliki relasi kepemilikan
pengguna. Rancangan koleksi MongoDB berikut bersifat konseptual dan
dapat disesuaikan saat desain teknis.

### 9.1 User

-   `_id`
-   `name`
-   `email` (unik)
-   `passwordHash`
-   `currency`
-   `timezone`
-   `notificationPreferences`
-   `createdAt`
-   `updatedAt`

### 9.2 Account

-   `_id`
-   `userId`
-   `name`
-   `type`
-   `openingBalance`
-   `currency`
-   `openingBalanceDate`
-   `isArchived`
-   `createdAt`
-   `updatedAt`

### 9.3 Category

-   `_id`
-   `userId` atau penanda kategori sistem
-   `name`
-   `type` (income/expense)
-   `icon`
-   `color`
-   `isArchived`
-   `createdAt`
-   `updatedAt`

### 9.4 Transaction

-   `_id`
-   `userId`
-   `type` (income/expense/transfer)
-   `amount`
-   `currency`
-   `date`
-   `description`
-   `categoryId` (kosong untuk transfer)
-   `accountId` (untuk income/expense)
-   `transferGroupId` (untuk transfer)
-   `transferFromAccountId`
-   `transferToAccountId`
-   `status` (active/void)
-   `source` (manual/recurring/bill)
-   `createdAt`
-   `updatedAt`

### 9.5 Budget

-   `_id`
-   `userId`
-   `categoryId`
-   `month`
-   `year`
-   `limitAmount`
-   `warningThreshold`
-   `createdAt`
-   `updatedAt`

### 9.6 RecurringTransaction

-   `_id`
-   `userId`
-   `type`
-   `amount`
-   `accountId`
-   `categoryId`
-   `description`
-   `frequency`
-   `startDate`
-   `endDate`
-   `nextRunAt`
-   `isPaused`
-   `lastRunAt`
-   `createdAt`
-   `updatedAt`

### 9.7 SavingsGoal

-   `_id`
-   `userId`
-   `name`
-   `targetAmount`
-   `targetDate`
-   `currentAmount` atau nilai agregat kontribusi
-   `status`
-   `createdAt`
-   `updatedAt`

### 9.8 SavingsContribution

-   `_id`
-   `userId`
-   `goalId`
-   `amount`
-   `date`
-   `accountId` (opsional)
-   `transactionId` (opsional)
-   `note`
-   `status`
-   `createdAt`

### 9.9 Bill

-   `_id`
-   `userId`
-   `name`
-   `amount`
-   `categoryId`
-   `dueDate`
-   `frequency`
-   `reminderDays`
-   `status`
-   `paidTransactionId`
-   `createdAt`
-   `updatedAt`

### 9.10 Notification

-   `_id`
-   `userId`
-   `type`
-   `title`
-   `message`
-   `relatedEntityId`
-   `isRead`
-   `createdAt`

### 9.11 AuditLog (direkomendasikan)

-   `_id`
-   `userId`
-   `entityType`
-   `entityId`
-   `action`
-   `changedAt`
-   Metadata perubahan yang tidak menyimpan kata sandi atau rahasia
    autentikasi.

------------------------------------------------------------------------

## 10. Kebutuhan Nonfungsional

### 10.1 Keamanan

-   Password wajib di-hash menggunakan algoritma yang sesuai untuk
    password, seperti Argon2id atau bcrypt dengan konfigurasi yang
    memadai.
-   Semua komunikasi produksi menggunakan HTTPS.
-   Autentikasi menggunakan mekanisme sesi atau token yang aman, dengan
    masa berlaku dan mekanisme pembaruan yang terkontrol.
-   Endpoint backend menerapkan autentikasi dan otorisasi pada setiap
    permintaan data privat.
-   Validasi input dilakukan di backend.
-   Terapkan rate limiting pada endpoint login, registrasi, dan
    pemulihan kata sandi.
-   Terapkan proteksi terhadap NoSQL injection, XSS, CSRF sesuai
    mekanisme autentikasi, serta kebocoran data melalui error response.
-   Rahasia aplikasi disimpan melalui environment variables atau secret
    manager, bukan di repository.
-   Log tidak boleh menyimpan kata sandi, token, atau data finansial
    sensitif secara tidak perlu.

### 10.2 Privasi dan Isolasi Data

-   Setiap query data finansial harus dibatasi dengan `userId` dari
    identitas terautentikasi.
-   Backend tidak boleh mempercayai `userId` yang dikirim bebas oleh
    frontend.
-   Pengguna tidak boleh dapat mengakses data pengguna lain dengan
    mengganti ID pada URL atau request.
-   Backup dan pemulihan data harus memiliki kontrol akses.
-   Penghapusan akun dan retensi data harus mengikuti kebijakan yang
    ditetapkan produk serta ketentuan hukum yang berlaku.

### 10.3 Kinerja

-   Halaman dashboard dan daftar transaksi harus tetap responsif untuk
    volume data personal yang wajar.
-   Gunakan pagination pada daftar transaksi.
-   Gunakan index MongoDB pada `userId`, tanggal transaksi, kategori,
    rekening, dan field filter yang sering digunakan.
-   Agregasi dashboard dan laporan harus efisien dan tidak mengambil
    seluruh dokumen transaksi tanpa batas.

### 10.4 Keandalan dan Konsistensi

-   Operasi transfer harus atomik, menggunakan MongoDB transaction bila
    deployment mendukung replica set.
-   Proses recurring transaction harus idempotent.
-   Proses pembaruan saldo, anggaran, dan status pembayaran harus
    konsisten.
-   Sistem harus menangani kegagalan jaringan dan request ulang tanpa
    membuat transaksi duplikat.
-   Backup database dilakukan berkala dan prosedur restore diuji.

### 10.5 Kompatibilitas dan Aksesibilitas

-   Antarmuka responsif pada desktop, tablet, dan ponsel.
-   Form memiliki label, validasi, dan pesan kesalahan yang jelas.
-   Navigasi utama dapat digunakan dengan keyboard.
-   Kontras teks dan elemen interaktif harus memadai.
-   Format tanggal dan nominal mengikuti locale pengguna.

### 10.6 Maintainability

-   Frontend dan backend dipisahkan dalam struktur proyek.
-   API memiliki kontrak dan dokumentasi yang konsisten.
-   Konfigurasi lokal, staging, dan production dipisahkan.
-   Aplikasi dijalankan melalui Docker Compose untuk lingkungan
    pengembangan dan deployment yang konsisten.

------------------------------------------------------------------------

## 11. API Fungsional Tingkat Tinggi

Daftar berikut merupakan rancangan awal endpoint REST. Nama dan bentuk
payload final ditetapkan saat API design.

  --------------------------------------------------------------------------------------
  Modul             Method            Endpoint                         Tujuan
  ----------------- ----------------- -------------------------------- -----------------
  Auth              POST              `/api/auth/register`             Registrasi

  Auth              POST              `/api/auth/login`                Login

  Auth              POST              `/api/auth/logout`               Logout

  Auth              POST              `/api/auth/forgot-password`      Meminta pemulihan

  Auth              POST              `/api/auth/reset-password`       Mengatur ulang
                                                                       kata sandi

  Profile           GET               `/api/profile`                   Melihat profil

  Profile           PATCH             `/api/profile`                   Mengubah profil

  Dashboard         GET               `/api/dashboard/summary`         Ringkasan
                                                                       dashboard

  Dashboard         GET               `/api/dashboard/trends`          Data grafik

  Accounts          GET/POST          `/api/accounts`                  Daftar/tambah
                                                                       rekening

  Accounts          GET/PATCH         `/api/accounts/:id`              Detail/ubah
                                                                       rekening

  Accounts          POST              `/api/accounts/:id/archive`      Arsip rekening

  Categories        GET/POST          `/api/categories`                Daftar/tambah
                                                                       kategori

  Categories        PATCH/DELETE      `/api/categories/:id`            Ubah/arsip
                                                                       kategori

  Transactions      GET/POST          `/api/transactions`              Daftar/tambah
                                                                       transaksi

  Transactions      GET/PATCH         `/api/transactions/:id`          Detail/ubah
                                                                       transaksi

  Transactions      POST              `/api/transactions/:id/void`     Membatalkan
                                                                       transaksi

  Transactions      POST              `/api/transfers`                 Membuat transfer

  Budgets           GET/POST          `/api/budgets`                   Daftar/tambah
                                                                       anggaran

  Budgets           PATCH/DELETE      `/api/budgets/:id`               Ubah/arsip
                                                                       anggaran

  Recurring         GET/POST          `/api/recurring`                 Daftar/tambah
                                                                       jadwal

  Recurring         PATCH             `/api/recurring/:id`             Ubah/jeda jadwal

  Goals             GET/POST          `/api/goals`                     Daftar/tambah
                                                                       target

  Goals             PATCH             `/api/goals/:id`                 Ubah target

  Goals             GET/POST          `/api/goals/:id/contributions`   Riwayat/tambah
                                                                       kontribusi

  Bills             GET/POST          `/api/bills`                     Daftar/tambah
                                                                       tagihan

  Bills             PATCH             `/api/bills/:id`                 Ubah tagihan

  Bills             POST              `/api/bills/:id/pay`             Tandai pembayaran

  Notifications     GET               `/api/notifications`             Daftar notifikasi

  Notifications     PATCH             `/api/notifications/:id/read`    Tandai dibaca

  Reports           GET               `/api/reports/summary`           Ringkasan laporan

  Reports           GET               `/api/reports/export.csv`        Ekspor CSV

  Reports           GET               `/api/reports/export.pdf`        Ekspor PDF
  --------------------------------------------------------------------------------------

Semua endpoint privat memerlukan autentikasi dan pemeriksaan kepemilikan
data. Parameter pagination, filter, sort, dan rentang tanggal harus
divalidasi di backend.

------------------------------------------------------------------------

## 12. Kriteria Penerimaan MVP

MVP dapat dinyatakan memenuhi kebutuhan utama apabila:

1.  Pengguna dapat registrasi, login, logout, dan memulihkan kata sandi.
2.  Pengguna dapat membuat beberapa rekening dan melihat saldo
    masing-masing serta total saldo.
3.  Pengguna dapat mencatat pemasukan dan pengeluaran, dan saldo berubah
    sesuai transaksi.
4.  Pengguna dapat melakukan transfer dan saldo kedua rekening berubah
    secara konsisten tanpa memengaruhi total pemasukan/pengeluaran.
5.  Pengguna dapat mencari, memfilter, mengubah, dan membatalkan
    transaksi.
6.  Pengguna dapat membuat anggaran bulanan dan melihat penggunaan
    berdasarkan transaksi aktual.
7.  Peringatan anggaran muncul ketika ambang yang ditentukan tercapai.
8.  Jadwal transaksi berulang menghasilkan transaksi sesuai frekuensi
    tanpa duplikasi.
9.  Pengguna dapat membuat target tabungan dan melihat progres
    kontribusi.
10. Pengguna dapat membuat tagihan, menerima pengingat dalam aplikasi,
    dan menandai pembayaran tanpa transaksi ganda.
11. Dashboard menampilkan ringkasan dan grafik sesuai periode yang
    dipilih.
12. Pengguna dapat menghasilkan laporan CSV dan PDF sesuai filter.
13. Pengguna A tidak dapat membaca atau mengubah data milik Pengguna B,
    termasuk melalui manipulasi ID request.
14. Operasi penting tetap konsisten ketika request gagal atau dikirim
    ulang.
15. Aplikasi berjalan di lingkungan pengembangan menggunakan Docker
    Compose.

------------------------------------------------------------------------

## 13. Prioritas Pengembangan

### P0 --- Wajib untuk MVP

-   Autentikasi dan isolasi data pengguna.
-   Rekening dan saldo awal.
-   Kategori.
-   Pemasukan, pengeluaran, dan transfer.
-   Daftar transaksi, filter, edit, dan pembatalan.
-   Dashboard ringkasan.
-   Anggaran bulanan dan peringatan dalam aplikasi.
-   Laporan dasar dan ekspor CSV.
-   Docker Compose dan konfigurasi environment.

### P1 --- Fitur lanjutan setelah alur inti stabil

-   Recurring transactions.
-   Target tabungan.
-   Tagihan dan pengingat.
-   Ekspor PDF.
-   Grafik perbandingan antarbulan.
-   Preferensi notifikasi yang lebih lengkap.

### P2 --- Pengembangan berikutnya

-   Integrasi bank atau open banking.
-   Notifikasi email/push.
-   Multi-currency dengan konversi kurs.
-   Impor transaksi dari CSV.
-   Shared household finance.
-   Analisis pola pengeluaran dan insight otomatis.

Prioritas ini merupakan rekomendasi implementasi. Fitur P1 tetap bagian
dari visi produk, tetapi dapat dipisahkan dari rilis pertama agar
transaksi, saldo, dan keamanan dapat diuji lebih dahulu.

------------------------------------------------------------------------

## 14. Metrik Keberhasilan Produk

Metrik awal yang dapat digunakan untuk mengevaluasi produk:

-   **Activation rate:** persentase pengguna baru yang membuat rekening
    dan mencatat transaksi pertama.
-   **Weekly active users:** jumlah pengguna yang aktif dalam satu
    minggu.
-   **Transaction logging frequency:** rata-rata transaksi yang dicatat
    per pengguna aktif.
-   **Budget adoption:** persentase pengguna aktif yang membuat
    setidaknya satu anggaran.
-   **Recurring usage:** persentase pengguna yang mengaktifkan transaksi
    berulang.
-   **Report export usage:** jumlah pengguna yang mengekspor laporan.
-   **Data integrity incidents:** jumlah insiden saldo, transfer, atau
    transaksi yang tidak konsisten.
-   **Authorization incidents:** jumlah kejadian akses lintas akun yang
    tidak sah; targetnya nol.

Target numerik ditetapkan setelah baseline penggunaan tersedia.

------------------------------------------------------------------------

## 15. Asumsi dan Keputusan yang Perlu Dikonfirmasi

Asumsi yang digunakan dalam PRD awal ini:

1.  FinanceTrack merupakan aplikasi pencatatan manual, bukan aplikasi
    yang terhubung otomatis ke rekening bank.
2.  MVP menggunakan satu mata uang utama per akun untuk menyederhanakan
    perhitungan saldo.
3.  Notifikasi MVP ditampilkan di dalam aplikasi; email dan push
    notification menjadi pengembangan berikutnya.
4.  Aplikasi ditujukan untuk pengguna individu, bukan pengelolaan
    keuangan bersama.
5.  Pengeluaran yang dibatalkan tidak masuk ke saldo, anggaran, maupun
    laporan.
6.  Kontribusi target tabungan harus memiliki aturan pencatatan yang
    jelas agar tidak dihitung sebagai pengeluaran atau saldo tambahan
    secara ganda.
7.  Eksekusi recurring transaction dilakukan oleh proses terjadwal di
    backend.
8.  Transfer diperlakukan sebagai perpindahan internal aset, bukan
    pemasukan atau pengeluaran.

Sebelum implementasi final, keputusan berikut perlu dikonfirmasi: -
Apakah satu akun hanya boleh menggunakan satu mata uang, atau perlu
multi-currency sejak awal? - Apakah notifikasi cukup di dalam aplikasi
untuk MVP? - Apakah kontribusi target tabungan hanya berupa pencatatan
progres, atau harus memindahkan dana ke rekening khusus? - Apakah
transaksi berulang langsung dibuat otomatis, atau perlu persetujuan
pengguna sebelum masuk ke buku transaksi? - Apakah pengguna membutuhkan
impor transaksi dari file CSV pada rilis awal?

------------------------------------------------------------------------

## 16. Definisi Selesai (Definition of Done)

Sebuah fitur dinyatakan selesai apabila: - Alur utama dan kondisi
validasinya berfungsi. - Endpoint backend memvalidasi autentikasi,
kepemilikan data, dan input. - Antarmuka memiliki loading, empty,
success, dan error state. - Perubahan data tercermin dengan benar pada
saldo, dashboard, anggaran, dan laporan yang terkait. - Pengujian
mencakup skenario normal, batas, kegagalan, dan request berulang. -
Tidak ada akses lintas pengguna pada pengujian otorisasi. - Dokumentasi
API dan konfigurasi yang diperlukan diperbarui. - Fitur dapat dijalankan
pada lingkungan Docker Compose.

------------------------------------------------------------------------

**Akhir dokumen --- FinanceTrack PRD v1.0**
