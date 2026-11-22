# Laporan Implementasi Halaman Subscription & Sistem Batasan Kuota RAG PENS Copilot

Dokumen ini merangkum perancangan dan implementasi aspek bisnis **PENS Copilot Pro** seharga **Rp 50.000 / bulan** yang disajikan melalui tampilan antarmuka statis (*business presentation*), lengkap dengan penerapan sistem batasan kuota (*quota enforcement*) pada pengunggahan materi kuliah serta percakapan AI berbasis RAG (*Retrieval-Augmented Generation*).

---

## 1. Ringkasan Eksekutif & Aspek Bisnis

PENS Copilot mengadopsi model bisnis **Freemium Terarah**:
- **Free Tier (Gratis):** Menjamin seluruh mahasiswa PENS tetap dapat menikmati kebutuhan harian esensial (jadwal kuliah, pengingat presensi web toast/email, dan manajemen tugas harian).
- **PENS Copilot Pro (Rp 50.000 / bulan):** Ditujukan untuk mahasiswa yang ingin memaksimalkan persiapan praktikum laboratorium, simulasi ujian modul, dan automasi pengingat darurat langsung ke ponsel.

Biaya Rp 50.000 / bulan dirancang proporsional (setara 2 kali jajan makan siang mahasiswa di kantin kampus) untuk menopang biaya operasional komputasi token model AI (Google Gemini), penyimpanan vektor *embedding* berkecepatan tinggi (Supabase pgvector), serta infrastruktur pengiriman notifikasi pesan instan.

---

## 2. 3 Fitur Utama PENS Copilot Pro yang Ditonjolkan

Halaman langganan berfokus menjelaskan 3 pilar nilai tambah utama:

1. **⚡ Fitur 1: AI Quiz & Exam Simulator**
   - Menghasilkan simulasi latihan kuis (10–15 soal pilihan ganda & studi kasus teknis) secara otomatis dari slide materi kuliah atau modul praktikum yang diunggah mahasiswa.
   - Dilengkapi pengatur waktu ujian (*timer*), kunci jawaban, serta pembahasan konsep per langkah untuk persiapan evaluasi tengah/akhir semester (ETS/EAS).
2. **📲 Fitur 2: Notifikasi Darurat ETHOL & Deadline Tugas via WhatsApp / Telegram Bot**
   - Mengirimkan *alert* pengingat presensi kelas ETHOL langsung ke WhatsApp atau Telegram mahasiswa **H-15 menit** sebelum kelas dimulai, disertai tombol tautan langsung ke room ETHOL.
   - *Daily Morning Digest* pada pukul 06.30 WIB yang merangkum jadwal kuliah, ruangan, dan tugas yang harus dikumpulkan pada hari tersebut.
3. **📚 Fitur 3: Unlimited RAG & Asisten Bedah Laporan Praktikum (Lapres)**
   - Akses penyimpanan berkas materi tanpa batas dengan ukuran berkas hingga **25 MB per dokumen** (PDF, Word DOCX, TXT, Markdown).
   - Analisis *cross-document* dan asisten pemandu kerangka pembahasan laporan resmi praktikum berdasarkan data hasil pengamatan lab.

---

## 3. Matriks Perbandingan: Free Tier vs PENS Copilot Pro

| Parameter / Fitur | Free Tier (Mahasiswa Dasar) | PENS Copilot Pro (Rp 50.000/bln) |
| :--- | :--- | :--- |
| **Biaya Langganan** | Rp 0 / selamanya | Rp 50.000 / bulan |
| **Jadwal & Presensi ETHOL** | Tersedia (Web Notification Toast & Email) | Web Toast + Email + **WhatsApp & Telegram Bot** |
| **Manajemen Tugas & Deadline** | Tersedia (Filter Semua, H-48 Jam, Status) | Tersedia + Prioritas AI |
| **Kapasitas Materi Kuliah (RAG)** | **Maksimal 3 Dokumen Tersimpan** | **Tanpa Batas (Unlimited Dokumen)** |
| **Batas Ukuran Dokumen per Berkas** | **Maksimal 5 MB / file** | **Maksimal 25 MB / file** |
| **Percakapan Chat Berbasis Materi (RAG)** | **Maksimal 10 sesi/hari** | **Tanpa Batas Harian** |
| **Mekanisme Kuota RAG Habis** | Mengunci sesi yang ber-RAG; chat biasa baru tetap buka | Tidak pernah terkunci |
| **AI Quiz & Latihan Soal Modul** | Tidak tersedia (Simulasi demo) | **Tersedia Penuh (Custom jumlah & timer)** |
| **Badge Khusus Profil** | Label `FREE` | Badge Eksklusif `PRO ⚡` |

