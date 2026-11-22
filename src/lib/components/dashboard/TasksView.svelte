<script>
  /**
   * @type {{
   *   tasks: Array<{ id: string, schedule_id?: string | null, title: string, description?: string | null, deadline?: string | null, status: string, priority: string }>,
   *   schedules: Array<{ id?: string, subject: string, day?: string }>,
   *   activeTab?: 'all' | 'deadlines' | 'status',
   *   isSaving?: boolean,
   *   taskError?: string,
   *   onTabChange?: (tab: 'all' | 'deadlines' | 'status') => void,
   *   onBackToChat: () => void,
   *   onCreateTask: (payload: Record<string, any>) => Promise<boolean>,
   *   onUpdateTask: (taskId: string, payload: Record<string, any>) => Promise<boolean>,
   *   onDeleteTask: (taskId: string) => Promise<void>
   * }}
   */
  let {
    tasks = [],
    schedules = [],
    activeTab = "all",
    isSaving = false,
    taskError = "",
    onTabChange = () => {},
    onBackToChat,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
  } = $props();

  let showForm = $state(false);
  /** @type {string | null} */
  let editingTaskId = $state(null);

  let formTitle = $state("");
  let formDescription = $state("");
  let formScheduleId = $state("");
  let formPriority = $state("medium");
  let formStatus = $state("pending");
  let formDeadline = $state("");

  const counts = $derived({
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  });

  const sortedByDeadline = $derived(
    [...tasks].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      const ta = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    })
  );

  const visibleTasks = $derived(
    activeTab === "deadlines" ? sortedByDeadline : tasks
  );

  const scheduleMap = $derived(
    new Map(
      schedules
        .filter((s) => s.id)
        .map((s) => [String(s.id), s.subject])
    )
  );

  /** @param {string | null | undefined} iso */
  function toDatetimeLocalValue(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(d)
      .replace(" ", "T");
    return parts;
  }

  function openNewForm() {
    editingTaskId = null;
    formTitle = "";
    formDescription = "";
    formScheduleId = "";
    formPriority = "medium";
    formStatus = "pending";
    formDeadline = "";
    showForm = true;
  }

  /** @param {Record<string, any>} task */
  function openEditForm(task) {
    editingTaskId = task.id;
    formTitle = task.title || "";
    formDescription = task.description || "";
    formScheduleId = task.schedule_id ? String(task.schedule_id) : "";
    formPriority = task.priority || "medium";
    formStatus = task.status || "pending";
    formDeadline = toDatetimeLocalValue(task.deadline);
    showForm = true;
  }

  /** @param {SubmitEvent} e */
  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const deadlineIso = formDeadline ? `${formDeadline}:00+07:00` : null;
    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      schedule_id: formScheduleId || null,
      priority: formPriority,
      status: formStatus,
      deadline: deadlineIso,
    };

    const ok = editingTaskId
      ? await onUpdateTask(editingTaskId, payload)
      : await onCreateTask(payload);

    if (ok) {
      showForm = false;
      editingTaskId = null;
    }
  }

  /** @param {string | null | undefined} iso */
  function formatDeadlineText(iso) {
    if (!iso) return "Tanpa deadline";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)} WIB`;
  }

  /** @param {Record<string, any>} task */
  function getUrgencyBadge(task) {
    if (task.status === "completed") {
      return { text: "Selesai", cls: "bg-emerald-100 text-emerald-800" };
    }
    if (!task.deadline) return null;
    const diff = new Date(task.deadline).getTime() - Date.now();
    if (diff < 0) return { text: "Terlewat", cls: "bg-rose-100 text-rose-800" };
    if (diff <= 3 * 3600 * 1000) return { text: "<= 3 Jam", cls: "bg-rose-100 text-rose-800" };
    if (diff <= 24 * 3600 * 1000) return { text: "H-1", cls: "bg-amber-100 text-amber-900" };
    return null;
  }

  /** @param {string} p */
  function priorityBadge(p) {
    if (p === "high") return "bg-rose-50 text-rose-700 border-rose-200";
    if (p === "low") return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-blue-50 text-[#02389E] border-blue-200";
  }

  const STATUS_COLUMNS = [
    { key: "pending", title: "Belum Mulai", dot: "bg-amber-500" },
    { key: "in_progress", title: "Dikerjakan", dot: "bg-[#035AB1]" },
    { key: "completed", title: "Selesai", dot: "bg-emerald-600" },
  ];
</script>

<div class="z-10 flex flex-wrap items-center justify-between gap-3 select-none">
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

  <button
    type="button"
    onclick={openNewForm}
    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-xs font-bold shadow-lg transition-all cursor-pointer"
  >
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M12 4v16m8-8H4" />
    </svg>
    <span>Tambah Tugas</span>
  </button>
</div>

<div class="flex-1 overflow-y-auto no-scrollbar my-5 z-10 max-w-5xl mx-auto w-full space-y-5">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div class="bg-white rounded-2xl p-4 shadow-md border border-slate-200/80 flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold text-slate-500">Belum Mulai</div>
        <div class="text-2xl font-bold text-slate-900 mt-0.5">{counts.pending}</div>
      </div>
      <span class="w-3 h-3 rounded-full bg-amber-500"></span>
    </div>

    <div class="bg-white rounded-2xl p-4 shadow-md border border-slate-200/80 flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold text-slate-500">Sedang Dikerjakan</div>
        <div class="text-2xl font-bold text-[#02389E] mt-0.5">{counts.in_progress}</div>
      </div>
      <span class="w-3 h-3 rounded-full bg-[#035AB1]"></span>
    </div>

    <div class="bg-white rounded-2xl p-4 shadow-md border border-slate-200/80 flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold text-slate-500">Selesai</div>
        <div class="text-2xl font-bold text-emerald-700 mt-0.5">{counts.completed}</div>
      </div>
      <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
    </div>
  </div>

  {#if taskError}
    <div class="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-800 font-medium">
      {taskError}
    </div>
  {/if}

  {#if showForm}
    <section class="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 text-slate-800 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 class="text-base font-bold text-slate-900">
          {editingTaskId ? "Edit Tugas Kuliah" : "Tambah Tugas Baru"}
        </h2>
        <button
          type="button"
          onclick={() => (showForm = false)}
          class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          Tutup
        </button>
      </div>

      <form onsubmit={handleFormSubmit} class="space-y-3.5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="task-title" class="block text-xs font-semibold text-slate-700 mb-1">
              Judul Tugas
            </label>
            <input
              id="task-title"
              type="text"
              bind:value={formTitle}
              required
              placeholder="Contoh: Laporan Praktikum Jaringan"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#035AB1]"
            />
          </div>

          <div>
            <label for="task-schedule" class="block text-xs font-semibold text-slate-700 mb-1">
              Mata Kuliah (Opsional)
            </label>
            <select
              id="task-schedule"
              bind:value={formScheduleId}
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
            >
              <option value="">Tidak ditautkan ke matkul tertentu</option>
              {#each schedules.filter((s) => s.id) as sched (sched.id)}
                <option value={String(sched.id)}>{sched.subject}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label for="task-desc" class="block text-xs font-semibold text-slate-700 mb-1">
            Catatan / Deskripsi
          </label>
          <textarea
            id="task-desc"
            rows="2"
            bind:value={formDescription}
            placeholder="Detail pengumpulan ETHOL, format file, atau catatan kelompok..."
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="task-deadline" class="block text-xs font-semibold text-slate-700 mb-1">
              Deadline (WIB)
            </label>
            <input
              id="task-deadline"
              type="datetime-local"
              bind:value={formDeadline}
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
            />
          </div>

          <div>
            <label for="task-priority" class="block text-xs font-semibold text-slate-700 mb-1">
              Prioritas
            </label>
            <select
              id="task-priority"
              bind:value={formPriority}
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>

          <div>
            <label for="task-status" class="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              id="task-status"
              bind:value={formStatus}
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#035AB1]"
            >
              <option value="pending">Belum Mulai</option>
              <option value="in_progress">Dikerjakan</option>
              <option value="completed">Selesai</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onclick={() => (showForm = false)}
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSaving}
            class="px-5 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isSaving ? "Menyimpan..." : editingTaskId ? "Simpan Perubahan" : "Simpan Tugas"}
          </button>
        </div>
      </form>
    </section>
  {/if}

  <section class="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 text-slate-800 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h1 class="text-base sm:text-lg font-bold text-slate-900">
          Manajemen Tugas & Deadline
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          Pengingat otomatis aktif pada H-1 dan 3 jam sebelum deadline untuk tugas yang belum selesai.
        </p>
      </div>

      <div class="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        <button
          type="button"
          onclick={() => onTabChange("all")}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer {activeTab === 'all' ? 'bg-white text-[#02389E] shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          Daftar Tugas
        </button>
        <button
          type="button"
          onclick={() => onTabChange("deadlines")}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer {activeTab === 'deadlines' ? 'bg-white text-[#02389E] shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          Deadline Terdekat
        </button>
        <button
          type="button"
          onclick={() => onTabChange("status")}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer {activeTab === 'status' ? 'bg-white text-[#02389E] shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          Per Status
        </button>
      </div>
    </div>

    {#if tasks.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-2.5">
        <h3 class="text-sm font-bold text-slate-800">Belum ada tugas tersimpan</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Klik "Tambah Tugas" di atas atau minta langsung lewat Tanya AI, misalnya: "Ingatkan tugas Workshop Web deadline besok jam 23:59".
        </p>
      </div>
    {:else if activeTab === "status"}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {#each STATUS_COLUMNS as col (col.key)}
          {@const colTasks = tasks.filter((t) => t.status === col.key)}
          <div class="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span class="w-2.5 h-2.5 rounded-full {col.dot}"></span>
                <span>{col.title}</span>
              </div>
              <span class="text-[11px] font-bold text-slate-500">{colTasks.length}</span>
            </div>

            {#if colTasks.length === 0}
              <div class="text-[11px] text-slate-400 italic py-4 text-center">
                Kosong
              </div>
            {:else}
              <div class="space-y-2.5">
                {#each colTasks as task (task.id)}
                  <div class="rounded-xl bg-white border border-slate-200 p-3 space-y-2 shadow-2xs">
                    <div class="text-xs font-bold text-slate-900">{task.title}</div>
                    {#if task.description}
                      <p class="text-[11px] text-slate-600 line-clamp-2">{task.description}</p>
                    {/if}
                    <div class="text-[10px] text-slate-500">
                      {formatDeadlineText(task.deadline)}
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                      <select
                        aria-label="Ubah status tugas"
                        value={task.status}
                        onchange={(e) => {
                          const val = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
                          onUpdateTask(task.id, { status: val });
                        }}
                        class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 cursor-pointer outline-none"
                      >
                        <option value="pending">Belum Mulai</option>
                        <option value="in_progress">Dikerjakan</option>
                        <option value="completed">Selesai</option>
                      </select>

                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onclick={() => openEditForm(task)}
                          class="px-2 py-1 rounded-md text-[10px] font-semibold text-[#02389E] hover:bg-blue-50 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onclick={() => onDeleteTask(task.id)}
                          class="px-2 py-1 rounded-md text-[10px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="space-y-2.5">
        {#each visibleTasks as task (task.id)}
          {@const urgency = getUrgencyBadge(task)}
          <div class="rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs sm:text-sm font-bold {task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}">
                  {task.title}
                </span>

                <span class="px-2 py-0.5 rounded-md border text-[10px] font-semibold {priorityBadge(task.priority)}">
                  {task.priority}
                </span>

                {#if urgency}
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold {urgency.cls}">
                    {urgency.text}
                  </span>
                {/if}

                {#if task.schedule_id && scheduleMap.get(String(task.schedule_id))}
                  <span class="px-2 py-0.5 rounded-md bg-[#EBF0FA] text-[#02389E] text-[10px] font-semibold">
                    {scheduleMap.get(String(task.schedule_id))}
                  </span>
                {/if}
              </div>

              {#if task.description}
                <p class="text-xs text-slate-600">{task.description}</p>
              {/if}

              <div class="text-[11px] text-slate-500">
                Deadline: <span class="font-medium text-slate-700">{formatDeadlineText(task.deadline)}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Ubah status tugas"
                value={task.status}
                onchange={(e) => {
                  const val = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
                  onUpdateTask(task.id, { status: val });
                }}
                class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer outline-none"
              >
                <option value="pending">Belum Mulai</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="completed">Selesai</option>
              </select>

              <button
                type="button"
                onclick={() => openEditForm(task)}
                class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#02389E] cursor-pointer"
              >
                Edit
              </button>

              <button
                type="button"
                onclick={() => onDeleteTask(task.id)}
                class="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
