<script>
  import {
    getSubscriptionTier,
    setSubscriptionTier,
    getSubscriptionLimits,
    getRagUsageState,
    FREE_LIMITS,
    PRO_LIMITS,
  } from "../../subscription.js";

  /**
   * @type {{
   *   currentTier?: 'free' | 'pro',
   *   materialsCount?: number,
   *   onBackToChat: () => void,
   *   onTierChanged?: (tier: 'free' | 'pro') => void
   * }}
   */
  let {
    currentTier = getSubscriptionTier(),
    materialsCount = 0,
    onBackToChat,
    onTierChanged = () => {},
  } = $props();

  let localTier = $state(/** @type {'free' | 'pro' | null} */ (null));
  const activeTier = $derived(localTier || currentTier);
  let showBusinessModal = $state(false);
  const ragUsage = $derived(getRagUsageState(activeTier));

  /**
   * @param {'free' | 'pro'} nextTier
   */
  function handleToggleTierSimulation(nextTier) {
    const updated = setSubscriptionTier(nextTier);
    localTier = updated;
    onTierChanged(updated);
  }
</script>

<div
  class="h-full flex flex-col justify-between overflow-y-auto no-scrollbar z-10 max-w-5xl mx-auto w-full space-y-6 pb-8 select-none"
>
  <!-- Top Navigation & Status Bar -->
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <button
      type="button"
      onclick={onBackToChat}
      class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-xs font-semibold text-[#02389E] shadow-sm border border-slate-200 transition-all cursor-pointer"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>Kembali ke Chat</span>
    </button>

    <!-- Simulation Demo Switcher for Evaluation / Presentation -->
    <div
      class="flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs"
    >
      <span class="text-slate-500 font-medium">Status Demo:</span>
      <span
        class="font-bold px-2 py-0.5 rounded-md {activeTier === 'pro'
          ? 'bg-[#FF8500] text-slate-950'
          : 'bg-slate-200 text-slate-700'}"
      >
        {activeTier === "pro" ? "PRO TIER" : "FREE TIER"}
      </span>
      <button
        type="button"
        onclick={() =>
          handleToggleTierSimulation(activeTier === "pro" ? "free" : "pro")}
        class="ml-1 text-[11px] font-semibold text-[#02389E] hover:underline cursor-pointer"
      >
        [Simulasi: {activeTier === "pro" ? "Ganti ke Free" : "Aktifkan Pro"}]
      </button>
    </div>
  </div>

  <!-- Header Banner -->
  <div class="text-center space-y-2.5 max-w-2xl mx-auto">
    <h1
      class="font-michroma text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md"
    >
      Investasi Belajar <span class="text-[#FF8500]">Tanpa Batas</span>
    </h1>
    <p
      class="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed"
    >
      Tingkatkan kesiapan praktikum lab, kuis mingguan, dan pengingat kelas
      ETHOL dengan asisten AI terdedikasi untuk civitas akademika PENS.
    </p>
  </div>

  <!-- Pricing Comparison Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
    <!-- Free Tier Card -->
    <div
      class="bg-white/95 rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md flex flex-col justify-between space-y-6"
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <span
              class="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >Paket Standar</span
            >
            <h2 class="text-xl font-bold text-slate-800">Free Tier</h2>
          </div>
          <span
            class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600"
          >
            Kebutuhan Harian
          </span>
        </div>

        <div>
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-black text-slate-900 font-michroma"
              >Rp 0</span
            >
            <span class="text-xs text-slate-500 font-medium">/ selamanya</span>
          </div>
          <p class="text-xs text-slate-600 mt-1">
            Fitur esensial untuk memeriksa jadwal kuliah dan pengingat presensi
            dasar.
          </p>
        </div>

        <div
          class="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-700"
        >
          <div class="flex items-start gap-2.5">
            <span class="text-emerald-600 font-bold shrink-0">✓</span>
            <span>Jadwal Kuliah & Ruang Kelas</span>
          </div>
          <div class="flex items-start gap-2.5">
            <span class="text-emerald-600 font-bold shrink-0">✓</span>
            <span>Pengingat Presensi ETHOL (Web Toast & Email)</span>
          </div>
          <div class="flex items-start gap-2.5">
            <span class="text-emerald-600 font-bold shrink-0">✓</span>
            <span>Manajemen Tugas & Pelacakan Deadline</span>
          </div>
          <div class="flex items-start gap-2.5 text-amber-700">
            <span class="text-amber-600 font-bold shrink-0">⚠️</span>
            <span
              >Materi Kuliah (RAG): <strong>Maksimal 3 Dokumen</strong> (maks. 5
              MB)</span
            >
          </div>
          <div class="flex items-start gap-2.5 text-amber-700">
            <span class="text-amber-600 font-bold shrink-0">⚠️</span>
            <span>Percakapan Materi RAG: <strong>10 kali/hari</strong></span>
          </div>
          <div class="flex items-start gap-2.5 text-slate-400">
            <span class="font-bold shrink-0">✕</span>
            <span>AI Quiz & Simulasi Ujian dari Diktat</span>
          </div>
          <div class="flex items-start gap-2.5 text-slate-400">
            <span class="font-bold shrink-0">✕</span>
            <span>Notifikasi Darurat WhatsApp / Telegram</span>
          </div>
        </div>
      </div>

      <div>
        {#if activeTier === "free"}
          <div
            class="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-center text-xs font-bold border border-slate-200"
          >
            Paket Anda Saat Ini
          </div>
        {:else}
          <button
            type="button"
            onclick={() => handleToggleTierSimulation("free")}
            class="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-center text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            Pindah ke Akun Free (Simulasi)
          </button>
        {/if}
      </div>
    </div>

    <!-- Pro Tier Card (Highlighted) -->
    <div
      class="bg-gradient-to-b from-white to-[#F6F9FE] rounded-3xl p-6 sm:p-7 border-2 border-[#FF8500] shadow-xl relative flex flex-col justify-between space-y-6"
    >
      <div
        class="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-[#FF8500] text-slate-950 font-black text-[11px] shadow-sm tracking-wide"
      >
        PALING DIREKOMENDASIKAN
      </div>

      <div class="space-y-4">
        <div>
          <span
            class="text-xs font-bold text-[#FF6A00] uppercase tracking-wider"
            >Paket Akademik Penuh</span
          >
          <h2 class="text-xl font-bold text-[#02389E]">PENS Copilot Pro</h2>
        </div>

        <div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl font-black text-slate-900 font-michroma"
              >Rp 50.000</span
            >
            <span class="text-xs text-slate-500 font-medium">/ bulan</span>
          </div>
          <p class="text-xs text-slate-600 mt-1">
            Akses tak terbatas untuk mendongkrak performa akademik dan
            kelancaran praktikum lab.
          </p>
        </div>

        <!-- 3 Core Pro Features Detailed -->
        <div
          class="pt-3 border-t border-slate-200/80 space-y-3.5 text-xs text-slate-800"
        >
          <!-- Fitur 1 -->
          <div
            class="bg-blue-50/70 p-3 rounded-2xl border border-blue-100/80 space-y-1"
          >
            <div class="flex items-center gap-2 font-bold text-[#02389E]">
              <span
                class="w-5 h-5 rounded-md bg-[#02389E] text-white flex items-center justify-center text-[10px]"
                >1</span
              >
              <span>AI Quiz & Exam Simulator</span>
            </div>
            <p class="text-[11px] text-slate-600 pl-7 leading-relaxed">
              Buat simulasi kuis 10–15 soal otomatis langsung dari modul kuliah
              & diktat dosen, lengkap dengan timer dan kunci pembahasan.
            </p>
          </div>

          <!-- Fitur 2 -->
          <div
            class="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/80 space-y-1"
          >
            <div class="flex items-center gap-2 font-bold text-emerald-800">
              <span
                class="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px]"
                >2</span
              >
              <span>Notifikasi Darurat WhatsApp / Telegram</span>
            </div>
            <p class="text-[11px] text-slate-600 pl-7 leading-relaxed">
              Pengingat presensi ETHOL H-15 menit dan morning digest tugas
              harian dikirim langsung ke WhatsApp atau bot Telegram Anda.
            </p>
          </div>

          <!-- Fitur 3 -->
          <div
            class="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/80 space-y-1"
          >
            <div class="flex items-center gap-2 font-bold text-amber-900">
              <span
                class="w-5 h-5 rounded-md bg-[#FF8500] text-slate-950 flex items-center justify-center text-[10px]"
                >3</span
              >
              <span>Unlimited RAG & Asisten Bedah Lapres</span>
            </div>
            <p class="text-[11px] text-slate-600 pl-7 leading-relaxed">
              Bebas unggah modul praktikum tanpa batas (hingga 25 MB/file),
              query lintas materi, dan panduan struktur pembahasan laporan
              praktikum.
            </p>
          </div>

          <div
            class="flex items-center gap-2 text-emerald-700 font-semibold pt-1"
          >
            <span>✓</span>
            <span>Percakapan RAG Tanpa Batas Harian</span>
          </div>
          <div class="flex items-center gap-2 text-emerald-700 font-semibold">
            <span>✓</span>
            <span>Badge Khusus "Mahasiswa Tangguh PENS"</span>
          </div>
        </div>
      </div>

      <div>
        {#if activeTier === "pro"}
          <div
            class="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-center text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Paket Pro Sedang Aktif</span>
          </div>
        {:else}
          <button
            type="button"
            onclick={() => (showBusinessModal = true)}
            class="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#EA5E00] hover:to-[#FF6A00] text-slate-950 text-center text-xs font-black shadow-lg shadow-[#FF6A00]/25 transition-all cursor-pointer active:scale-98"
          >
            Pilih Paket Rp 50.000 / Langganan Sekarang
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Business Aspect & FAQ Explanatory Banner -->
  <div
    class="bg-white/90 backdrop-blur-xs rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3"
  >
    <div class="flex items-center justify-between">
      <h3
        class="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 text-[#02389E]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Transparansi Aspek Bisnis PENS Copilot</span>
      </h3>
      <button
        type="button"
        onclick={() => (showBusinessModal = true)}
        class="text-xs font-semibold text-[#02389E] hover:underline cursor-pointer"
      >
        Lihat Rincian Bisnis & Kontak Admin →
      </button>
    </div>
    <p class="text-xs text-slate-600 leading-relaxed">
      Sistem langganan dirancang untuk menutupi biaya operasional komputasi
      token AI (Google Gemini), penyimpanan vektor RAG (Supabase pgvector),
      serta integrasi notifikasi pesan instan. Seluruh data perkuliahan
      mahasiswa dijamin privasinya dan tidak digunakan untuk melatih model
      publik.
    </p>
  </div>
</div>

<!-- Modal Informasi Bisnis & Konfirmasi Langganan (Static Presentation) -->
{#if showBusinessModal}
  <div
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none max-h-[90vh] overflow-y-auto no-scrollbar"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between">
        <div>
          <span
            class="text-[11px] font-bold text-[#FF6A00] uppercase tracking-wide"
            >Rincian Paket & Aspek Bisnis</span
          >
          <h3 class="text-lg font-bold text-slate-800">
            PENS Copilot Pro (Rp 50.000 / bln)
          </h3>
        </div>
        <button
          type="button"
          onclick={() => (showBusinessModal = false)}
          class="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          aria-label="Tutup modal"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Detail 3 Fitur Utama -->
      <div class="space-y-3 text-xs">
        <h4 class="font-bold text-slate-700">
          3 Fitur Utama yang Anda Dapatkan:
        </h4>
        <div class="space-y-2">
          <div
            class="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5"
          >
            <span class="font-black text-[#02389E]">1.</span>
            <div>
              <span class="font-bold text-[#02389E]"
                >AI Quiz & Exam Simulator:</span
              >
              <p class="text-slate-600 text-[11px] mt-0.5">
                Latihan kuis interaktif berdasarkan diktat & slide kuliah yang
                Anda upload, menguji pemahaman sebelum ujian lab/ETS.
              </p>
            </div>
          </div>

          <div
            class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2.5"
          >
            <span class="font-black text-emerald-800">2.</span>
            <div>
              <span class="font-bold text-emerald-800"
                >Notifikasi Darurat WhatsApp / Telegram:</span
              >
              <p class="text-slate-600 text-[11px] mt-0.5">
                Pengingat presensi ETHOL H-15 menit langsung ke ponsel tanpa
                perlu bolak-balik mengecek tab browser.
              </p>
            </div>
          </div>

          <div
            class="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5"
          >
            <span class="font-black text-amber-900">3.</span>
            <div>
              <span class="font-bold text-amber-900"
                >Unlimited RAG & Asisten Bedah Lapres:</span
              >
              <p class="text-slate-600 text-[11px] mt-0.5">
                Kapasitas berkas hingga 25 MB per dokumen, query lintas modul
                praktikum, dan bantuan kerangka pembahasan laporan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ Aspek Bisnis -->
      <div class="space-y-2 text-xs border-t border-slate-100 pt-3">
        <h4 class="font-bold text-slate-700">FAQ Aspek Bisnis:</h4>
        <div class="space-y-2 text-[11px] text-slate-600">
          <div>
            <strong class="text-slate-800">Metode Pembayaran:</strong>
            <p>
              Mendukung QRIS (GoPay, OVO, Dana, ShopeePay), Transfer Bank
              (Virtual Account), dan pembayaran di koperasi kampus.
            </p>
          </div>
          <div>
            <strong class="text-slate-800">Keamanan Data Materi:</strong>
            <p>
              Seluruh materi diisolasi dengan Row Level Security Supabase; hanya
              akun Anda yang dapat membaca materi yang diunggah.
            </p>
          </div>
        </div>
      </div>

      <!-- Kontak Tim / Admin -->
      <div
        class="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 text-xs"
      >
        <div class="font-bold text-slate-700">
          Hubungi Tim Pengembang / PIC Kampus:
        </div>
        <div class="flex flex-wrap gap-2 text-[11px]">
          <a
            href="https://wa.me/6285233724944?text=Halo%20Admin%20PENS%20Copilot,%20saya%20tertarik%20dengan%20paket%20langganan%20Pro"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>💬 Chat Admin via WhatsApp (0852-3372-4944)</span>
          </a>
          <a
            href="mailto:support@penscopilot.ac.id?subject=Pertanyaan%20Langganan%20PENS%20Copilot%20Pro"
            class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>✉️ Email Tim Pengembang</span>
          </a>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onclick={() => (showBusinessModal = false)}
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Tutup
        </button>

        <button
          type="button"
          onclick={() => {
            handleToggleTierSimulation("pro");
            showBusinessModal = false;
          }}
          class="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FF8500] hover:bg-[#FF6A00] text-slate-950 shadow-md shadow-[#FF8500]/25 transition-all cursor-pointer"
        >
          Simulasikan Aktifkan Pro (Demo)
        </button>
      </div>
    </div>
  </div>
{/if}
