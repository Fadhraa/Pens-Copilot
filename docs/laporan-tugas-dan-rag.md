# Laporan Implementasi Manajemen Tugas, Notifikasi Deadline & Materi Kuliah RAG (PDF/DOCX)

Dokumen ini merangkum implementasi fitur **Cek Tugas (`/tasks`)**, **CRUD Tugas Semantik via Chat AI**, **Notifikasi Deadline Tugas**, serta **Halaman Khusus Materi Kuliah RAG (`/materials`)** dengan dukungan dokumen `.pdf`, `.docx`, `.txt`, `.md`, dan `.csv` serta mekanisme *low-latency* pada chat AI PENS Copilot.

---

## 1. Fitur Cek Tugas (`/tasks`) & Sidebar Navigasi

Tiga submenu **Cek Tugas** pada sidebar kini bersifat interaktif dan membuka tampilan kanan dashboard pada rute `/tasks` dengan tiga tab terpadu:

- **Daftar Tugas (`all`)** — Menampilkan ringkasan metrik jumlah tugas (`Belum Mulai`, `Sedang Dikerjakan`, `Selesai`), seluruh daftar tugas mahasiswa, form tambah/edit tugas yang terhubung ke mata kuliah pada tabel `schedules`, penggantian status cepat per tugas, serta aksi hapus.
- **Deadline Tugas (`deadlines`)** — Mengurutkan tugas berdasarkan deadline terdekat (tugas selesai ditempatkan di bagian akhir) dengan badge urgensi (`<= 3 Jam`, `H-1`, `Terlewat`, `Selesai`). Item di sidebar juga menampilkan badge jumlah tugas mendesak yang belum selesai dengan deadline `<= 48 jam`.
- **Status Tugas (`status`)** — Mengelompokkan tugas ke dalam 3 kolom status (`Belum Mulai`, `Dikerjakan`, `Selesai`).

### Berkas Frontend Terkait
- **[src/App.svelte](../src/App.svelte)** — Mendaftarkan rute `/tasks` dan `/materials` di `viewPaths` serta menyimpan state `activeTaskTab`.
- **[src/lib/components/dashboard/Sidebar.svelte](../src/lib/components/dashboard/Sidebar.svelte)** — Mengubah tombol `Daftar Tugas`, `Deadline Tugas`, dan `Status Tugas` menjadi navigasi aktif ke `/tasks`, menambahkan badge `urgentTasksCount`, dan tombol **Materi Kuliah (RAG)** dengan badge `materialsCount` menuju `/materials`.
- **[src/lib/components/dashboard/TasksView.svelte](../src/lib/components/dashboard/TasksView.svelte)** — Halaman manajemen tugas penuh (ringkasan statistik, form tambah/edit terhubung ke `schedules`, tampilan list, tab deadline, dan board 3 status).
- **[src/lib/Dashboard.svelte](../src/lib/Dashboard.svelte)** — Mengelola query `tasks` (`id, schedule_id, title, description, status, priority, deadline`), `study_materials`, handler CRUD Supabase (`handleCreateTask`, `handleUpdateTask`, `handleDeleteTask`), `refreshTasks`, serta integrasi routing tampilan kanan.

---

## 2. CRUD Tugas Semantik via Chat AI & Konfirmasi Hapus

AI menentukan intensi pengguna secara semantik menggunakan Gemini *Structured JSON Output* (`INTERACTIVE_CHAT_SCHEMA` pada [server/services/gemini.service.js](../server/services/gemini.service.js)), tanpa pemecahan perintah berbasis regex statis.

