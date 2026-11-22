# ⚡ PENS Copilot — Asisten Akademik & Pengingat ETHOL Mahasiswa PENS

> **Tugas Susah Bukan Halangan! kerjAIn aja.**  
> Platform terintegrasi pengingat presensi kuliah ETHOL, manajemen tugas berbasis deadline, dan asisten AI akademik dengan kapabilitas RAG (*Retrieval-Augmented Generation*) berbasis dokumen diktat/modul khusus mahasiswa Politeknik Elektronika Negeri Surabaya (PENS).

---

## 📌 1. Tentang Aplikasi

Mahasiswa vokasi teknik PENS menghadapi jadwal perkuliahan laboratorium yang sangat padat, laporan resmi (lapres) mingguan, dan presensi sistem akademik ETHOL yang memiliki tenggat ketat. Keterlambatan presensi berakibat pengurangan presensi hadir (*alpha*), sementara penumpukan tugas praktikum sering memicu kelelahan (*burnout*).

**PENS Copilot** hadir sebagai solusi terpusat (*all-in-one academic copilot*) yang menyelesaikan tiga tantangan utama tersebut:
1. **Otomasi Jadwal & Ekstraksi KRS:** Mahasiswa cukup mengunggah foto/PDF KRS; AI otomatis mengekstrak jadwal, ruangan, jam, dan dosen pengampu ke database tanpa input manual yang melelahkan.
2. **Pengingat Presensi ETHOL Multi-Channel:** Sistem mendeteksi waktu kelas secara presisi di zona waktu WIB, memicu peringatan web notification (*toast banner* interaktif) serta mengirimkan email darurat via Gmail SMTP pada H-15 menit dan 3 interval selama perkuliahan berlangsung.
3. **Manajemen Tugas & Prioritas:** Pelacakan deadline tugas kuliah terintegrasi dengan penanda urgensi khusus untuk tugas yang mendekati batas waktu (< 48 jam).
4. **Chat Asisten AI Berbasis Materi Kuliah (RAG):** Mahasiswa dapat mengunggah slide atau modul praktikum (PDF, Word DOCX, TXT, Markdown). Sistem mengekstrak teks, memecahnya menjadi potongan (*chunks*), membuat vektor *embedding* 768 dimensi, dan menyimpannya di Supabase `pgvector`. AI menjawab pertanyaan berbasis isi materi kuliah dengan latensi rendah (`< 1.7s`).
5. **Multi-Block Hybrid Chat UI:** Balasan asisten AI dapat mengombinasikan teks penjelasan Markdown, ringkasan poin, blok kode dengan tombol salin, kotak catatan belajar (*callout*), serta kartu interaktif manipulasi jadwal dan tugas secara bersamaan dalam satu bubble percakapan.
6. **Model Bisnis & Kuota Berlangganan (Pro Tier):** Showcase aspek bisnis Rp 50.000 / bulan dengan fitur unggulan AI Quiz Simulator, bot WhatsApp/Telegram, dan unlimited RAG, disertai pembatasan kuota yang adil untuk Free Tier (maksimal 3 dokumen dan 10 chat RAG/hari).

---

## 🏗️ 2. Arsitektur & Konsep Teknis