---

## 4. Mekanisme Batasan (*Quota Enforcement*) yang Diterapkan

### A. Pengunggahan Materi Kuliah (`MaterialsView.svelte` & Backend)
1. **Batas Dokumen:** Jika akun Free telah menyimpan 3 dokumen, area form pengunggahan otomatis digantikan dengan kartu peringatan ramah:
   > *"Batas 3 Dokumen Tercapai (Free Tier). Anda telah mencapai kuota maksimal 3 dokumen tersimpan untuk akun Free. Hapus salah satu materi yang sudah tidak dipelajari untuk mengunggah materi baru, atau tingkatkan ke paket Pro untuk kapasitas tanpa batas dan berkas hingga 25 MB."*
   Disertai tombol cepat `⚡ Tingkatkan ke PENS Copilot Pro (Rp 50K)`.
2. **Batas Ukuran Berkas:** Dokumen yang melebihi **5 MB** pada akun Free langsung ditolak di sisi *client* (peringatan validasi lokal) serta divalidasi di backend [server/routes/rag.route.js](../server/routes/rag.route.js) dengan HTTP status `413 Payload Too Large`.

### B. Percakapan Chat Berbasis Materi RAG (`ChatWorkspace.svelte` & Routing)
1. **Pelacakan Kuota:** Server [server/routes/chat.route.js](../server/routes/chat.route.js) mendeteksi penggunaan RAG secara riil (`ragUsed: ragChunks.length > 0`) dan memancarkannya lewat stream SSE ke klien.
2. **Aturan Bisnis Sesi Terkunci (*Session Lockout*):**
   - Setiap pertanyaan yang melibatkan rujukan materi menambah hitungan harian (`pens_rag_usage_count`) dan menandai ID sesi tersebut sebagai sesi ber-RAG.
   - Ketika batas **10/10 percakapan RAG harian** tercapai pada akun Free:
     - Sesi yang sudah terlanjur melibatkan materi akan **dikunci area inputnya (*disabled*)** dengan banner penjelasan informatif:
       > *"Batas Harian Percakapan RAG Tercapai (10/10). Sesi percakapan ini telah terhubung dengan rujukan materi kuliah dan terkunci untuk pengguna Free Tier hingga kuota direset besok hari. Anda tetap dapat melanjutkan percakapan umum tanpa rujukan materi di sesi baru."*
     - Pengguna disediakan 2 tombol navigasi:
       1. `+ Mulai Chat Biasa Baru`: Membuka sesi baru tanpa materi, di mana input bar tetap terbuka penuh untuk bertanya jadwal, tugas, atau percakapan AI umum.
       2. `⚡ Lihat Paket Pro (Rp 50K/bln)`: Langsung mengarahkan ke halaman Subscription.
   - Begitu pengguna beralih atau mensimulasikan status Pro, seluruh sesi terkunci langsung terbuka kembali secara instan.

---

## 5. Berkas yang Dibuat & Dimodifikasi

1. **[src/lib/subscription.js](../src/lib/subscription.js) (Berkas Baru):**
   - Modul manajemen status tier (`getSubscriptionTier`, `setSubscriptionTier`).
   - Konstanta limitasi `FREE_LIMITS` dan `PRO_LIMITS`.
   - Pelacak kuota harian WIB (`getRagUsageState`, `incrementRagUsage`).
   - Logika penandaan dan penguncian sesi RAG (`isSessionRagLocked`, `markSessionAsRag`).
