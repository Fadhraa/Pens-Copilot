<script>
  const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv"];

  /**
   * @type {{
   *   materials: Array<{ id: string, title: string, subject?: string, created_at?: string }>,
   *   schedules: Array<{ subject: string }>,
   *   isIngesting?: boolean,
   *   ragStatus?: string,
   *   ragError?: string,
   *   subscriptionTier?: 'free' | 'pro',
   *   onBackToChat: () => void,
   *   onIngestMaterial: (payload: {
   *     title: string,
   *     subject: string,
   *     fileData?: string,
   *     mimeType?: string,
   *     fileName?: string,
   *     rawText?: string
   *   }) => Promise<boolean>,
   *   onDeleteMaterial: (materialId: string) => Promise<void>,
   *   onOpenSubscription?: () => void
   * }}
   */
  let {
    materials = [],
    schedules = [],
    isIngesting = false,
    ragStatus = "",
    ragError = "",
    subscriptionTier = "free",
    onBackToChat,
    onIngestMaterial,
    onDeleteMaterial,
    onOpenSubscription = () => {},
  } = $props();

  const isFree = $derived(subscriptionTier !== "pro");
  const maxDocs = $derived(isFree ? 3 : 1000);
  const maxFileBytes = $derived(isFree ? 5 * 1024 * 1024 : 25 * 1024 * 1024);
  const maxFileSizeLabel = $derived(isFree ? "5 MB" : "25 MB");
  const isDocLimitReached = $derived(isFree && materials.length >= 3);

  /** @type {'file' | 'text'} */
  let inputMode = $state("file");
  let title = $state("");
  let subject = $state("");
  let rawText = $state("");
  let filterQuery = $state("");
  let localValidationError = $state("");
  let isDragOver = $state(false);
  /** @type {File | null} */
  let rawFile = $state(null);
  /** @type {HTMLInputElement | undefined} */
  let fileInput = $state(undefined);

  const uniqueSubjects = $derived(
    [...new Set(schedules.map((s) => String(s.subject || "").trim()).filter(Boolean))]
  );

  const filteredMaterials = $derived(
    filterQuery.trim()
      ? materials.filter((m) => {
          const q = filterQuery.trim().toLowerCase();
          return (
            String(m.title || "").toLowerCase().includes(q) ||
            String(m.subject || "").toLowerCase().includes(q)
          );
        })
      : materials
  );

  /** @param {number} bytes */
  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /** @param {string | undefined} iso */
  function formatDate(iso) {
    if (!iso) return "Baru saja";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
    }).format(d);
  }

  /** @param {File} file */
  function handleFileSelected(file) {
    localValidationError = "";
    const lowerName = file.name.toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowedExt) {
      localValidationError = "Format berkas harus PDF, DOCX, TXT, MD, atau CSV.";
      return;
    }
    if (file.size > maxFileBytes) {
      localValidationError = isFree
        ? "Ukuran dokumen maksimal 5 MB untuk akun Free. Tingkatkan ke Pro untuk upload berkas hingga 25 MB."
        : "Ukuran dokumen maksimal 25 MB.";
      return;
    }

    rawFile = file;
    if (!title.trim()) {
      title = file.name.replace(/\.[^.]+$/, "");
    }
  }

  /** @param {File} file */
  function readBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(new Error("Gagal membaca file materi."));
      reader.readAsDataURL(file);
    });
  }

  /** @param {SubmitEvent} e */
  async function handleSubmit(e) {
    e.preventDefault();
    localValidationError = "";

    if (isDocLimitReached) {
      localValidationError = "Batas 3 dokumen untuk akun Free telah tercapai. Hapus materi lama atau tingkatkan ke Pro.";
      return;
    }

    if (!title.trim()) {
      localValidationError = "Judul materi wajib diisi.";
      return;
    }

    if (inputMode === "file") {
      if (!rawFile) {
        localValidationError = "Pilih berkas PDF, DOCX, TXT, atau MD terlebih dahulu.";
        return;
      }
      const fileData = await readBase64(rawFile);
      const ok = await onIngestMaterial({
        title: title.trim(),
        subject: subject.trim(),
        fileData,
        mimeType: rawFile.type,
        fileName: rawFile.name,
      });
      if (ok) {
        title = "";
        subject = "";
        rawFile = null;
      }
      return;
    }

    if (!rawText.trim()) {
      localValidationError = "Isi catatan materi wajib diisi.";
      return;
    }

    const ok = await onIngestMaterial({
      title: title.trim(),
      subject: subject.trim(),
      rawText: rawText.trim(),
    });
    if (ok) {
      title = "";
      subject = "";
      rawText = "";
    }
  }
