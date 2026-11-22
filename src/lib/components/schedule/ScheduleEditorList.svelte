<script>
  const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  /**
   * @type {{
   *   schedules: Array<{ id: number | string, day: string, time: string, subject: string, lecturer: string, room: string }>,
   *   isLoadingExisting?: boolean,
   *   onAddRow: () => void,
   *   onDeleteRow: (id: number | string) => void
   * }}
   */
  let {
    schedules = $bindable([]),
    isLoadingExisting = false,
    onAddRow,
    onDeleteRow,
  } = $props();
</script>

<div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 text-slate-800 flex flex-col justify-between space-y-5">
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base sm:text-lg font-bold text-slate-900">
            Daftar Jadwal Kuliah
          </h2>
          <span class="px-2.5 py-0.5 rounded-full bg-[#EBF0FA] text-[#02389E] text-xs font-bold">
            {schedules.length} Mata Kuliah
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-0.5">
          Edit langsung setiap kartu di bawah atau tambahkan baris baru secara manual.
        </p>
      </div>

      <button
        type="button"
        onclick={onAddRow}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#02389E] hover:bg-[#035AB1] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Mata Kuliah</span>
      </button>
    </div>

    {#if isLoadingExisting}
      <div class="py-12 text-center space-y-2.5">
        <div class="w-7 h-7 border-3 border-[#035AB1] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div class="text-xs text-slate-500 font-medium">Memuat jadwal tersimpan...</div>
      </div>
    {:else if schedules.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-3">
        <div class="w-11 h-11 rounded-2xl bg-[#02389E]/10 text-[#02389E] flex items-center justify-center mx-auto">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-slate-800">
            Belum ada jadwal di daftar
          </h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Unggah berkas KRS atau tempel teks di panel kiri untuk ekstraksi otomatis, atau klik "Tambah Mata Kuliah" untuk mengisi manual.
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-3 max-h-[540px] overflow-y-auto no-scrollbar pr-0.5">
        {#each schedules as item, index (item.id)}
          <div class="rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#035AB1]/40 p-3.5 sm:p-4 space-y-3 transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <span class="w-6 h-6 rounded-lg bg-[#02389E] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>

                <select
                  aria-label="Hari kuliah"
                  bind:value={item.day}
                  class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:outline-none focus:border-[#035AB1] cursor-pointer"
                >
                  {#each DAYS as dayOption}
                    <option value={dayOption}>{dayOption}</option>
                  {/each}
                </select>

                <input
                  type="text"
                  aria-label="Jam kuliah"
                  bind:value={item.time}
                  placeholder="08:00 - 10:30"
                  class="w-36 sm:w-40 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:outline-none focus:border-[#035AB1]"
                />
              </div>

              <button
                type="button"
                onclick={() => onDeleteRow(item.id)}
                aria-label="Hapus mata kuliah"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="hidden sm:inline">Hapus</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div class="sm:col-span-5">
                <label
                  for={`subject-${item.id}`}
                  class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
                >
                  Mata Kuliah
                </label>
                <input
                  id={`subject-${item.id}`}
                  type="text"
                  bind:value={item.subject}
                  placeholder="Contoh: Struktur Data"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:outline-none focus:border-[#035AB1]"
                />
              </div>

              <div class="sm:col-span-4">
                <label
                  for={`lecturer-${item.id}`}
                  class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
                >
                  Dosen Pengampu
                </label>
                <input
                  id={`lecturer-${item.id}`}
                  type="text"
                  bind:value={item.lecturer}
                  placeholder="Nama dosen"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:outline-none focus:border-[#035AB1]"
                />
              </div>

              <div class="sm:col-span-3">
                <label
                  for={`room-${item.id}`}
                  class="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1"
                >
                  Ruang / Link
                </label>
                <input
                  id={`room-${item.id}`}
                  type="text"
                  bind:value={item.room}
                  placeholder="Lab / D4"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:outline-none focus:border-[#035AB1]"
                />
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