Aplikasi dibangun dengan arsitektur **Decoupled Client-Server**:

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Vercel)                         │
│  Svelte 5 (Runes) + Tailwind CSS v4 + Vite + Lucide Icons   │
│  - Single Page Application (SPA)                            │
│  - Local Notification Evaluator (WIB Clock Engine)          │
│  - SSE Consumer for AI Chat Streaming                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     BACKEND API (Render)      │   │     DATABASE & AUTH (Supabase)│
│  Node.js HTTP Server          │   │  PostgreSQL with pgvector     │
│  - Server-Sent Events (SSE)   │   │  - Row Level Security (RLS)   │
│  - Ingest & Chunking Engine   │   │  - Auth (Profiles, Passwords) │
│  - Gemini 3.6 Flash Client    │   │  - Schedules, Tasks, Chats    │
│  - Nodemailer (Gmail SMTP)    │   │  - document_chunks (768-dim)  │
└───────────────┬───────────────┘   └───────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│       AI CLOUD SERVICES       │
│  Google Gemini API            │
│  - gemini-3.6-flash (Chat/KRS)│
│  - text-embedding-004 (RAG)   │
└───────────────────────────────┘
```

### Alur Kerja RAG (*Retrieval-Augmented Generation*):
1. **Ingest Phase:** File PDF/Word diunggah ke backend `POST /api/rag/ingest`. Teks diekstrak menggunakan parser lokal (`pdf-parse` v2 dan `mammoth`), lalu dipecah menjadi potongan teks overlapping (~700 karakter dengan 100 karakter overlap).
2. **Vectorization:** Potongan teks dikirim secara paralel terkontrol (*concurrency pool*) ke Google Gemini Embedding API untuk menghasilkan vektor 768 dimensi.
3. **Database Indexing:** Vektor disimpan di tabel `document_chunks` PostgreSQL yang memanfaatkan ekstensi `pgvector` dengan indeks IVFFlat / HNSW.
4. **Query & Retrieval:** Saat mahasiswa bertanya di chat, query diubah menjadi vektor, lalu Supabase mencocokkan kemiripan kosinus (*cosine distance*) dengan fungsi SQL `match_document_chunks`.
5. **Augmented Prompting:** Chunks materi yang paling relevan disisipkan ke dalam system context Google Gemini, menghasilkan jawaban yang akurat berdasarkan materi perkuliahan PENS tanpa halusinasi.

---

## 🛠️ 3. Teknologi yang Digunakan & Alasan Pemilihannya

| Layer | Teknologi | Alasan Pemilihan & Nilai Tambah |
| :--- | :--- | :--- |
| **Frontend Framework** | **Svelte 5 (Runes: `$state`, `$derived`, `$props`)** | **Performa & Ukuran Bundle:** Tidak menggunakan Virtual DOM (VDOM), melainkan dikompilasi langsung menjadi JavaScript murni yang sangat kecil (~126 kB gzip) dan reaktif. Sangat cepat dibuka di jaringan kampus maupun perangkat mobile mahasiswa. |
| **Styling & Design System** | **Tailwind CSS v4** | **Kecepatan & Konsistensi UI:** Menggunakan engine berbasis Rust terbaru dari Tailwind v4 yang sangat kencang. Memudahkan penerapan palet resmi PENS (Royal Blue, Deep Navy, Electric Blue, dan Safety Orange) sesuai panduan `design.md`. |
| **Build Tool** | **Vite 8** | **Developer Experience & HMR:** Waktu kompilasi instan (< 1.5 detik untuk 178 modul) dan Hot Module Replacement (HMR) yang mempermudah iterasi antarmuka. |
| **Backend Runtime** | **Node.js (Native HTTP Server)** | **Ringan & Streaming Friendly:** Menggunakan HTTP server murni tanpa framework berat untuk menjaga konsumsi RAM minimal (< 80 MB pada free tier Render). Sangat stabil dalam menangani Server-Sent Events (SSE) dengan koneksi berdurasi panjang (*keepalive heartbeats*). |
| **Database & Auth** | **Supabase (PostgreSQL + pgvector)** | **All-in-One Backend-as-a-Service:** Menyediakan autentikasi bawaan, manajemen relasi SQL yang kokoh, sistem keamanan data *Row Level Security (RLS)* per mahasiswa, dan kemampuan pencarian kemiripan vektor (*vector similarity search*) di PostgreSQL tanpa perlu server database vektor terpisah seperti Pinecone. |
| **AI Model & Embedding** | **Google Gemini (gemini-3.6-flash & text-embedding-004)** | **Latensi Rendah & Kapasitas Token Besar:** Model Flash menawarkan waktu respon sangat cepat (`~0.8s – 1.7s`), dukungan ekstraksi JSON terstruktur (*constrained grammar decoding*), serta kapabilitas analisis multimodal (PDF dan gambar KRS). |
| **Dokumen Parser** | **pdf-parse & mammoth** | **Ekstraksi Lokal Cepat:** Mengurai PDF dan berkas Microsoft Word `.docx` langsung di dalam memori server tanpa mengirim file ke pihak ketiga, menjaga privasi diktat dan modul praktikum. |
| **Notifikasi Email** | **Nodemailer (Gmail SMTP)** | **Keterandalan Pengiriman:** Menggunakan jalur SMTP resmi dengan App Password Google, memastikan email pengingat presensi dan deadline tugas masuk langsung ke inbox mahasiswa tanpa terhalang filter spam. |
| **Deployment Frontend** | **Vercel** | **Edge CDN Global:** Menyediakan hosting statis berkecepatan tinggi dengan integrasi otomatis GitHub, preview deployments, dan konfigurasi rewrite proxy API (`vercel.json`) yang mulus. |
| **Deployment Backend** | **Render.com (Web Service)** | **Native Long-running Node.js:** Mendukung proses Node.js berkelanjutan dan koneksi streaming SSE tanpa terbentur batas waktu pendek (*execution timeout* 10 detik) seperti pada serverless function standar. |

---

## 📂 4. Struktur Direktori Proyek

```
final/
├── .agents/                    # Aturan anti-slop & pedoman AI coding agent
├── docs/                       # Laporan implementasi & perancangan fitur
│   ├── laporan-implementasi.md
│   ├── laporan-tugas-dan-rag.md
│   ├── laporan-chat-multiblock.md
│   └── laporan-subscription-dan-kuota-rag.md
├── public/                     # Aset statis & logo resmi PENS Copilot (favicon.svg)
├── server/                     # Backend Node.js
│   ├── config/                 # Pemuatan environment (.env / process.env)
│   ├── routes/                 # Endpoint /api/chat, /api/rag, /api/schedule, /api/notify
│   ├── services/               # Integrasi Gemini, Supabase, RAG chunking, Email SMTP
│   └── utils/                  # Utilitas HTTP, SSE writer, logger terminal
├── src/                        # Frontend Svelte 5
│   ├── lib/
│   │   ├── components/         # Komponen UI modular (Dashboard, Chat, Tasks, Materials, Subscriptions)
│   │   ├── ai.js               # Client API streamer SSE & dokumen ingest
│   │   ├── chatFormat.js       # Serialisasi multi-block V2 & backward compatibility
│   │   ├── notifications.js    # Evaluasi jadwal presensi ETHOL WIB & deadline tugas
│   │   ├── subscription.js     # Manajemen kuota Free vs Pro tier & session locking
│   │   └── supabase.js         # Client Supabase browser
│   ├── App.svelte              # Router SPA & layout view switcher
│   └── main.js                 # Entrypoint aplikasi
├── supabase/                   # Skema database PostgreSQL & RLS (schema.sql)
├── render.yaml                 # Konfigurasi Infrastructure-as-Code Render.com
├── vercel.json                 # Konfigurasi proxy routing Vercel ke Render
└── package.json                # Dependencies & scripts
```

---

## 🚀 5. Panduan Instalasi & Menjalankan di Lokal

### Prasyarat
- Node.js versi 18 atau lebih baru.
- Akun Supabase (untuk database dan autentikasi).
- Google Gemini API Key.

### 1. Kloning Repository & Instal Dependensi
```bash
git clone https://github.com/Fadhraa/Pens-Copilot.git
cd Pens-Copilot
npm install
```

### 2. Konfigurasi Environment Variables
Salin berkas contoh `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel berikut:
```env
# Gemini AI
GOOGLE_API_KEY=AIzaSy...
VITE_GOOGLE_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.6-flash

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# Email Gmail SMTP (Opsional untuk pengingat presensi)
SMTP_USER=penscopilot@gmail.com
SMTP_PASS=your_app_password

PORT=3001
```