</script>

<div class="z-10 flex items-center justify-between gap-3 flex-wrap select-none">
  <button
    type="button"
    onclick={onBackToChat}
    class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-xs font-semibold text-[#02389E] shadow-lg border border-slate-200 transition-all cursor-pointer"
  >
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 19l-7-7 7-7" />
    </svg>
    <span>Kembali ke Tanya AI</span>
  </button>

  <div class="flex items-center gap-2">
    <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 text-xs font-semibold text-slate-800 shadow-sm border border-slate-200">
      <span>Dokumen:</span>
      <span class="font-bold {isDocLimitReached ? 'text-amber-700' : 'text-[#02389E]'}">
        {materials.length} / {isFree ? '3' : '∞'}
      </span>
      <span class="text-[11px] text-slate-500">(Maks {maxFileSizeLabel})</span>
    </div>
    {#if isFree}
      <button
        type="button"
        onclick={onOpenSubscription}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#EA5E00] hover:to-[#FF6A00] text-slate-950 text-xs font-black shadow-sm transition-all cursor-pointer"
      >
        <span>⚡ Upgrade Pro</span>
      </button>
    {/if}
  </div>
</div>

<div class="flex-1 overflow-y-auto no-scrollbar my-5 z-10 max-w-5xl mx-auto w-full">
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
    <section class="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 text-slate-800 space-y-4">
      <div>
        <h1 class="text-base sm:text-lg font-bold text-slate-900">
          Unggah Materi Kuliah
        </h1>
        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Mendukung PDF, Word (.docx), TXT, dan Markdown. Ekstraksi dan vektorisasi berjalan sekali saat unggah agar chat AI tetap cepat.
        </p>
      </div>

      {#if isDocLimitReached}
        <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 space-y-3">
          <div class="flex items-center gap-2 font-bold text-xs text-amber-950">
            <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Batas 3 Dokumen Tercapai (Free Tier)</span>
          </div>
          <p class="text-xs text-amber-800 leading-relaxed">
            Anda telah mencapai kuota maksimal 3 dokumen tersimpan untuk akun Free. Hapus salah satu materi yang sudah tidak dipelajari untuk mengunggah materi baru, atau tingkatkan ke paket Pro untuk kapasitas tanpa batas dan berkas hingga 25 MB.
          </p>
          <button
            type="button"
            onclick={onOpenSubscription}
            class="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#EA5E00] hover:to-[#FF6A00] text-slate-950 font-black text-xs rounded-xl shadow-md shadow-[#FF6A00]/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>⚡ Tingkatkan ke PENS Copilot Pro (Rp 50K)</span>
          </button>
        </div>
      {:else}
      <div class="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
        <button
          type="button"
          onclick={() => (inputMode = "file")}
          class="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer {inputMode === 'file' ? 'bg-white text-[#02389E] shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}"
        >
          Upload PDF / Word / TXT
        </button>
        <button
          type="button"
          onclick={() => (inputMode = "text")}
          class="py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer {inputMode === 'text' ? 'bg-white text-[#02389E] shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}"
        >
          Tempel Catatan Teks
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-3.5">
        <div>
          <label for="mat-title" class="block text-xs font-semibold text-slate-700 mb-1">
            Judul Materi
          </label>
          <input
            id="mat-title"
            type="text"
            bind:value={title}
            required
            placeholder="Contoh: Modul 4 Routing & Switching"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#035AB1]"
          />
        </div>

        <div>
          <label for="mat-subject" class="block text-xs font-semibold text-slate-700 mb-1">
            Mata Kuliah
          </label>
          <input
            id="mat-subject"
            type="text"
            list="pens-subject-list"
            bind:value={subject}
            placeholder="Contoh: Jaringan Komputer"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#035AB1]"
          />
          <datalist id="pens-subject-list">
            {#each uniqueSubjects as sub}
              <option value={sub}></option>
            {/each}
          </datalist>
        </div>

        <input
          bind:this={fileInput}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv"
          class="hidden"
          onchange={(e) => {
            const input = /** @type {HTMLInputElement} */ (e.currentTarget);
            const f = input.files?.[0];
            if (f) handleFileSelected(f);
            input.value = "";
          }}
        />

        {#if inputMode === "file"}
          {#if rawFile}
            <div class="rounded-2xl border border-[#035AB1]/25 bg-[#EBF0FA]/70 p-3.5 flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 truncate">{rawFile.name}</div>
                <div class="text-[11px] text-slate-600">{formatBytes(rawFile.size)}</div>
              </div>
              <button
                type="button"
                onclick={() => (rawFile = null)}
                class="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg cursor-pointer"
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
              ondrop={(e) => {
                e.preventDefault();
                isDragOver = false;
                const f = e.dataTransfer?.files?.[0];
                if (f) handleFileSelected(f);
              }}
              class="rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors {isDragOver ? 'border-[#FF6A00] bg-orange-50/60' : 'border-slate-300 bg-slate-50 hover:border-[#035AB1]'}"
            >
              <div class="text-xs font-semibold text-slate-800">
                Klik atau seret berkas PDF / DOCX / TXT / MD ke sini
              </div>
              <div class="text-[11px] text-slate-500 mt-1">
                Maksimal {maxFileSizeLabel} per dokumen
              </div>
            </div>
          {/if}
        {:else}
          <div>
            <label for="mat-raw-text" class="block text-xs font-semibold text-slate-700 mb-1">
              Isi Materi / Catatan
            </label>
            <textarea
              id="mat-raw-text"
              rows="6"
              bind:value={rawText}
              placeholder="Tempel ringkasan modul atau catatan perkuliahan Anda..."
              class="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
            ></textarea>
          </div>
        {/if}

        {#if localValidationError || ragError}
          <div class="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            {localValidationError || ragError}
          </div>
        {/if}

        {#if ragStatus}
          <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 font-medium">
            {ragStatus}
          </div>
        {/if}

        <button
          type="submit"
          disabled={isIngesting}
          class="w-full py-2.5 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {#if isIngesting}
            <span class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            <span>Mengekstrak &amp; Mengindeks RAG...</span>
          {:else}
            <span>Simpan &amp; Indeks ke RAG</span>
          {/if}
        </button>
      </form>
      {/if}
    </section>

    <section class="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 text-slate-800 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">
              Materi Terindeks
            </h2>
            <span class="px-2.5 py-0.5 rounded-full bg-[#EBF0FA] text-[#02389E] text-xs font-bold">
              {materials.length} Dokumen
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            PENS Copilot mengambil referensi teratas dari daftar materi di bawah saat Anda bertanya tentang kuliah.
          </p>
        </div>

        <input
          type="text"
          bind:value={filterQuery}
          aria-label="Cari materi terindeks"
          placeholder="Cari judul / matkul..."
          class="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#035AB1]"
        />
      </div>

      {#if filteredMaterials.length === 0}
        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-1.5">
          <div class="text-sm font-bold text-slate-800">
            {materials.length === 0 ? "Belum ada materi kuliah terindeks" : "Materi tidak ditemukan"}
          </div>
          <p class="text-xs text-slate-500">
            {materials.length === 0
              ? "Unggah modul PDF, Word (.docx), atau catatan kuliah di panel kiri."
              : "Coba ubah kata kunci pencarian di atas."}
          </p>
        </div>
      {:else}
        <div class="space-y-2.5 max-h-[520px] overflow-y-auto no-scrollbar">
          {#each filteredMaterials as mat (mat.id)}
            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white p-3.5 flex items-center justify-between gap-3 transition-colors">
              <div class="min-w-0 space-y-1">
                <div class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {mat.title}
                </div>
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {#if mat.subject}
                    <span class="px-2 py-0.5 rounded-md bg-[#EBF0FA] text-[#02389E] font-semibold">
                      {mat.subject}
                    </span>
                  {/if}
                  <span>Diunggah {formatDate(mat.created_at)}</span>
                </div>
              </div>

              <button
                type="button"
                onclick={() => onDeleteMaterial(mat.id)}
                class="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 cursor-pointer shrink-0"
              >
                Hapus
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