2. **[src/lib/components/dashboard/SubscriptionView.svelte](../src/lib/components/dashboard/SubscriptionView.svelte) (Berkas Baru):**
   - Halaman showcase paket Pro Rp 50.000 / bulan dengan desain palet resmi PENS (Michroma font, blueprint accents, elevated cards).
   - Perbandingan berdampingan *Free Tier* vs *PENS Copilot Pro*.
   - Rincian mendalam 3 fitur utama Pro.
   - **Modal Informasi Bisnis**: Rincian benefit, FAQ aspek bisnis, kontak WhatsApp & Email admin/PIC kampus.
   - **Toggle Simulasi Demo**: Tombol `[Simulasi: Aktifkan Pro]` / `[Ganti ke Free]` untuk mempermudah evaluasi dan demonstrasi kuota secara langsung di browser tanpa gateway pembayaran.
3. **[src/lib/components/dashboard/Sidebar.svelte](../src/lib/components/dashboard/Sidebar.svelte):**
   - Penambahan menu navigasi **"Langganan Pro"** dengan lencana oranye `Rp 50K` / `AKTIF`.
   - Penambahan badge `PRO ⚡` / `FREE` pada komponen `AccountCard`.
4. **[src/lib/components/dashboard/MaterialsView.svelte](../src/lib/components/dashboard/MaterialsView.svelte):**
   - Tampilan kuota dokumen `x / 3` pada top bar.
   - Validasi batas berkas 5 MB (Free) vs 25 MB (Pro).
   - Banner pengganti formulir saat kuota 3 dokumen tercapai.
5. **[src/lib/components/dashboard/ChatWorkspace.svelte](../src/lib/components/dashboard/ChatWorkspace.svelte):**
   - Indikator penggunaan kuota RAG harian pada top bar (`RAG Hari Ini: x / 10`).
   - Banner penguncian sesi RAG terpadu dengan tombol pintas mulai chat baru dan upgrade Pro.
6. **[src/lib/Dashboard.svelte](../src/lib/Dashboard.svelte) & [src/App.svelte](../src/App.svelte):**
   - Penambahan rute `subscription` (`/subscription`).
   - Sinkronisasi state tier, event listener `pens_subscription_changed`, dan propagasi kuota ke seluruh subkomponen.
7. **[server/routes/rag.route.js](../server/routes/rag.route.js) & [server/routes/chat.route.js](../server/routes/chat.route.js):**
   - Validasi batas ukuran berkas 5 MB di endpoint `POST /api/rag/ingest`.
   - Penerusan flag `ragUsed` melalui SSE stream `POST /api/chat`.
8. **[src/lib/ai.js](../src/lib/ai.js):**
   - Penerusan parameter `tier` pada `ingestMaterialDocument`.
   - Penerusan `tier` dan pembacaan `ragUsed` pada `askPensCopilotStream`.

---

## 6. Hasil Pengujian & Verifikasi

1. **Pengujian Unit & Lifecycle Sesi (`node -e`):**
   - Verifikasi konstanta limit Free (3 docs, 5 MB, 10 chats) dan Pro (50.000 IDR, 1000 docs, 25 MB) -> **100% Lolos**.
   - Simulasi kuota harian: Sesi A (ber-RAG) terkunci saat mencapai 10 kali chat; sesi B (chat biasa) tetap dapat digunakan secara normal -> **100% Lolos**.
   - Simulasi upgrade ke Pro: Sesi A langsung terbuka kembali -> **100% Lolos**.
2. **Pengujian Endpoint Server:**
   - Unggah berkas di atas 5 MB dengan tier Free menghasilkan HTTP `413 Payload Too Large` dengan pesan edukatif yang tepat -> **100% Lolos**.
3. **Pengujian Kompilasi Frontend (`npm run build`):**
   - `vite build v8.3.5`: 178 modul terkompilasi dalam **1.41 detik** dengan **0 error** dan **0 peringatan**.
