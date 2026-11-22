# Laporan Implementasi Arsitektur Chat Multi-Blok (`blocks[]`) PENS Copilot

Dokumen ini merangkum perancangan dan implementasi arsitektur **Multi-Block (`blocks[]`) Hybrid Chat** pada PENS Copilot yang memungkinkan satu bubble balasan asisten AI mengombinasikan teks percakapan Markdown, kartu ringkasan poin (`list_card`), blok kode dengan tombol **Salin** (`code`), kotak catatan belajar (`callout`), serta beberapa kartu data akademik (`schedule_list`, `task_list`, dan kartu aksi/konfirmasi CRUD) secara bersamaan dengan latensi tetap rendah (`~0.8s – 1.7s`).

---

## 1. Latar Belakang & Solusi Arsitektur

Pada versi sebelumnya, satu pesan asisten hanya mendukung `text` + maksimal 1 `card` dengan `intent` yang saling eksklusif, sehingga permintaan konsep disertai contoh kode atau permintaan gabungan jadwal + tugas tidak dapat dikombinasikan secara fleksibel.

Solusi yang diterapkan memisahkan:
1. **Skema JSON Gemini yang Datar & Komposabel (`INTERACTIVE_CHAT_SCHEMA`)** di [server/services/gemini.service.js](../server/services/gemini.service.js) — Menggunakan properti datar (`reply`, `intent`, `includeScheduleList`, `scheduleFilterDay`, `includeTaskList`, `summaryCard`, `codeLanguage`, `codeTitle`, `codeSnippet`, `schedulePayload`, `taskPayload`) agar *constrained JSON decoder* Gemini merespons cepat (`~0.9s – 1.7s`) tanpa mengalami lonjakan waktu kompilasi tata bahasa akibat *nested array-of-union-objects*.
2. **Perakitan & Hidrasi `blocks[]` di Server (`hydrateInteractiveBlocks`)** di [server/routes/chat.route.js](../server/routes/chat.route.js) — Menyusun array terurut `blocks[]` dalam satu frame SSE `POST /api/chat`:
   - Memecah teks `reply` dan mengekstrak blok kode berpagar Markdown (`splitMarkdownAndFencedCode`) secara otomatis jika ada.
   - Menyisipkan `list_card` dari `summaryCard.points` (mendukung gaya `bullet` maupun `numbered`).
   - Menyisipkan blok `code` (`language`, `title`, `code` bersih tanpa triple backtick) dari `codeSnippet`.
   - Menyisipkan `callout` (`Catatan Belajar`) dari `summaryCard.tip`.
   - Menghidrasi `schedule_list` dan `task_list` secara bersamaan dari konteks database mahasiswa bila `includeScheduleList` dan `includeTaskList` keduanya bernilai `true`.
   - Menyisipkan kartu hasil atau konfirmasi CRUD (`schedule_action`, `task_action`, `schedule_delete_confirm`, `task_delete_confirm`).

---

## 2. Jenis Blok UI yang Didukung dalam Satu Bubble

Seluruh elemen di dalam `m.blocks` dirender secara berurutan di dalam **satu bubble putih asisten yang menyatu** pada [src/lib/components/dashboard/ChatWorkspace.svelte](../src/lib/components/dashboard/ChatWorkspace.svelte) dan [src/lib/components/dashboard/ChatRichCard.svelte](../src/lib/components/dashboard/ChatRichCard.svelte):

| Tipe Blok (`block.type`) | Fungsi & Elemen Visual |
| :--- | :--- |
| **`markdown`** | Paragraf pengantar, penjelasan konsep, atau obrolan biasa yang dirender melalui `renderMarkdown`. |
| **`list_card`** | Kartu ringkasan poin (`bullet` dengan aksen `#FF6A00` atau `numbered` dengan lencana nomor `#02389E`), setiap item dirender mendukung inline Markdown. |
| **`code`** | Kartu kode gelap (`bg-slate-900`) dengan header bahasa pemrograman (`java`, `python`, `c`, `js`, `sql`), judul kode opsional, dan tombol **Salin** interaktif (`navigator.clipboard.writeText` dengan umpan balik `"Tersalin!"`). |
| **`callout`** | Kotak sorotan (`tip`, `info`, `warning`) untuk menampilkan **Catatan Belajar** atau perhatian penting. |
| **`schedule_list`** | Kartu daftar jadwal kuliah terfilter per hari WIB lengkap dengan tombol **Kelola Jadwal**. |
| **`task_list`** | Kartu daftar tugas & deadline lengkap dengan badge status serta tombol **Kelola Tugas**. |
| **`schedule_action` / `task_action`** | Kartu konfirmasi bahwa jadwal atau tugas baru telah berhasil ditambahkan/diperbarui di Supabase. |
| **`schedule_delete_confirm` / `task_delete_confirm`** | Kartu konfirmasi penghapusan jadwal/tugas dengan tombol **Ya, Hapus** dan **Batal**. |

