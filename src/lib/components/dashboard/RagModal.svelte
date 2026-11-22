<script>
  /**
   * @type {{
   *   open: boolean,
   *   ragTitle: string,
   *   ragSubject: string,
   *   ragText: string,
   *   ragStatus: string,
   *   isIngesting: boolean,
   *   onClose: () => void,
   *   onFileUpload: (e: Event) => void,
   *   onSubmit: (e?: SubmitEvent) => void
   * }}
   */
  let {
    open = false,
    ragTitle = $bindable(""),
    ragSubject = $bindable(""),
    ragText = $bindable(""),
    ragStatus = "",
    isIngesting = false,
    onClose,
    onFileUpload,
    onSubmit,
  } = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-800 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">Tambah Materi Kuliah (RAG)</h3>
          <p class="text-xs text-slate-500">Materi diindeks dengan pgvector agar AI menjawab sesuai bahan kuliah Anda.</p>
        </div>
        <button
          type="button"
          onclick={onClose}
          aria-label="Tutup modal materi"
          class="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <form onsubmit={onSubmit} class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="rag-title" class="block text-xs font-semibold text-slate-700 mb-1">Judul Materi</label>
            <input
              id="rag-title"
              type="text"
              bind:value={ragTitle}
              required
              placeholder="Contoh: Modul 3 Stack & Queue"
              class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:outline-none focus:border-[#FF6A00]"
            />
          </div>
          <div>
            <label for="rag-subject" class="block text-xs font-semibold text-slate-700 mb-1">Mata Kuliah</label>
            <input
              id="rag-subject"
              type="text"
              bind:value={ragSubject}
              placeholder="Contoh: Struktur Data"
              class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:outline-none focus:border-[#FF6A00]"
            />
          </div>
        </div>

        <div>
          <label for="rag-file" class="block text-xs font-semibold text-slate-700 mb-1">Unggah File Teks / Markdown (.txt, .md)</label>
          <input
            id="rag-file"
            type="file"
            accept=".txt,.md,.csv"
            onchange={onFileUpload}
            class="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold hover:file:bg-slate-200 cursor-pointer"
          />
        </div>

        <div>
          <label for="rag-text" class="block text-xs font-semibold text-slate-700 mb-1">Isi Materi / Catatan</label>
          <textarea
            id="rag-text"
            rows="5"
            bind:value={ragText}
            required
            placeholder="Tempel teks materi kuliah atau catatan modul di sini..."
            class="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:outline-none focus:border-[#FF6A00]"
          ></textarea>
        </div>

        {#if ragStatus}
          <div class="text-xs px-3 py-2 rounded-xl bg-blue-50 text-[#02389E] font-medium">
            {ragStatus}
          </div>
        {/if}

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="submit"
            disabled={isIngesting}
            class="px-5 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isIngesting ? "Mengindeks..." : "Simpan ke RAG"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
