<script>
  import { onMount, tick } from 'svelte';
  import AOS from 'aos';

  /** @type {{ onNavigate?: (view: string) => void }} */
  let { onNavigate = () => {} } = $props();

  onMount(() => {
    const aos = /** @type {any} */ (AOS)?.init ? AOS : /** @type {any} */ (AOS)?.default;
    if (!aos) return;

    aos.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 120,
      disable: false
    });

    const handleRefresh = () => aos.refreshHard();
    tick().then(handleRefresh);
    const t1 = setTimeout(handleRefresh, 150);
    const t2 = setTimeout(handleRefresh, 600);
    window.addEventListener('load', handleRefresh);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('load', handleRefresh);
    };
  });

  const logoUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBNkLA4FHppDIX-jwlJtNWY4m-CMCun8khuzo5XYapjIdZ6ojrTk7N8iWVWUa4h7wxu4Ssg1KVXfiYAInHnnIdXHiJ5SBdRGD1q9RZNkn_v2TjbvqU0eeMTkZBFgm0gkybHzgqcX6y-hrbaTtB1KFZ9sZ_FWswcJLjsBsq4vaQd_Vlv1rXE17rXhiziuqEj4Dg7LuX-bqThradVbtFRaXLRjqpy4EE5MrTljcWiQMA6Sqg1S4Y8Zwbl';

  let logoFailed = $state(false);
  let mobileMenuOpen = $state(false);
  let scrollY = $state(0);
  const isScrolled = $derived(scrollY > 24);

  let activeStep = $state(1);
  const onboardingSteps = [
    {
      step: 1,
      title: 'Daftar Identitas & Program Studi',
      summary:
        'Mahasiswa memasukkan nama sesuai KRS, NRP, program studi D3 atau D4 di PENS, email aktif, dan kata sandi untuk membuat profil akun di Supabase.',
      detailItems: [
        'NRP dan program studi disimpan ke tabel profiles',
        'Sesi login dikelola melalui Supabase Auth',
        'Mendukung pemulihan kata sandi lewat email terdaftar'
      ]
    },
    {
      step: 2,
      title: 'Ekstraksi Jadwal KRS ke Tabel Terstruktur',
      summary:
        'Unggah dokumen KRS (PDF atau tangkapan layar SIM Online) atau tempel teks jadwal kuliah. Hasil ekstraksi dapat disunting langsung sebelum disimpan.',
      detailItems: [
        'Kolom hari, jam kuliah, mata kuliah, dosen, dan ruang/link dapat diedit langsung',
        'File KRS tersimpan aman di bucket privat per akun',
        'Data jadwal masuk ke tabel schedules untuk konteks asisten belajar'
      ]
    },
    {
      step: 3,
      title: 'Unggah Catatan Kuliah & Mulai Diskusi',
      summary:
        'Tambahkan catatan atau modul kuliah (.txt / .md) agar diindeks ke pgvector. Saat bertanya, asisten AI mengambil potongan materi yang cocok beserta jadwal dan tugas Anda.',
      detailItems: [
        'Pencarian semantik mengambil referensi modul milik Anda sendiri',
        'Histori percakapan tersimpan di chat_sessions dan chat_messages',
        'Pertanyaan dapat dilanjutkan kembali dari daftar riwayat di sidebar'
      ]
    }
  ];

  let selectedProdiId = $state('d4-ti');
  const prodiList = [
    {
      id: 'd4-ti',
      name: 'D4 Teknik Informatika',
      sampleCourse: 'Workshop Pemrograman Web & Struktur Data',
      sampleNote: 'Simpan modul pointer C, relasi basis data, atau arsitektur REST API lalu tanyakan langsung saat mengerjakan praktikum.'
    },
    {
      id: 'd4-sdt',
      name: 'D4 Sains Data Terapan',
      sampleCourse: 'Pemodelan Statistika & Pembelajaran Mesin',
      sampleNote: 'Indeks catatan rumus regresi, metrik evaluasi model, dan pengingat tenggat laporan proyek analisis data.'
    },
    {
      id: 'd4-tm',
      name: 'D4 Teknik Mekatronika',
      sampleCourse: 'Sistem Kendali & Pemrograman Mikrokontroler',
      sampleNote: 'Simpan ringkasan konfigurasi pin, diagram blok kendali PID, serta jadwal sesi praktikum bengkel dan lab.'
    },
    {
      id: 'd4-te',
      name: 'D4 Teknik Elektronika',
      sampleCourse: 'Rangkaian Elektronika Analog & Digital',
      sampleNote: 'Rangkum parameter komponen, analisis rangkaian op-amp, dan pengingat jadwal presensi ETHOL sebelum kelas teori.'
    },
    {
      id: 'd4-tt',
      name: 'D4 Teknik Telekomunikasi',
      sampleCourse: 'Pengolahan Sinyal Digital & Jaringan Seluler',
      sampleNote: 'Kelompokkan catatan modul modulasi sinyal, perhitungan link budget, dan daftar tugas mingguan per mata kuliah.'
    },
    {
      id: 'd3-tk',
      name: 'D3 & D4 Teknik Komputer',
      sampleCourse: 'Arsitektur Komputer & Sistem Tertanam',
      sampleNote: 'Simpan catatan konfigurasi jaringan, protokol komunikasi serial, dan rangkuman persiapan ujian praktikum.'
    }
  ];

  const activeProdi = $derived(
    prodiList.find((p) => p.id === selectedProdiId) || prodiList[0]
  );

  /**
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape' && mobileMenuOpen) {
      mobileMenuOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} bind:scrollY={scrollY} />

<div class="min-h-screen bg-[#EBF0FA] text-slate-800 font-sans antialiased flex flex-col selection:bg-[#FF6A00] selection:text-slate-950">
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-white focus:text-[#02389E] focus:font-bold focus:shadow-lg"
  >
    Lewati ke konten utama
  </a>

  <!-- Top Navigation Header -->
  <header
    class="fixed top-0 inset-x-0 z-40 transition-colors duration-200 {isScrolled || mobileMenuOpen ? 'bg-[#02389E]/95 border-b border-white/15 shadow-lg backdrop-blur-md' : 'bg-transparent border-b border-transparent'}"
  >
    <div class="w-full px-6 sm:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between gap-4">
      <a
        href="#main-content"
        class="inline-flex items-center gap-2.5 min-h-[44px] py-1 focus-visible:outline-white"
        aria-label="Beranda PENS Copilot"
      >
        {#if !logoFailed}
          <img
            src={logoUrl}
            alt="PENS Copilot"
            width="144"
            height="36"
            fetchpriority="high"
            class="h-9 w-auto object-contain"
            onerror={() => (logoFailed = true)}
          />
        {:else}
          <span class="font-michroma text-base font-bold text-white tracking-tight">
            PENS <span class="text-[#FFC789]">Copilot</span>
          </span>
        {/if}
      </a>

      <nav aria-label="Navigasi Utama" class="hidden lg:flex items-center gap-2">
        <a
          href="#fitur"
          class="min-h-[44px] px-3.5 inline-flex items-center text-sm font-medium text-white hover:text-[#FFC789] rounded-xl transition-colors"
        >
          Fitur Akademik
        </a>
        <a
          href="#cara-kerja"
          class="min-h-[44px] px-3.5 inline-flex items-center text-sm font-medium text-white hover:text-[#FFC789] rounded-xl transition-colors"
        >
          Alur Pemakaian
        </a>
        <a
          href="#program-studi"
          class="min-h-[44px] px-3.5 inline-flex items-center text-sm font-medium text-white hover:text-[#FFC789] rounded-xl transition-colors"
        >
          Program Studi
        </a>
      </nav>

      <div class="hidden lg:flex items-center gap-3">
        <button
          type="button"
          onclick={() => onNavigate('login')}
          class="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/35 hover:bg-white/10 active:scale-[0.99] transition-colors"
        >
          Masuk
        </button>
        <button
          type="button"
          onclick={() => onNavigate('register')}
          class="min-h-[44px] px-5 py-2 rounded-xl text-sm font-bold text-slate-950 bg-[#FF6A00] hover:bg-[#EA5E00] active:scale-[0.99] shadow-md transition-colors"
        >
          Daftar Akun
        </button>
      </div>

      <button
        type="button"
        class="lg:hidden min-h-[44px] px-4 rounded-xl border border-white/35 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-white/10 transition-colors"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-nav-drawer"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      >
        <span>{mobileMenuOpen ? 'Tutup' : 'Menu'}</span>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          {#if mobileMenuOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
      </button>
    </div>

    {#if mobileMenuOpen}
      <div
        id="mobile-nav-drawer"
        class="lg:hidden bg-[#02389E] border-t border-white/15 px-4 py-4 space-y-2"
      >
        <nav aria-label="Navigasi Seluler" class="flex flex-col gap-2">
          <a
            href="#fitur"
            onclick={() => (mobileMenuOpen = false)}
            class="min-h-[44px] px-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 flex items-center"
          >
            Fitur Akademik
          </a>
          <a
            href="#cara-kerja"
            onclick={() => (mobileMenuOpen = false)}
            class="min-h-[44px] px-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 flex items-center"
          >
            Alur Pemakaian
          </a>
          <a
            href="#program-studi"
            onclick={() => (mobileMenuOpen = false)}
            class="min-h-[44px] px-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 flex items-center"
          >
            Program Studi
          </a>
        </nav>
        <div class="pt-3 border-t border-white/15 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onclick={() => {
              mobileMenuOpen = false;
              onNavigate('login');
            }}
            class="min-h-[44px] flex-1 px-4 rounded-xl text-sm font-semibold text-white border border-white/35 hover:bg-white/10"
          >
            Masuk
          </button>
          <button
            type="button"
            onclick={() => {
              mobileMenuOpen = false;
              onNavigate('register');
            }}
            class="min-h-[44px] flex-1 px-4 rounded-xl text-sm font-bold text-slate-950 bg-[#FF6A00] hover:bg-[#EA5E00]"
          >
            Daftar Akun
          </button>
        </div>
      </div>
    {/if}
  </header>

  <main id="main-content" class="flex-1 overflow-x-clip">
    <!-- Section 1: Hero with Royal Blue Gradient + Blueprint Grid & Framed Student Illustration -->
    <section class="relative min-h-dvh flex flex-col justify-center bg-gradient-to-br from-[#02389E] via-[#02389E] to-[#035AB1] text-white overflow-hidden pt-20 pb-12">
      <div aria-hidden="true" class="absolute inset-0 blueprint-grid pointer-events-none opacity-90"></div>

      <div class="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        <div class="lg:col-span-6 space-y-6">
         

          <p class="text-white font-semibold text-xl sm:text-2xl tracking-normal">
            Tugas Susah Bukan Halangan!
          </p>

          <h1 class="text-5xl sm:text-6xl lg:text-7xl xl:text-[84px] font-black text-white tracking-tight leading-none">
            kerj<span class="text-[#FF6A00]">AI</span>n aja
          </h1>

          <p class="text-blue-50 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl">
            Tanya materi kuliah dari catatan dosen, susun daftar tugas, dan atur pengingat presensi ETHOL dalam satu ruang kerja akademik untuk mahasiswa Politeknik Elektronika Negeri Surabaya.
          </p>

          <div class="pt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onclick={() => onNavigate('register')}
              class="min-h-[54px] px-7 py-3.5 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] active:scale-[0.99] text-slate-950 font-bold text-base shadow-lg transition-all"
            >
              Buat Akun Mahasiswa
            </button>
            <button
              type="button"
              onclick={() => onNavigate('login')}
              class="min-h-[54px] px-7 py-3.5 rounded-xl bg-white text-[#02389E] hover:bg-blue-50 active:scale-[0.99] font-bold text-base shadow-md transition-all"
            >
              Masuk ke Akun
            </button>
          </div>
        </div>

        <!-- Modern Minimalist Arch White Pedestal Framing the Full-Body Illustration -->
        <div class="lg:col-span-6 flex items-center justify-center">
          <div class="relative w-full max-w-[680px] bg-white rounded-t-[320px] rounded-b-[36px] pt-5 pb-3 px-3 sm:px-6 card-elevation border border-white/80 ring-1 ring-white/20 ring-offset-8 ring-offset-[#02389E] flex flex-col items-center justify-end overflow-hidden">
            <img
              src="/hero-students-full.png?v=2"
              alt="Ilustrasi penuh mahasiswa PENS berdiri bersepatu membawa buku modul kuliah dan laptop"
              width="658"
              height="487"
              fetchpriority="high"
              class="w-full h-auto max-h-[580px] object-contain rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Asymmetric Feature Architecture (1 Flagship + 2 Asymmetric Panels) -->
    <section id="fitur" class="py-16 sm:py-20 w-full px-6 sm:px-10 lg:px-16 xl:px-20">
      <div class="max-w-2xl mb-10" data-aos="fade-up">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Dirancang untuk alur kuliah di PENS
        </h2>
        <p class="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
          Setiap fitur terhubung ke satu basis data akun agar catatan kuliah, jadwal KRS, dan pengingat tugas tidak tercecer di tempat berbeda.
        </p>
      </div>

      <!-- Flagship Full-Width Panel -->
      <div class="bg-white rounded-3xl p-7 sm:p-10 card-elevation border border-slate-100 mb-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center" data-aos="fade-up" data-aos-delay="100">
        <div class="lg:col-span-7 space-y-3">
          <h3 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tanya jawab materi kuliah dari catatan dan modul pribadi (RAG)
          </h3>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            Unggah file catatan atau modul kuliah dalam format teks (.txt atau .md). Sistem memecah teks menjadi potongan kecil, mengindeksnya ke pgvector sebagai vektor 768 dimensi, lalu menyertakan bagian yang paling relevan saat Anda bertanya ke asisten belajar.
          </p>
          <ul class="pt-2 space-y-2 text-sm text-slate-700">
            <li class="flex items-start gap-2.5">
              <span class="mt-1 w-2 h-2 rounded-full bg-[#FF6A00] shrink-0" aria-hidden="true"></span>
              <span>Jawaban mengacu pada materi yang Anda unggah sendiri, bukan tebakan umum.</span>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="mt-1 w-2 h-2 rounded-full bg-[#FF6A00] shrink-0" aria-hidden="true"></span>
              <span>Terisolasi per akun mahasiswa melalui kebijakan Row Level Security di Supabase.</span>
            </li>
          </ul>
        </div>

        <div class="lg:col-span-5 bg-[#EBF0FA] rounded-2xl p-5 border border-slate-200 space-y-3">
          <div class="bg-white rounded-xl p-3.5 border border-slate-200" data-aos="fade-left" data-aos-delay="100">
            <div class="text-xs font-bold text-[#02389E]">1. Input Modul Kuliah</div>
            <div class="text-xs text-slate-600 mt-0.5">Unggah berkas .txt/.md atau tempel ringkasan materi dosen.</div>
          </div>
          <div class="bg-white rounded-xl p-3.5 border border-slate-200" data-aos="fade-left" data-aos-delay="200">
            <div class="text-xs font-bold text-[#02389E]">2. Pencarian Semantik pgvector</div>
            <div class="text-xs text-slate-600 mt-0.5">Pertanyaan dicocokkan dengan potongan materi paling mendekati konteks.</div>
          </div>
          <div class="bg-white rounded-xl p-3.5 border border-slate-200" data-aos="fade-left" data-aos-delay="300">
            <div class="text-xs font-bold text-[#02389E]">3. Jawaban Kontekstual</div>
            <div class="text-xs text-slate-600 mt-0.5">Ringkasan atau penjelasan disusun langsung bersama konteks jadwal aktif Anda.</div>
          </div>
        </div>
      </div>

      <!-- Bottom Asymmetric 7/5 Panels -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 bg-white rounded-3xl p-7 sm:p-8 card-elevation border border-slate-100 flex flex-col justify-between space-y-5" data-aos="fade-up" data-aos-delay="100">
          <div class="space-y-2.5">
            <h3 class="text-xl font-bold text-slate-900 tracking-tight">
              Ekstraksi jadwal KRS dan kontrol presensi ETHOL
            </h3>
            <p class="text-slate-600 text-sm leading-relaxed">
              Pada langkah kedua pendaftaran, Anda dapat mengunggah PDF KRS ETHOL, screenshot SIM Online, atau menempel teks jadwal kuliah. Seluruh kolom hari, jam, dosen, dan ruangan dapat diperbaiki langsung di tabel sebelum disimpan.
            </p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div class="rounded-xl bg-[#EBF0FA] p-3 text-slate-800 font-semibold">Hari Kuliah</div>
            <div class="rounded-xl bg-[#EBF0FA] p-3 text-slate-800 font-semibold">Jam Mulai & Selesai</div>
            <div class="rounded-xl bg-[#EBF0FA] p-3 text-slate-800 font-semibold">Dosen Pengampu</div>
            <div class="rounded-xl bg-[#EBF0FA] p-3 text-slate-800 font-semibold">Ruang / Link</div>
          </div>
        </div>

        <div class="lg:col-span-5 bg-[#02389E] text-white rounded-3xl p-7 sm:p-8 shadow-xl flex flex-col justify-between space-y-5" data-aos="fade-up" data-aos-delay="200">
          <div class="space-y-2.5">
            <h3 class="text-xl font-bold text-white tracking-tight">
              Konteks terpadu jadwal, tugas, dan riwayat chat
            </h3>
            <p class="text-blue-100 text-sm leading-relaxed">
              Setiap sesi percakapan tersimpan otomatis di sidebar berdasarkan waktu, dapat dicari kembali lewat kolom pencarian, dan asisten membaca jadwal serta tenggat tugas milik Anda secara langsung.
            </p>
          </div>
          <div>
            <button
              type="button"
              onclick={() => onNavigate('register')}
              class="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-xs sm:text-sm transition-colors"
            >
              Coba Ruang Kerja Belajar
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Genuine Chronological Onboarding Sequence -->
    <section id="cara-kerja" class="py-16 sm:py-20 bg-white border-y border-slate-200/80 w-full px-6 sm:px-10 lg:px-16 xl:px-20">
      <div class="w-full">
        <div class="max-w-2xl mb-10" data-aos="fade-up">
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Alur pemakaian dari daftar hingga diskusi
          </h2>
          <p class="text-slate-600 text-sm sm:text-base mt-2">
            Klik setiap langkah untuk melihat data apa saja yang diisi dan bagaimana sistem menyimpannya.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-5 space-y-3" role="tablist" aria-label="Langkah Penggunaan" data-aos="fade-right" data-aos-delay="100">
            {#each onboardingSteps as item (item.step)}
              <button
                type="button"
                role="tab"
                aria-selected={activeStep === item.step}
                onclick={() => (activeStep = item.step)}
                class="w-full min-h-[64px] text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 {activeStep === item.step ? 'bg-[#02389E] text-white border-[#02389E] shadow-md' : 'bg-[#EBF0FA]/60 text-slate-800 border-slate-200 hover:bg-[#EBF0FA]'}"
              >
                <span class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold {activeStep === item.step ? 'bg-[#FF6A00] text-slate-950' : 'bg-white text-[#02389E] border border-slate-300'}">
                  {item.step}
                </span>
                <span>
                  <span class="block text-sm font-bold">{item.title}</span>
                  <span class="block text-xs mt-0.5 {activeStep === item.step ? 'text-blue-100' : 'text-slate-600'}">
                    Tahap {item.step} dari 3
                  </span>
                </span>
              </button>
            {/each}
          </div>

          <div class="lg:col-span-7 bg-[#EBF0FA] rounded-3xl p-6 sm:p-8 border border-slate-200" data-aos="fade-left" data-aos-delay="200">
            {#each onboardingSteps as item (item.step)}
              {#if activeStep === item.step}
                <div class="space-y-4">
                  <div class="inline-flex items-center px-3 py-1 rounded-lg bg-white text-[#02389E] text-xs font-bold border border-slate-200">
                    Langkah {item.step}
                  </div>
                  <h3 class="text-xl font-bold text-slate-900">{item.title}</h3>
                  <p class="text-sm text-slate-700 leading-relaxed">{item.summary}</p>
                  <ul class="space-y-2 pt-1">
                    {#each item.detailItems as detail}
                      <li class="flex items-start gap-2.5 text-sm text-slate-800">
                        <svg class="w-4 h-4 text-[#02389E] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{detail}</span>
                      </li>
                    {/each}
                  </ul>
                  <div class="pt-3">
                    <button
                      type="button"
                      onclick={() => onNavigate('register')}
                      class="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-sm shadow-sm transition-colors"
                    >
                      Mulai dari Langkah 1
                    </button>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: Program Studi Explorer & Conversion Banner -->
    <section id="program-studi" class="py-16 sm:py-20 w-full px-6 sm:px-10 lg:px-16 xl:px-20 space-y-12">
      <div class="bg-white rounded-3xl p-6 sm:p-10 card-elevation border border-slate-100 space-y-6" data-aos="fade-up">
        <div class="max-w-2xl">
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Dukungan lintas program studi di PENS
          </h2>
          <p class="text-slate-600 text-sm sm:text-base mt-2">
            Pilih program studi saat mendaftar agar asisten mengenali konteks mata kuliah dan kebutuhan belajar di jurusan Anda.
          </p>
        </div>

        <div class="flex flex-wrap gap-2.5" role="tablist" aria-label="Pilih Program Studi PENS">
          {#each prodiList as prodi (prodi.id)}
            <button
              type="button"
              role="tab"
              aria-selected={selectedProdiId === prodi.id}
              onclick={() => (selectedProdiId = prodi.id)}
              class="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors {selectedProdiId === prodi.id ? 'bg-[#02389E] text-white border-[#02389E]' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
            >
              {prodi.name}
            </button>
          {/each}
        </div>

        <div class="rounded-2xl bg-[#EBF0FA] border border-slate-200 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div class="md:col-span-5">
            <span class="text-xs font-semibold text-[#02389E] block">Contoh Mata Kuliah</span>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{activeProdi.sampleCourse}</h3>
          </div>
          <div class="md:col-span-7 text-sm text-slate-700 leading-relaxed">
            {activeProdi.sampleNote}
          </div>
        </div>
      </div>

      <!-- Closing CTA Banner -->
      <div class="relative rounded-3xl bg-gradient-to-br from-[#02389E] via-[#02389E] to-[#035AB1] p-8 sm:p-12 text-white overflow-hidden shadow-xl" data-aos="zoom-in-up" data-aos-delay="100">
        <div aria-hidden="true" class="absolute inset-0 blueprint-grid pointer-events-none opacity-80"></div>
        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="max-w-xl space-y-2">
            <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Siap merapikan jadwal ETHOL dan materi kuliah semester ini?
            </h2>
            <p class="text-blue-100 text-sm sm:text-base">
              Buat akun dengan NRP dan email aktif Anda untuk mulai menyusun jadwal dan mengunggah catatan kuliah.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onclick={() => onNavigate('register')}
              class="min-h-[48px] px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-sm shadow-lg transition-colors"
            >
              Buat Akun Mahasiswa
            </button>
            <button
              type="button"
              onclick={() => onNavigate('login')}
              class="min-h-[48px] px-6 py-3 rounded-xl bg-white text-[#02389E] hover:bg-blue-50 font-bold text-sm shadow-md transition-colors"
            >
              Masuk ke Akun
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Single-Row Responsive Footer -->
  <footer class="bg-[#0F172A] text-slate-200 border-t border-slate-800 py-8 w-full px-6 sm:px-10 lg:px-16 xl:px-20">
    <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <div class="font-michroma text-sm font-bold text-white">
          PENS <span class="text-[#FFC789]">Copilot</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Asisten tugas, materi RAG, dan pengingat presensi ETHOL untuk mahasiswa PENS.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <a href="#fitur" class="min-h-[44px] px-2.5 inline-flex items-center text-slate-200 hover:text-[#FFC789]">
          Fitur Akademik
        </a>
        <a href="#cara-kerja" class="min-h-[44px] px-2.5 inline-flex items-center text-slate-200 hover:text-[#FFC789]">
          Alur Pemakaian
        </a>
        <a href="#program-studi" class="min-h-[44px] px-2.5 inline-flex items-center text-slate-200 hover:text-[#FFC789]">
          Program Studi
        </a>
        <button
          type="button"
          onclick={() => onNavigate('login')}
          class="min-h-[44px] px-3.5 rounded-xl border border-slate-600 text-white hover:bg-slate-800 font-semibold"
        >
          Masuk
        </button>
        <button
          type="button"
          onclick={() => onNavigate('register')}
          class="min-h-[44px] px-4 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold"
        >
          Daftar
        </button>
      </div>
    </div>
  </footer>
</div>
