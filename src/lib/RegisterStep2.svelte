<script>
  import { onMount } from "svelte";
  import { supabase } from "./supabase.js";
  import { extractSchedules } from "./ai.js";
  import ScheduleUploader from "./components/schedule/ScheduleUploader.svelte";
  import ScheduleEditorList from "./components/schedule/ScheduleEditorList.svelte";

  const ALLOWED_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  /**
   * @type {{
   *   onBack?: () => void,
   *   onFinish?: (data: Record<string, any>) => void,
   *   onSkip?: () => void,
   *   userData?: Record<string, any>,
   *   fromProfile?: boolean
   * }}
   */
  let {
    onBack = () => {},
    onFinish = () => {},
    onSkip = () => {},
    userData = {},
    fromProfile = false,
  } = $props();

  /** @type {'upload' | 'paste'} */
  let inputMethod = $state("upload");
  let manualText = $state("");
  /** @type {File | null} */
  let rawFile = $state(null);
  let selectedFile = $derived(
    rawFile
      ? { name: rawFile.name, size: rawFile.size, type: rawFile.type }
      : null
  );

  let isLoadingExisting = $state(true);
  let isExtracting = $state(false);
  let isSaving = $state(false);
  let extractError = $state("");
  let extractSuccessMsg = $state("");
  let saveError = $state("");
  let logoFailed = $state(false);

  /** @type {Array<{ id: number | string, day: string, time: string, subject: string, lecturer: string, room: string }>} */
  let schedules = $state([]);

  onMount(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("schedules")
          .select("id, day, time_range, subject, lecturer, room")
          .eq("user_id", user.id);

        if (data?.length) {
          schedules = data.map((row) => ({
            id: row.id,
            day: row.day || "Senin",
            time: row.time_range || "",
            subject: row.subject || "",
            lecturer: row.lecturer || "",
            room: row.room || "",
          }));
          return;
        }
      }

      if (Array.isArray(userData?.schedules) && userData.schedules.length > 0) {
        schedules = userData.schedules.map((row, idx) => ({
          id: row.id || Date.now() + idx,
          day: row.day || "Senin",
          time: row.time || row.time_range || "",
          subject: row.subject || "",
          lecturer: row.lecturer || "",
          room: row.room || "",
        }));
      }
    } finally {
      isLoadingExisting = false;
    }
  });

  /**
   * Read browser File object into base64 payload without data URI prefix.
   * @param {File} file
   * @returns {Promise<string>}
   */
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const commaIdx = result.indexOf(",");
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error("Gagal membaca berkas."));
      reader.readAsDataURL(file);
    });
  }

  /** @param {File} file */
  function handleFileSelect(file) {
    extractError = "";
    extractSuccessMsg = "";

    if (!ALLOWED_TYPES.has(file.type)) {
      extractError = "Format berkas harus PDF, PNG, JPG, atau WebP.";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      extractError = "Ukuran berkas melebihi batas maksimal 10 MB.";
      return;
    }
    rawFile = file;
  }

  function handleClearFile() {
    rawFile = null;
    extractError = "";
    extractSuccessMsg = "";
  }

  async function handleExtract() {
    extractError = "";
    extractSuccessMsg = "";
    isExtracting = true;

    try {
      let result;
      if (inputMethod === "upload") {
        if (!rawFile) {
          throw new Error("Pilih berkas KRS terlebih dahulu.");
        }
        const fileData = await readFileAsBase64(rawFile);
        result = await extractSchedules({
          fileData,
          mimeType: rawFile.type,
          fileName: rawFile.name,
        });
      } else {
        if (!manualText.trim()) {
          throw new Error("Tempel teks jadwal terlebih dahulu.");
        }
        result = await extractSchedules({
          rawText: manualText.trim(),
        });
      }

      if (!result.schedules.length) {
        extractError =
          "AI tidak menemukan jadwal mata kuliah pada sumber tersebut. Pastikan teks/gambar terbaca jelas atau tambahkan secara manual.";
        return;
      }

      const baseId = Date.now();
      const mapped = result.schedules.map((item, idx) => ({
        id: baseId + idx,
        day: item.day || "Senin",
        time: item.time || "",
        subject: item.subject || "",
        lecturer: item.lecturer || "",
        room: item.room || "",
      }));

      schedules = [...schedules, ...mapped];
      extractSuccessMsg = `Berhasil mengekstrak ${mapped.length} mata kuliah (${result.modelUsed}). Periksa hasil di panel kanan sebelum menyimpan.`;
      if (inputMethod === "paste") {
        manualText = "";
      }
    } catch (err) {
      extractError =
        err instanceof Error
          ? err.message
          : "Gagal memindai jadwal dengan AI.";
    } finally {
      isExtracting = false;
    }
  }

  function addRow() {
    schedules = [
      ...schedules,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        day: "Senin",
        time: "08:00 - 10:30",
        subject: "",
        lecturer: "",
        room: "",
      },
    ];
  }

  /** @param {number | string} id */
  function deleteRow(id) {
    schedules = schedules.filter((s) => s.id !== id);
  }

  async function handleSave() {
    saveError = "";

    const hasIncompleteRow = schedules.some(
      (s) =>
        !s.subject.trim() &&
        (s.lecturer.trim() || s.room.trim() || s.time.trim())
    );
    if (hasIncompleteRow) {
      saveError = "Lengkapi kolom Nama Mata Kuliah pada baris yang masih kosong atau hapus baris tersebut.";
      return;
    }

    const cleaned = schedules
      .filter((s) => s.subject.trim().length > 0)
      .map((s) => ({
        ...s,
        day: s.day || "Senin",
        time: s.time.trim(),
        subject: s.subject.trim(),
        lecturer: s.lecturer.trim(),
        room: s.room.trim(),
      }));

    isSaving = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let savedSchedules = cleaned;

      if (user) {
        let krsDocumentId = null;

        if (rawFile) {
          const safeName = rawFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const filePath = `${user.id}/${Date.now()}-${safeName}`;
          const { error: uploadErr } = await supabase.storage
            .from("krs-uploads")
            .upload(filePath, rawFile, { upsert: true });

          if (!uploadErr) {
            const { data: docRow } = await supabase
              .from("krs_documents")
              .insert({
                user_id: user.id,
                file_path: filePath,
                file_name: rawFile.name,
                mime_type: rawFile.type,
                extracted_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (docRow?.id) krsDocumentId = docRow.id;
          }
        }

        const { error: deleteErr } = await supabase
          .from("schedules")
          .delete()
          .eq("user_id", user.id);

        if (deleteErr) {
          throw new Error(`Gagal menyinkronkan jadwal lama: ${deleteErr.message}`);
        }

        if (cleaned.length > 0) {
          const rowsToInsert = cleaned.map((s) => ({
            user_id: user.id,
            ...(krsDocumentId ? { krs_document_id: krsDocumentId } : {}),
            day: s.day,
            time_range: s.time || "-",
            subject: s.subject,
            lecturer: s.lecturer,
            room: s.room,
          }));

          const { data: insertedRows, error: insertErr } = await supabase
            .from("schedules")
            .insert(rowsToInsert)
            .select("id, day, time_range, subject, lecturer, room");

          if (insertErr) {
            throw new Error(`Gagal menyimpan jadwal ke database: ${insertErr.message}`);
          }

          if (insertedRows) {
            savedSchedules = insertedRows.map((r) => ({
              id: r.id,
              day: r.day,
              time: r.time_range,
              subject: r.subject,
              lecturer: r.lecturer || "",
              room: r.room || "",
            }));
          }
        }
      }

      onFinish({
        ...userData,
        schedules: savedSchedules,
      });
    } catch (err) {
      saveError =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan jadwal.";
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="min-h-screen w-full bg-gradient-to-br from-[#02389E] via-[#02389E] to-[#035AB1] relative overflow-x-clip font-sans flex flex-col">
  <div aria-hidden="true" class="absolute inset-0 blueprint-grid pointer-events-none opacity-85"></div>

  <div class="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex-1 flex flex-col justify-between space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        {#if !logoFailed}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNkLA4FHppDIX-jwlJtNWY4m-CMCun8khuzo5XYapjIdZ6ojrTk7N8iWVWUa4h7wxu4Ssg1KVXfiYAInHnnIdXHiJ5SBdRGD1q9RZNkn_v2TjbvqU0eeMTkZBFgm0gkybHzgqcX6y-hrbaTtB1KFZ9sZ_FWswcJLjsBsq4vaQd_Vlv1rXE17rXhiziuqEj4Dg7LuX-bqThradVbtFRaXLRjqpy4EE5MrTljcWiQMA6Sqg1S4Y8Zwbl"
            alt="PENS Copilot"
            class="h-8 w-auto object-contain"
            onerror={() => (logoFailed = true)}
          />
        {:else}
          <span class="font-michroma text-sm font-bold text-white">
            PENS <span class="text-[#FFC789]">Copilot</span>
          </span>
        {/if}

        <span class="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-semibold text-white">
          {fromProfile ? "Kelola Jadwal Kuliah" : "Langkah 2 dari 2 · Atur Jadwal KRS"}
        </span>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          onclick={() => onBack()}
          class="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          {fromProfile ? "Kembali ke Profil" : "Kembali"}
        </button>

        {#if !fromProfile}
          <button
            type="button"
            onclick={() => onSkip()}
            class="px-3.5 py-2 rounded-xl bg-white text-[#02389E] hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Lewati untuk Sekarang
          </button>
        {/if}
      </div>
    </header>

    <div class="space-y-5 flex-1">
      <div class="max-w-2xl space-y-1.5 text-white">
        <h1 class="font-michroma text-xl sm:text-2xl font-bold tracking-tight">
          Atur & Ekstrak Jadwal Kuliah
        </h1>
        <p class="text-xs sm:text-sm text-blue-100 leading-relaxed">
          Jadwal tersimpan menjadi konteks utama PENS Copilot saat menjawab jadwal kuliah, ruang kelas, dan pengingat presensi ETHOL Anda.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div class="lg:col-span-5">
          <ScheduleUploader
            bind:inputMethod
            bind:manualText
            {selectedFile}
            {isExtracting}
            {extractError}
            {extractSuccessMsg}
            onFileSelect={handleFileSelect}
            onClearFile={handleClearFile}
            onExtract={handleExtract}
          />
        </div>

        <div class="lg:col-span-7 space-y-4">
          <ScheduleEditorList
            bind:schedules
            {isLoadingExisting}
            onAddRow={addRow}
            onDeleteRow={deleteRow}
          />

          {#if saveError}
            <div class="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 font-medium shadow-md">
              {saveError}
            </div>
          {/if}

          <div class="bg-white/95 rounded-2xl p-4 shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="text-xs text-slate-600 text-center sm:text-left">
              Perubahan jadwal akan disinkronkan penuh ke akun Supabase Anda.
            </div>

            <button
              type="button"
              onclick={handleSave}
              disabled={isSaving || isLoadingExisting}
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-[#FF6A00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] shrink-0"
            >
              {#if isSaving}
                <span class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                <span>Menyimpan Jadwal...</span>
              {:else}
                <span>{fromProfile ? "Simpan Perubahan Jadwal" : "Simpan Jadwal & Masuk Dashboard"}</span>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