- **Daftar tugas**: Intent `show_tasks` merender kartu `task_list` beserta tombol **Kelola Tugas** menuju `/tasks`.
- **Tambah & Ubah tugas (`create_task`, `update_task`)**: Backend mencocokkan ID atau judul terdekat (`findMatchingRow`) dan langsung menyimpan perubahan ke tabel Supabase `tasks` via REST menggunakan JWT sesi pengguna (RLS tetap aktif), lalu mengirimkan sinyal `tasksUpdated: true` di frame SSE agar state di `/tasks` otomatis ter-refresh, serta merender kartu `task_action`.
- **Hapus tugas (`delete_task`)**: Tidak menghapus langsung; AI mengembalikan kartu konfirmasi `task_delete_confirm` (`Ya, Hapus Tugas` / `Batal`) yang ditangani oleh `handleConfirmDeleteTask` dan `handleCancelDeleteTask`.

### Berkas Terkait
- **[server/services/task.service.js](../server/services/task.service.js)** — Helper normalisasi enum (`normalizeTaskStatus`, `normalizeTaskPriority`), `formatTaskRow`, serta REST mutator `createTaskServer` dan `updateTaskServer`.
- **[server/services/gemini.service.js](../server/services/gemini.service.js)** — Menyertakan `[id: ...]` tugas di `buildSystemInstruction`, serta memperbarui `INTERACTIVE_CHAT_SCHEMA` dengan intent `create_task`, `update_task`, `delete_task`, dan skema terstruktur `taskPayload` (`required: ["title", "status", "priority", "deadline"]`, enum `status` & `priority`).
- **[server/routes/chat.route.js](../server/routes/chat.route.js)** — Menangani resolusi `create_task`, `update_task`, `delete_task`, dan memancarkan `tasksUpdated` lewat SSE `POST /api/chat`.
- **[src/lib/components/dashboard/ChatRichCard.svelte](../src/lib/components/dashboard/ChatRichCard.svelte)** & **[src/lib/components/dashboard/ChatWorkspace.svelte](../src/lib/components/dashboard/ChatWorkspace.svelte)** — Merender kartu `task_list`, `task_action`, `task_delete_confirm`, dan tombol akses cepat ke `/tasks` dan `/materials`.

---

## 3. Notifikasi Otomatis Deadline Tugas

Fungsi `evaluateDueTaskDeadlines` di [src/lib/notifications.js](../src/lib/notifications.js) mengevaluasi seluruh tugas yang belum berstatus `completed` setiap kali dashboard dimuat, data tugas diperbarui, maupun interval pengecekan berjalan:

1. **Pengingat H-1 (`task_h1`)** — Memicu notifikasi saat sisa waktu deadline berada di rentang `3 jam < diff <= 24 jam`.
2. **Pengingat Kritis `<= 3 Jam` (`task_3h`)** — Memicu notifikasi saat sisa waktu deadline berada di rentang `0 < diff <= 3 jam`.
3. **Deduplikasi & Penghentian Pengingat** — Status pengingat dicatat pada `localStorage` via kunci `task:{taskId}:{stageKey}`. Pada banner toast ([src/lib/components/dashboard/EtholToastBanner.svelte](../src/lib/components/dashboard/EtholToastBanner.svelte)), tombol **Tandai Selesai** memanggil `handleMarkTaskCompleted` untuk memperbarui status menjadi `completed` sekaligus membersihkan toast terkait agar pengingat berikutnya berhenti. Notifikasi juga dikirim melalui Web Notification API serta endpoint email Gmail SMTP `/api/notifications/send`.

---

## 4. Halaman Khusus Materi Kuliah RAG (`/materials`) & Strategi Low Latency

### 4.1 Dukungan Format Dokumen & Ingest Sekali di Backend
- **[server/services/document.service.js](../server/services/document.service.js)**:
  - Ekstraksi teks lokal melalui `extractDocumentText`: mendukung `.pdf` (`PDFParse` dari `pdf-parse` v2.4.5), `.docx` (`mammoth.extractRawText` dari `mammoth` v1.13.0), `.txt`, `.md`, `.csv`, serta input catatan teks manual (`rawText`).
  - Pemecahan teks `chunkDocumentText`: ukuran blok `750` karakter, `overlap` `100` karakter, dan batas aman maksimal `40` chunk per dokumen (`truncated: true` jika dokumen sangat panjang).
  - Pembuatan embedding paralel terbatas melalui `embedChunksWithConcurrency(..., 5)` memanggil `gemini-embedding-2` (dimensi vektor `768`).
