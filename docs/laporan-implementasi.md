# Laporan Implementasi PENS Copilot

Dokumen ini merangkum seluruh pekerjaan pengembangan antarmuka, konfigurasi agent, serta integrasi database Supabase yang telah diselesaikan pada proyek **PENS Copilot**.

---

## 1. Redesign Antarmuka Autentikasi & Onboarding

Seluruh alur autentikasi dan pendaftaran diselaraskan dengan panduan desain pada [agent/design.md](../agent/design.md):

- **[src/lib/AuthLayout.svelte](../src/lib/AuthLayout.svelte)** — Layout *split-screen* (`48%` panel hero biru royal dengan pola *blueprint grid* `32px x 32px`, logo resmi, wordmark `kerjAIn aja`, dan badge *Khusus Mahasiswa PENS*; `52%` area form kanan berlatar `#EBF0FA`).
- **[src/lib/RegisterStep1.svelte](../src/lib/RegisterStep1.svelte)** — Halaman **Buat Akun** dengan field Nama lengkap, NRP, dropdown Program Studi PENS, Email, Kata sandi & Konfirmasi (dengan toggle intip sandi), serta checkbox persetujuan.
- **[src/lib/Login.svelte](../src/lib/Login.svelte)** — Halaman **Masuk ke Akun** dengan field Email, Kata sandi, tautan *Lupa kata sandi?*, checkbox *Ingat saya*, tombol *Masuk*, serta opsi *Masuk Cepat sebagai Mahasiswa Demo*.
- **[src/lib/ForgotPassword.svelte](../src/lib/ForgotPassword.svelte)** — Halaman **Lupa Kata Sandi?** dengan tab interaktif *Formulir* dan *Terkirim (Sukses)*.
- **[src/lib/RegisterStep2.svelte](../src/lib/RegisterStep2.svelte)** — Halaman **Ekstraksi Jadwal Kuliah oleh AI (Langkah 2)** yang diselaraskan ke tema cerah (`#EBF0FA` + kartu putih `rounded-3xl card-elevation`), dilengkapi dropzone upload KRS, input teks manual, dan tabel jadwal *inline-editable*.
- **[src/App.svelte](../src/App.svelte)** & **[src/app.css](../src/app.css)** — Penghapusan bilah navigasi pengujian (*UI Flow Preview*) dan penambahan token CSS `.blueprint-grid`, `.card-elevation`, serta `.pens-hero-pattern`.

---

## 2. Perbaikan Type-Checking pada Dashboard

Pada [src/lib/Dashboard.svelte](../src/lib/Dashboard.svelte):
- Menambahkan anotasi JSDoc pada `$state([])` untuk variabel `messages` agar tidak memicu peringatan `Variable 'messages' implicitly has an 'any[]' type`.
- Menambahkan anotasi JSDoc pada `$props()` dan membungkus pemanggilan `onclick={() => onLogout()}` agar sesuai dengan tipe `MouseEventHandler<HTMLButtonElement>`.

---

## 3. Pemasangan Skill & Aturan `anti-slop`

Skill `anti-slop` dipasang langsung ke dalam repositori proyek:
- **`.agents/skills/`**: `antislop`, `antislop-ui`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, dan `antislop-code`.
- **`.agents/rules/`**: `antislop.md` dan `antislop.mdc`.
- **[GEMINI.md](../GEMINI.md)** & **[AGENTS.md](../AGENTS.md)**: Aturan proyek di root yang menghubungkan filter `anti-slop` dengan acuan desain [agent/design.md](../agent/design.md).

---

## 4. Setup Database & Integrasi Supabase

### 4.1 Skema Database & Storage ([supabase/schema.sql](../supabase/schema.sql))
- **`profiles`** — Data akun mahasiswa (`id`, `full_name`, `nrp`, `prodi`, `email`, `avatar_url`).
- **`krs_documents`** — Metadata dokumen KRS/gambar yang diunggah ke **Supabase Storage** bucket `krs-uploads` (menggantikan kebutuhan Cloudinary).
- **`schedules`** — Jadwal kuliah hasil ekstraksi AI dan status pengingat presensi ETHOL.
- **`tasks`** — Daftar tugas kuliah, prioritas, status, dan deadline.
- **`chat_sessions` & `chat_messages`** — Histori percakapan asisten AI.
- **`quizzes` & `quiz_attempts`** — Penyimpanan soal quiz AI (`jsonb`) beserta riwayat jawaban dan skor mahasiswa.
- **Row Level Security (RLS)** & **Storage Policies** — Membatasi akses data dan file hanya untuk pemiliknya (`auth.uid()`).
- **Trigger `on_auth_user_created`** — Mengisi tabel `public.profiles` secara otomatis saat `auth.users` menerima pendaftaran baru, sehingga terhindar dari error RLS saat verifikasi email aktif.

### 4.2 Koneksi Frontend
- **[.env](../.env)** — Menambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
- **[src/lib/supabase.js](../src/lib/supabase.js)** — Inisialisasi client `@supabase/supabase-js`.
- Menghubungkan `RegisterStep1.svelte` (`signUp`), `Login.svelte` (`signInWithPassword` + fetch `profiles`), `ForgotPassword.svelte` (`resetPasswordForEmail`), `RegisterStep2.svelte` (`insert` ke `schedules`), dan `App.svelte` (`getSession` & `signOut`).
