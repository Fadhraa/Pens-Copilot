# Plan Implementasi Fitur Chat AI + RAG (PENS Copilot)

Rencana ini disusun untuk mengaktifkan fitur **Tanya AI** pada `Dashboard.svelte` dengan dukungan **Gemini API**, **histori percakapan Supabase**, **konteks jadwal & tugas**, serta **RAG (`pgvector`)** untuk materi kuliah.

---

## 1. Persiapan Environment & Database (`pgvector` + RAG)

1. **Environment (`.env`)**:
   - Tambahkan `VITE_GOOGLE_API_KEY` (menggunakan API key Gemini yang sudah ada di `.env`).
2. **Ekstensi & Tabel RAG di Supabase (`supabase/schema.sql`)**:
   - Aktifkan ekstensi `vector` (`create extension if not exists vector;`).
   - Buat tabel `study_materials` (metadata materi kuliah yang diunggah mahasiswa: `id`, `user_id`, `title`, `subject`, `created_at`).
   - Buat tabel `document_chunks` (`id`, `material_id`, `user_id`, `content`, `embedding vector(768)`).
   - Buat fungsi RPC `match_document_chunks(query_embedding, match_threshold, match_count, p_user_id)` untuk *semantic search* berbasis *cosine similarity*.
   - Terapkan RLS pada `study_materials` dan `document_chunks`.

---

## 2. Helper AI & RAG (`src/lib/ai.js`)

1. **`embedText(text)`**:
   - Memanggil Gemini Embedding API (`text-embedding-004`) untuk mengubah potongan materi maupun pertanyaan user menjadi vektor 768 dimensi.
2. **`ingestMaterial({ title, subject, rawText, userId })`**:
   - Memecah teks materi menjadi *chunks* (~500–800 karakter dengan sedikit *overlap*), membuat embedding masing-masing chunk, lalu menyimpannya ke `study_materials` & `document_chunks`.
3. **`retrieveRelevantChunks(query, userId)`**:
   - Mengubah pertanyaan user menjadi embedding, lalu memanggil RPC `match_document_chunks` di Supabase untuk mengambil top-3 potongan materi paling relevan.
4. **`askPensCopilot({ prompt, history, userContext, ragChunks })`**:
   - Menyusun *system prompt* yang berisi:
     - Profil mahasiswa (`full_name`, `nrp`, `prodi`).
     - Jadwal kuliah aktif (`schedules`) & daftar tugas/deadline (`tasks`).
     - Potongan materi hasil RAG (`ragChunks`).
   - Memanggil Gemini Chat API (`gemini-2.5-flash`) dan mengembalikan jawaban.

---

## 3. Integrasi Chat & Histori di `Dashboard.svelte`

1. **Manajemen Sesi (`chat_sessions` & `chat_messages`)**:
   - Memuat daftar histori percakapan user di sidebar (*Hari ini*, dll.) dari tabel `chat_sessions`.
   - Saat user mengirim pesan baru:
     - Buat sesi baru otomatis jika belum ada sesi aktif (judul diambil dari ringkasan prompt pertama).
     - Simpan pesan `user` ke `chat_messages`, tampilkan indikator *typing/loading* AI.
     - Jalankan `retrieveRelevantChunks` + `askPensCopilot`, lalu simpan balasan `assistant` ke `chat_messages`.
   - Klik item di *Histori Percakapan* akan memuat ulang seluruh pesan dari sesi tersebut.
2. **UI Unggah Materi RAG**:
   - Tambahkan tombol/modal ringkas **"+ Materi Kuliah (RAG)"** di area input/workspace agar mahasiswa bisa menempel teks atau mengunggah file `.txt/.md` materi ke *knowledge base* pribadi mereka.

---

## 4. Verifikasi
- Uji kirim pertanyaan materi kuliah (memastikan RAG mengambil chunk yang tepat dari `document_chunks`).
- Uji kirim pertanyaan jadwal/deadline (memastikan AI membaca data `schedules` & `tasks`).
- Uji refresh halaman untuk memastikan histori percakapan tetap tersimpan dan bisa dibuka kembali dari sidebar.