---

## 3. Persistensi `__pensBlocksV2` Tanpa Migrasi Database

Pada [src/lib/chatFormat.js](../src/lib/chatFormat.js):
- **`serializeAssistantContent(text, card, blocks)`** menyimpan struktur `{ __pensBlocksV2: true, text, blocks }` ke kolom teks `chat_messages.content` yang sudah ada di Supabase.
- **`parseAssistantContent(rawContent)`** membaca kembali `__pensBlocksV2`, sekaligus menjaga **backward compatibility** penuh dengan otomatis mengonversi pesan histori lama berformat `__pensCardV1` maupun teks biasa menjadi array `blocks[]`.
- Pada [src/lib/Dashboard.svelte](../src/lib/Dashboard.svelte), fungsi `syncConfirmationMessage` menyinkronkan perubahan status konfirmasi hapus (`deleted` / `cancelled`) baik pada `m.card` maupun blok terkait di dalam `m.blocks`.

---

## 4. Daftar Berkas yang Diperbarui

- **[server/services/gemini.service.js](../server/services/gemini.service.js)** — Perluasan `INTERACTIVE_CHAT_SCHEMA` dengan flag komposabel (`includeScheduleList`, `includeTaskList`, `codeLanguage`, `codeTitle`, `codeSnippet`, `summaryCard.style`) serta instruksi komposisi adaptif & proporsional.
- **[server/routes/chat.route.js](../server/routes/chat.route.js)** — Fungsi `stripCodeFence`, `splitMarkdownAndFencedCode`, dan `hydrateInteractiveBlocks` untuk merakit `blocks[]` serta mengirimkannya lewat SSE `POST /api/chat`.
- **[src/lib/chatFormat.js](../src/lib/chatFormat.js)** — Serialisasi `__pensBlocksV2` dan konversi kompatibilitas mundur dari `__pensCardV1` serta teks polos.
- **[src/lib/ai.js](../src/lib/ai.js)** — Pembacaan array `blocks` dari stream SSE di `askPensCopilotStream`.
- **[src/lib/components/dashboard/ChatRichCard.svelte](../src/lib/components/dashboard/ChatRichCard.svelte)** — Renderer untuk blok `list_card`, `code` (dengan tombol **Salin**), dan `callout`, serta penyelarasan jarak antarblok.
- **[src/lib/components/dashboard/ChatWorkspace.svelte](../src/lib/components/dashboard/ChatWorkspace.svelte)** — Loop `blocksToRender` di dalam satu bubble putih asisten.
- **[src/lib/Dashboard.svelte](../src/lib/Dashboard.svelte)** — Penyimpanan `blocks` pada state `messages`, pemuatan sesi histori, serta sinkronisasi aksi konfirmasi hapus di dalam `blocks[]`.

---

## 5. Hasil Build & Verifikasi Otomatis

| Pemeriksaan | Target / Skenario | Hasil Aktual |
| :--- | :--- | :--- |
| **Build Produksi Frontend** | `npm run build` (`vite build` v8.3.5) | **Lolos** (exit code `0`, `176 modules transformed` dalam `1.41s`, `0` error/warning) |
| **Unit Test Serialisasi (`--unit`)** | `serializeAssistantContent` & `parseAssistantContent` | **Lolos (`MULTIBLOCK_UNIT_PASS`)**: Round-trip `__pensBlocksV2` (`["markdown","list_card","code","callout"]`), upgrade otomatis `__pensCardV1` (`["markdown","schedule_list"]`), dan upgrade teks polos |
| **E2E Multi-Blok Konsep + Kode (`--e2e`)** | `"jelaskan konsep method overloading di Java dan kasih contoh code implementasinya"` | **Lolos** (`1672ms` via `gemini-3.1-flash-lite`): Menghasilkan `blocks: ["markdown", "list_card", "code", "callout"]` dengan `codeLang: "java"` dalam 1 bubble |
| **E2E Multi-Card Jadwal + Tugas (`--e2e`)** | `"tampilkan jadwal kuliah hari senin sekaligus semua daftar tugas saya"` | **Lolos** (`943ms` via `gemini-3.1-flash-lite`): Menghasilkan `blocks: ["markdown", "schedule_list", "task_list"]` terhidrasi lengkap |
| **E2E Sapaan Ringan & Konfirmasi Hapus (`--e2e`)** | `"halo"` & `"hapus tugas Tugas Class Segiempat"` | **Lolos** (`867ms` & `1170ms`): Sapaan menghasilkan `["markdown"]` tunggal; hapus tugas menghasilkan `["markdown", "task_list", "task_delete_confirm"]` |
