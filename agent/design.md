# 🎨 PENS Copilot Design System & Guidelines (`design.md`)

Dokumen ini memuat spesifikasi desain resmi untuk antarmuka pengguna (UI/UX), komponen, dan arsitektur frontend platform **PENS Copilot** (*Platform Terintegrasi Pengingat Presensi ETHOL dan Asisten Pengerjaan Tugas Berbasis AI* - Team 10).

---

## 1. 🌈 Color Palette & Design Tokens

### 1.1 Brand & Gradient Tokens
| Token Name | Hex Code | Utility / Penerapan |
| :--- | :--- | :--- |
| `brand.darkBlue` | `#02389E` | Base Deep Royal Blue, Stop 1 Hero Gradient |
| `brand.blue` | `#0252B8` | Primary Brand Blue, Accent Button Focus Ring |
| `brand.midBlue` | `#035AB1` | Stop 2 Hero Gradient, Active State |
| `brand.sky` | `#018FE6` | Stop 3 Bright Electric Blue |
| `brand.orange` | `#FF6A00` | Primary CTA Button, Highlight "AI", Alert Badge |
| `brand.orangeHover` | `#EA5E00` | CTA Button Hover State |
| `brand.orangePrimary`| `#FF8500` | Emblem, Brand Accent & Logo Highlight |
| `brand.accentGreen` | `#A7F3D0` | Background Pill Badge ("Khusus Mahasiswa PENS") |
| `brand.accentGreenText`| `#065F46` | Text Pill Badge ("Khusus Mahasiswa PENS") |
| `brand.surface` | `#EBF0FA` / `#EEF2F6` | Background Form Canvas / Body |

### 1.2 Left Hero Panel Gradient & Blueprint Grid
* **Linear Gradient Formula**:
  ```css
  background: linear-gradient(135deg, #02389E 0%, #035AB1 50%, #018FE6 100%);
  /* Tailwind: bg-gradient-to-br from-[#02389E] via-[#035AB1] to-[#018FE6] */
  ```
* **Blueprint Engineering Grid Pattern**:
  Garis kisi-kisi putih semi-transparan `32px x 32px` dengan opacity `12%` (`rgba(255, 255, 255, 0.12)`):
  ```css
  .blueprint-grid {
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  ```

### 1.3 Surface Elevation & Shadows
* **Card Elevation Shadow (`.card-elevation`)**:
  ```css
  box-shadow: 0 24px 48px -12px rgba(2, 56, 158, 0.14), 0 0 1px rgba(0, 0, 0, 0.06);
  ```
* **Card Border Radius**: `rounded-3xl` (`24px` / `1.5rem`).
* **Input & Button Border Radius**: `rounded-xl` (`12px` / `0.75rem`).

---

## 2. 🔤 Typography & Brand Hierarchy

### 2.1 Font Families
* **Primary Sans**: `'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
* **Display / Headings**: `'Michroma', 'Plus Jakarta Sans', sans-serif`

### 2.2 Brand Headline & Wordmark
* **Tagline**: `"Tugas Susah Bukan Halangan!"`
  * Typography: `text-white font-semibold text-lg sm:text-xl tracking-normal`
* **Wordmark Hero**: `"kerjAIn aja"`
  * Format: `kerj`<span style="color:#FF6A00; font-weight:900;">`AI`</span>`n aja`
  * Typography: `text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-5`
  * Aksen: Huruf `AI` menggunakan warna `brand.orange` (`#FF6A00`) sebagai representasi kecerdasan buatan.
* **Deskripsi Pendukung**:
  * Text: `"Tanya, susun, dan ingatkan tugas kuliahmu bersama asisten AI khusus mahasiswa PENS."`
  * Typography: `text-blue-100 text-sm sm:text-base leading-relaxed max-w-md font-normal opacity-95`
* **Status Badge**:
  * Label: `"Khusus Mahasiswa PENS"`
  * Style: `inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-[#A7F3D0] text-[#065F46] shadow-sm tracking-wide`