- **[server/routes/rag.route.js](../server/routes/rag.route.js)** & **[server/index.js](../server/index.js)**:
  - Menambahkan endpoint `POST /api/rag/ingest` dan memperbarui `POST /api/rag/embed` agar memakai concurrency pool `5`.
- **[src/lib/ai.js](../src/lib/ai.js)**:
  - Fungsi `ingestMaterialDocument` mengunggah berkas base64/teks ke `POST /api/rag/ingest`, lalu menyimpan metadata ke `study_materials` dan potongan vektor ke `document_chunks` di Supabase (dengan rollback otomatis menghapus baris `study_materials` jika insert chunk gagal).
- **[src/lib/components/dashboard/MaterialsView.svelte](../src/lib/components/dashboard/MaterialsView.svelte)**:
  - Halaman `/materials` terpisah dengan dropzone unggah berkas `.pdf/.docx/.txt/.md/.csv` (maks `10 MB`) atau tab tempel catatan teks di panel kiri, serta pencarian & tombol **Hapus** materi tersimpan di panel kanan.

### 4.2 Strategi Low Latency pada Chat AI
1. **Parse & Embed Hanya Saat Upload** — Ekstraksi biner PDF/DOCX dan pembuatan seluruh vektor dilakukan sekali ketika mahasiswa mengunggah dokumen di `/materials`, bukan saat sesi tanya jawab.
2. **Short-Circuit Pencarian Vektor (`shouldSkipRag`)** — Di [server/services/rag.service.js](../server/services/rag.service.js), permintaan ke `gemini-embedding-2` dan RPC Supabase dilewati otomatis bila user belum memiliki materi, pesan `< 12` karakter, atau sapaan singkat (`< 35` karakter) yang cocok dengan `GREETING_PATTERN`.
3. **Top-3 pgvector Retrieval** — Ketika RAG dijalankan, `retrieveRagChunksServer` hanya mengambil maksimal `match_count: 3` chunk teratas dengan ambang batas `match_threshold: 0.35`, sehingga konteks prompt tetap ringkas dan cepat diproses.

---

## 5. Hasil Build & Verifikasi Otomatis

Seluruh pemeriksaan berikut dijalankan setelah seluruh perbaikan kode selesai:

| Jenis Pemeriksaan | Perintah / Target | Hasil Aktual |
| :--- | :--- | :--- |
| **Build Produksi Frontend** | `npm run build` (`vite build` v8.3.5) | **Lolos** (exit code `0`, `176 modules transformed` dalam `1.34s`, `0` error/warning Svelte a11y) |
| **Unit Test Ekstraksi, Chunking, RAG & Deadline** | Script verifikasi Node `--unit` | **Lolos (`UNIT_PASS`)**: Ekstraksi `.txt`, `.md`, `.pdf` (`pdf-parse` v2), `.docx` (`mammoth`), chunk overlap & batas `40` chunk (`truncated: true`), concurrency `5`, `evaluateDueTaskDeadlines` (`task_h1`, `task_3h`, abaikan `completed`/lewat/sudah dinotif), `shouldSkipRag`, serta normalisasi enum tugas |
| **E2E Backend API (Gemini & RAG)** | Script verifikasi Node `--e2e` | **Lolos (`E2E_PASS`)**: `callGeminiInteractiveChat` (`create_task`: judul `"Laporan Praktikum Jaringan"`, prioritas `"high"`, deadline ISO WIB `"2026-11-23T23:59:00+07:00"`), `POST /api/rag/ingest` DOCX (`1634` karakter menjadi `3` chunk vektor `768` dimensi via `gemini-embedding-2`, HTTP `200`), dan `POST /api/chat` (`delete_task` memancarkan SSE `task_delete_confirm`) |
