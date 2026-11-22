<script>
  /**
   * @type {{
   *   user: { name?: string, nrp?: string, prodi?: string, email?: string },
   *   schedules: Array<{ day?: string, time_range?: string, time?: string, subject?: string, lecturer?: string, room?: string }>,
   *   onBackToChat: () => void,
   *   onUploadSchedule: () => void
   * }}
   */
  let {
    user = { name: "Mahasiswa PENS", nrp: "", prodi: "", email: "" },
    schedules = [],
    onBackToChat,
    onUploadSchedule,
  } = $props();

  const DAY_ORDER = [
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "jum'at",
    "sabtu",
    "minggu",
  ];

  const sortedSchedules = $derived(
    [...schedules].sort((a, b) => {
      const idxA = DAY_ORDER.indexOf((a.day || "").toLowerCase().trim());
      const idxB = DAY_ORDER.indexOf((b.day || "").toLowerCase().trim());
      const rankA = idxA === -1 ? 99 : idxA;
      const rankB = idxB === -1 ? 99 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return (a.time_range || a.time || "").localeCompare(
        b.time_range || b.time || ""
      );
    })
  );
</script>

<div class="z-10 flex items-center justify-between gap-3 select-none">
  <button
    type="button"
    onclick={onBackToChat}
    class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-xs font-semibold text-[#02389E] shadow-lg border border-slate-200 transition-all cursor-pointer"
  >
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2.2"
        d="M15 19l-7-7 7-7"
      />
    </svg>
    <span>Kembali ke Tanya AI</span>
  </button>

  <span
    class="inline-flex items-center px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-xs font-semibold text-white"
  >
    Profil Mahasiswa
  </span>
</div>

<div class="flex-1 overflow-y-auto no-scrollbar my-5 z-10 max-w-4xl mx-auto w-full space-y-5">
  <section class="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-200/80 text-slate-800">
    <div class="flex flex-col sm:flex-row sm:items-center gap-5">
      <div
        class="w-16 h-16 rounded-2xl bg-[#02389E] flex items-center justify-center shrink-0 shadow-md"
      >
        <svg class="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>

      <div class="min-w-0 flex-1 space-y-1">
        <div class="text-xs font-semibold uppercase tracking-wider text-[#035AB1]">
          Akun PENS Copilot
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 truncate">
          {user.name || "Mahasiswa PENS"}
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 truncate">
          {user.email || "Email belum tersedia"}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
      <div class="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5">
        <div class="text-[11px] font-semibold text-slate-500">Username / Nama</div>
        <div class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
          {user.name || "-"}
        </div>
      </div>

      <div class="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5">
        <div class="text-[11px] font-semibold text-slate-500">Email</div>
        <div class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
          {user.email || "-"}
        </div>
      </div>

      <div class="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5">
        <div class="text-[11px] font-semibold text-slate-500">NRP</div>
        <div class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
          {user.nrp || "Belum diisi"}
        </div>
      </div>

      <div class="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5">
        <div class="text-[11px] font-semibold text-slate-500">Program Studi</div>
        <div class="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
          {user.prodi || "Belum diisi"}
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-200/80 text-slate-800 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h2 class="text-base sm:text-lg font-bold text-slate-900">
          Jadwal Kuliah Tersimpan
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Jadwal ini digunakan oleh PENS Copilot sebagai konteks saat menjawab pertanyaan perkuliahan.
        </p>
      </div>

      <button
        type="button"
        onclick={onUploadSchedule}
        class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>{sortedSchedules.length > 0 ? "Perbarui Jadwal KRS" : "Upload Jadwal KRS"}</span>
      </button>
    </div>

    {#if sortedSchedules.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-2.5 pr-4">Hari</th>
              <th class="py-2.5 pr-4">Waktu</th>
              <th class="py-2.5 pr-4">Mata Kuliah</th>
              <th class="py-2.5 pr-4">Dosen</th>
              <th class="py-2.5">Ruang</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
            {#each sortedSchedules as item, idx (`${item.day}-${item.subject}-${idx}`)}
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 pr-4 font-semibold text-[#02389E] whitespace-nowrap">
                  {item.day || "-"}
                </td>
                <td class="py-3 pr-4 text-slate-600 whitespace-nowrap">
                  {item.time_range || item.time || "-"}
                </td>
                <td class="py-3 pr-4 font-semibold text-slate-900">
                  {item.subject || "-"}
                </td>
                <td class="py-3 pr-4 text-slate-600">
                  {item.lecturer || "-"}
                </td>
                <td class="py-3 text-slate-600 whitespace-nowrap">
                  {item.room || "-"}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-3">
        <div class="w-11 h-11 rounded-2xl bg-[#02389E]/10 text-[#02389E] flex items-center justify-center mx-auto">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-slate-800">
            Belum ada jadwal kuliah yang diunggah
          </h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Unggah jadwal KRS kamu agar tampil di halaman profil dan otomatis terbaca oleh PENS Copilot.
          </p>
        </div>
      </div>
    {/if}
  </section>
</div>