### 3. Inisialisasi Database
Jalankan isi berkas [supabase/schema.sql](supabase/schema.sql) di **Supabase Dashboard &rarr; SQL Editor** untuk membuat tabel profil, jadwal, tugas, histori percakapan, dan embedding RAG.

### 4. Menjalankan Server Pengembangan
Buka dua tab terminal terpisah:

**Terminal 1 (Backend AI & Notifikasi):**
```bash
npm run server
```

**Terminal 2 (Frontend Svelte):**
```bash
npm run dev
```
Buka browser pada alamat `http://localhost:5173`.

---

## 🚢 6. Panduan Deployment

* **Backend (Render.com):** Buat Web Service baru, hubungkan dengan repository GitHub ini, gunakan Runtime `Node`, Build Command `npm install`, Start Command `node server/index.js`, dan masukkan Environment Variables.
* **Frontend (Vercel):** Hubungkan repository ke Vercel. Berkas [vercel.json](vercel.json) akan otomatis meneruskan semua endpoint `/api/*` ke backend Render tanpa kendala CORS.

---

## 👥 Tim Pengembang
* **Pengembang:** Fadhra Dzaki Susanto & Tim 10 UKM Softdev PENS
* **Afiliasi:** Politeknik Elektronika Negeri Surabaya (PENS)
