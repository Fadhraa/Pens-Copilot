<script>
  /**
   * @type {{
   *   inputMethod: 'upload' | 'paste',
   *   manualText: string,
   *   selectedFile: { name: string, size: number, type: string } | null,
   *   isExtracting?: boolean,
   *   extractError?: string,
   *   extractSuccessMsg?: string,
   *   onFileSelect: (file: File) => void,
   *   onClearFile: () => void,
   *   onExtract: () => void
   * }}
   */
  let {
    inputMethod = $bindable("upload"),
    manualText = $bindable(""),
    selectedFile = null,
    isExtracting = false,
    extractError = "",
    extractSuccessMsg = "",
    onFileSelect,
    onClearFile,
    onExtract,
  } = $props();

  let isDragOver = $state(false);
  /** @type {HTMLInputElement | undefined} */
  let fileInput = $state(undefined);

  /** @param {number} bytes */
  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /** @param {Event} e */
  function handleInputChange(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget);
    const file = input.files?.[0];
    if (file) onFileSelect(file);
    input.value = "";
  }

  /** @param {DragEvent} e */
  function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) onFileSelect(file);
  }
</script>

<div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 text-slate-800 space-y-5">
  <div class="space-y-1">
    <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#035AB1]">
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Ekstraksi Jadwal AI</span>
    </span>
    <h2 class="text-base sm:text-lg font-bold text-slate-900">
      Unggah KRS atau Tempel Teks
    </h2>
    <p class="text-xs text-slate-500 leading-relaxed">
      Pindai PDF KRS ETHOL, screenshot SIM Online, atau teks jadwal kuliah secara otomatis menjadi daftar terstruktur.
    </p>
  </div>

  <div class="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
    <button
      type="button"
      onclick={() => (inputMethod = "upload")}
      class="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 {inputMethod === 'upload'
        ? 'bg-white text-[#02389E] shadow-xs border border-slate-200'
        : 'text-slate-600 hover:text-slate-900'}"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <span>Upload Berkas KRS</span>
    </button>

    <button
      type="button"
      onclick={() => (inputMethod = "paste")}
      class="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 {inputMethod === 'paste'
        ? 'bg-white text-[#02389E] shadow-xs border border-slate-200'
        : 'text-slate-600 hover:text-slate-900'}"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Paste Teks Jadwal</span>
    </button>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept=".pdf,image/png,image/jpeg,image/webp"
    class="hidden"
    onchange={handleInputChange}
  />

  {#if inputMethod === "upload"}
    {#if selectedFile}
      <div class="rounded-2xl border border-[#035AB1]/25 bg-[#EBF0FA]/70 p-4 flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-[#02389E] text-white flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-900 truncate" title={selectedFile.name}>
              {selectedFile.name}
            </div>
            <div class="text-[11px] text-slate-600 mt-0.5">
              {formatBytes(selectedFile.size)} · Siap dipindai AI
            </div>
          </div>
        </div>

        <button
          type="button"
          onclick={onClearFile}
          disabled={isExtracting}
          class="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          Hapus
        </button>
      </div>
    {:else}
      <div
        role="button"
        tabindex="0"
        onclick={() => fileInput?.click()}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInput?.click();
          }
        }}
        ondragover={(e) => {
          e.preventDefault();
          isDragOver = true;
        }}
        ondragleave={() => (isDragOver = false)}
        ondrop={handleDrop}
        class="rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none {isDragOver
          ? 'border-[#FF6A00] bg-orange-50/70'
          : 'border-slate-300 bg-slate-50/80 hover:border-[#035AB1] hover:bg-blue-50/40'}"
      >
        <div class="w-11 h-11 rounded-2xl bg-[#02389E]/10 text-[#02389E] flex items-center justify-center mx-auto mb-3">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div class="text-xs sm:text-sm font-semibold text-slate-800">
          Klik untuk pilih berkas atau seret ke sini
        </div>
        <p class="text-[11px] text-slate-500 mt-1">
          Format didukung: PDF KRS ETHOL, PNG, JPG, WebP (maks. 10 MB)
        </p>
      </div>
    {/if}
  {:else}
    <div class="space-y-2">
      <label for="schedule-raw-text" class="block text-xs font-semibold text-slate-700">
        Tempel teks jadwal kuliah dari SIM Online atau ETHOL
      </label>
      <textarea
        id="schedule-raw-text"
        bind:value={manualText}
        disabled={isExtracting}
        rows="6"
        placeholder={"Contoh:\nSenin 08:00 - 11:20 Workshop Pemrograman Web | Ferry Astika S.ST. | Lab Terpadu 304\nSelasa 13:00 - 15:30 Struktur Data | Umi Sa'adah M.Kom. | Gedung D4 Lt. 2"}
        class="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:outline-none focus:bg-white focus:border-[#035AB1] transition-colors"
      ></textarea>
    </div>
  {/if}

  <button
    type="button"
    onclick={onExtract}
    disabled={isExtracting || (inputMethod === "upload" ? !selectedFile : !manualText.trim())}
    class="w-full py-3 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-[#FF6A00]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
  >
    {#if isExtracting}
      <span class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
      <span>Memindai Jadwal dengan AI...</span>
    {:else}
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Ekstrak Jadwal dengan AI</span>
    {/if}
  </button>

  {#if extractError}
    <div class="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 leading-relaxed">
      {extractError}
    </div>
  {/if}

  {#if extractSuccessMsg}
    <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 font-medium leading-relaxed">
      {extractSuccessMsg}
    </div>
  {/if}
</div>