### 2.3 Brand Logo Asset
* **Logo Image**: Official SVG/PNG Logo Container (`h-9 sm:h-10 w-auto object-contain`)
* **Asset CDN Reference**:
  ```html
  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNkLA4FHppDIX-jwlJtNWY4m-CMCun8khuzo5XYapjIdZ6ojrTk7N8iWVWUa4h7wxu4Ssg1KVXfiYAInHnnIdXHiJ5SBdRGD1q9RZNkn_v2TjbvqU0eeMTkZBFgm0gkybHzgqcX6y-hrbaTtB1KFZ9sZ_FWswcJLjsBsq4vaQd_Vlv1rXE17rXhiziuqEj4Dg7LuX-bqThradVbtFRaXLRjqpy4EE5MrTljcWiQMA6Sqg1S4Y8Zwbl" alt="PENS Copilot" class="h-9 w-auto object-contain" />
  ```

---

## 3. 📐 Layout Architecture: Split-Screen Auth (48% / 52%)

```
┌──────────────────────────────────────────────┬─────────────────────────────────────────────────┐
│  LEFT HERO / BRANDING PANEL (48%)            │  RIGHT FORM PANEL (52%)                         │
│  bg-gradient-to-br [#02389E ➔ #018FE6]       │  bg-[#EBF0FA] / Soft Surface Canvas             │
│  + blueprint-grid (32px x 32px, 12% opacity) │                                                 │
│                                              │      ┌───────────────────────────────────┐      │
│  [Logo PENS Copilot (Asset URL)]             │      │  Card Container (max-w-[530px])   │      │
│                                              │      │  bg-white rounded-3xl             │      │
│                                              │      │  box-shadow: .card-elevation      │      │
│  Tugas Susah Bukan Halangan!                 │      │                                   │      │
│  kerjAIn aja                                 │      │  Buat Akun                        │      │
│  Tanya, susun, dan ingatkan tugas...         │      │  Daftar dan mulai kerjAIn tugasmu │      │
│                                              │      │                                   │      │
│                                              │      │  [ Nama Lengkap ]                 │      │
│                                              │      │  [ NRP ]  [ Program Studi (v) ]   │      │
│                                              │      │  [ Email PENS / Email Aktif ]     │      │
│                                              │      │  [ Kata Sandi ] [ Konfirmasi ]    │      │
│                                              │      │  [x] Setuju syarat & ketentuan    │      │
│                                              │      │  [ Tombol Daftar (#FF6A00) ]      │      │
│  [ Khusus Mahasiswa PENS (#A7F3D0) ]         │      │  Sudah punya akun? Masuk          │      │
│                                              │      └───────────────────────────────────┘      │
└──────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

### 3.1 Responsiveness
* **Desktop (`lg:` dan di atasnya)**: Split screen berdampingan 2 kolom (Kiri `48%`, Kanan `52%`), tinggi `min-h-screen`.
* **Tablet / Mobile**: Ditumpuk vertikal (*stack*), panel hero atas berukuran ringkas (`min-h-[460px]`), kartu formulir di bawahnya dengan bantalan (*padding*) responsif `p-4 sm:p-8`.

---

## 4. 📝 Form Specifications & Fields

### 4.1 Buat Akun (Registrasi)
1. **Nama Lengkap**:
   - Tipe: Text, placeholder `"Nama sesuai KRS"`, required.
2. **NRP & Program Studi (2 Kolom)**:
   - **NRP**: Text/Number (`maxlength="14"`, `pattern="[0-9]*"`), placeholder `"Contoh: 3124600001"`.
   - **Program Studi**: Dropdown `<select>` dengan chevron kustom:
     - `D4-TI`: Teknik Informatika
     - `D4-TT`: Teknik Telekomunikasi
     - `D4-TEI`: Teknik Elektro Industri
     - `D4-TM`: Teknik Mekatronika
     - `D4-SDT`: Sains Data Terapan
     - `D3-TK`: Teknik Komputer
     - `D3-TE`: Teknik Elektronika
     - `D4-MMB`: Multimedia Broadcasting
     - `D4-GT`: Teknologi Rekayasa Game
3. **Email**:
   - Tipe: Email, placeholder `"nama@student.pens.ac.id"` (atau email aktif mahasiswa).
   - Validasi instansional: Teks petunjuk bersyarat bila diperlukan.
4. **Kata Sandi & Konfirmasi (2 Kolom)**:
   - Placeholder Kata Sandi: `"Min. 8 karakter"`
   - Placeholder Konfirmasi: `"Ulangi kata sandi"`
   - Interaktivitas: Tombol intip sandi (toggle SVG `Eye` / `EyeOff`).
5. **Checkbox Persetujuan**:
   - Label: `"Saya setuju dengan syarat & ketentuan PENS Copilot."`
   - Accent: `accent-[#FF6A00]`.
6. **Tombol Submit (Daftar)**:
   - Style: `bg-[#FF6A00] hover:bg-[#EA5E00] text-white font-bold py-3.5 px-6 rounded-xl shadow-md active:scale-[0.99]`.
7. **Footer**:
   - Label: `"Sudah punya akun? Masuk"` (`text-blue-600 hover:text-blue-700`).

---

## 5. 🖥️ Layout Dashboard (MacBook Pro 14" Frame)

```
┌─────────────────────────────────┬────────────────────────────────────────────────────────┐
│  SIDEBAR (#EAEFF5)              │  CANVAS (#02389E ➔ #035AB1 ➔ #018FE6 + GRID)           │
│                                 │                                                        │
│  [Logo] PENS Copilot            │  [ AI Model 3x.x ] (Floating Top Left)                 │
│  [ Search...                  ] │                                                        │
│                                 │                                                        │
│  Main                           │                   [ EMBLEM BUNGA PENS ]                │
│  [★ Tanya AI (Active Blue)]     │                                                        │
│                                 │   Selamat Datang, Mahasiswa PENS Let's Start!          │
│  [▼ Cek Tugas ]                 │                                                        │
│    • Daftar Tugas               │   ┌────────────────────────────────────────────────┐   │
│    • Deadline Tugas (!)         │   │ Tanya PENS untuk menyusun, mengingat, dll... [>]│   │
│    • Status Tugas (✓)           │   └────────────────────────────────────────────────┘   │
│                                 │                                                        │
│  [▼ Histori Percakapan ]        │                                                        │
│    • Hari ini                   │                                                        │
│      - Stack di C               │                                                        │
│      - Solusi array             │                                                        │
│                                 │                                                        │
│  [▼ Notifikasi ETHOL ]          │                                                        │
│                                 │                                                        │
│  Account [ Blue Card ]          │                                                        │
│  (M) Mahasiswa PENS             │                                                        │
│  [ Log Out (Orange Button) ]    │                                                        │
└─────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 6. 🚀 Status & Mapping File Frontend
* **Design Token Stylesheet**: [`src/app.css`](file:///d:/UKM%20SOFTDEV/final/src/app.css)
* **Auth Layout Wrapper**: [`src/lib/AuthLayout.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/AuthLayout.svelte)
* **Register Screen**: [`src/lib/RegisterStep1.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/RegisterStep1.svelte)
* **Login Screen**: [`src/lib/Login.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/Login.svelte)
* **Forgot Password Screen**: [`src/lib/ForgotPassword.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/ForgotPassword.svelte)
* **Step 2 (Jadwal AI & ETHOL)**: [`src/lib/RegisterStep2.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/RegisterStep2.svelte)
* **Main Dashboard**: [`src/lib/Dashboard.svelte`](file:///d:/UKM%20SOFTDEV/final/src/lib/Dashboard.svelte)
