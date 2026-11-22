<script>
  import { renderMarkdown } from "../../ai.js";

  /**
   * @type {{
   *   card: Record<string, any>,
   *   messageId: string | number,
   *   isDeletingId?: string | number | null,
   *   onOpenScheduleManager?: () => void,
   *   onOpenProfile?: () => void,
   *   onOpenTasks?: () => void,
   *   onConfirmDeleteSchedule?: (messageId: string | number, item: Record<string, any>) => void,
   *   onCancelDeleteSchedule?: (messageId: string | number) => void,
   *   onConfirmDeleteTask?: (messageId: string | number, item: Record<string, any>) => void,
   *   onCancelDeleteTask?: (messageId: string | number) => void
   * }}
   */
  let {
    card,
    messageId,
    isDeletingId = null,
    onOpenScheduleManager = () => {},
    onOpenProfile = () => {},
    onOpenTasks = () => {},
    onConfirmDeleteSchedule = () => {},
    onCancelDeleteSchedule = () => {},
    onConfirmDeleteTask = () => {},
    onCancelDeleteTask = () => {},
  } = $props();

  const isDeletingThis = $derived(isDeletingId === messageId);

  /** @param {string} status */
  function taskStatusBadge(status) {
    if (status === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "in_progress") return "bg-blue-100 text-[#02389E] border-blue-200";
    return "bg-amber-100 text-amber-900 border-amber-200";
  }

  /** @param {string} status */
  function taskStatusLabel(status) {
    if (status === "completed") return "Selesai";
    if (status === "in_progress") return "Dikerjakan";
    return "Belum Mulai";
  }

  /** @param {string | null | undefined} iso */
  function formatDeadline(iso) {
    if (!iso) return "Belum ditentukan";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d)} WIB`;
  }

  let copiedCode = $state(false);

  /** @param {string} codeText */
  async function handleCopyCode(codeText) {
    if (!codeText || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(codeText);
      copiedCode = true;
      setTimeout(() => {
        copiedCode = false;
      }, 2000);
    } catch {
      // Clipboard write may be restricted in non-HTTPS embedded contexts
    }
  }
</script>

{#if card?.type === "list_card"}
  <div class="rounded-2xl border border-[#035AB1]/20 bg-[#F4F8FF] p-3.5 sm:p-4 space-y-3">
    <div class="space-y-0.5 border-b border-blue-200/70 pb-2.5">
      <div class="text-xs sm:text-sm font-bold text-[#02389E]">
        {card.title || "Ringkasan Poin"}
      </div>
      {#if card.subtitle}
        <div class="text-[11px] text-slate-600">{card.subtitle}</div>
      {/if}
    </div>

    <ul class="space-y-2">
      {#each card.items || [] as item, idx (`${idx}-${String(item).slice(0, 12)}`)}
        <li class="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
          {#if card.style === "numbered"}
            <span class="mt-0.5 w-5 h-5 rounded-full bg-[#02389E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
          {:else}
            <span class="mt-1.5 w-2 h-2 rounded-full bg-[#FF6A00] shrink-0" aria-hidden="true"></span>
          {/if}
          <div class="min-w-0 flex-1">{@html renderMarkdown(String(item || ""))}</div>
        </li>
      {/each}
    </ul>
  </div>
{:else if card?.type === "code"}
  <div class="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100 shadow-sm">
    <div class="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-950/75 border-b border-slate-800">
      <div class="flex items-center gap-2 min-w-0">
        <span class="px-2 py-0.5 rounded bg-slate-800 text-[#FF8500] text-[10px] font-bold uppercase tracking-wider shrink-0">
          {card.language || "code"}
        </span>
        {#if card.title}
          <span class="text-[11px] font-medium text-slate-300 truncate">
            {card.title}
          </span>
        {/if}
      </div>

      <button
        type="button"
        onclick={() => handleCopyCode(String(card.code || ""))}
        class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-100 transition-colors cursor-pointer shrink-0"
      >
        {copiedCode ? "Tersalin!" : "Salin"}
      </button>
    </div>

    <pre class="p-3.5 text-xs overflow-x-auto font-mono leading-relaxed text-slate-100"><code>{card.code || ""}</code></pre>
  </div>
{:else if card?.type === "callout"}
  <div class="rounded-2xl border p-3.5 space-y-1.5 {card.variant === 'warning'
      ? 'border-amber-200 bg-amber-50/80 text-amber-950'
      : card.variant === 'info'
        ? 'border-slate-200 bg-slate-50 text-slate-800'
        : 'border-blue-200/80 bg-[#EBF0FA]/90 text-[#02389E]'}">
    <div class="text-[11px] font-bold uppercase tracking-wide">
      {card.title || (card.variant === "warning" ? "Perhatian" : card.variant === "info" ? "Informasi" : "Catatan Belajar")}
    </div>
    <div class="text-xs leading-relaxed">
      {@html renderMarkdown(String(card.content || ""))}
    </div>
  </div>
{:else if card?.type === "schedule_list"}
  <div class="rounded-2xl border border-slate-200 bg-[#F4F7FC] p-3.5 sm:p-4 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-[#02389E] text-white flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <span class="text-xs sm:text-sm font-bold text-slate-900">
          {card.title || "Jadwal Kuliah"}
        </span>
      </div>

      <button
        type="button"
        onclick={onOpenScheduleManager}
        class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-semibold text-[#02389E] transition-colors cursor-pointer"
      >
        Kelola Jadwal
      </button>
    </div>

    {#if Array.isArray(card.items) && card.items.length > 0}
      <div class="space-y-2">
        {#each card.items as item, idx (`${item.id || idx}-${item.subject}`)}
          <div class="rounded-xl bg-white border border-slate-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="space-y-0.5 min-w-0">
              <div class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {item.subject}
              </div>
              <div class="text-[11px] text-slate-600 truncate">
                Dosen: {item.lecturer || "-"}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 shrink-0">
              <span class="px-2 py-0.5 rounded-md bg-[#EBF0FA] text-[#02389E] text-[11px] font-bold">
                {item.day} · {item.time}
              </span>
              {#if item.room}
                <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  {item.room}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl bg-white border border-dashed border-slate-300 p-4 text-center space-y-2">
        <p class="text-xs text-slate-600">
          Tidak ada jadwal kuliah untuk kategori ini.
        </p>
        <button
          type="button"
          onclick={onOpenScheduleManager}
          class="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-[11px] font-bold cursor-pointer"
        >
          Tambah / Unggah Jadwal KRS
        </button>
      </div>
    {/if}
  </div>
{:else if card?.type === "task_list"}
  <div class="rounded-2xl border border-slate-200 bg-[#F4F7FC] p-3.5 sm:p-4 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-[#FF6A00] text-slate-950 flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </span>
        <span class="text-xs sm:text-sm font-bold text-slate-900">
          {card.title || "Daftar Tugas & Deadline"}
        </span>
      </div>

      <button
        type="button"
        onclick={onOpenTasks}
        class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-semibold text-[#02389E] transition-colors cursor-pointer"
      >
        Kelola Tugas
      </button>
    </div>

    {#if Array.isArray(card.items) && card.items.length > 0}
      <div class="space-y-2">
        {#each card.items as task, idx (`${task.id || idx}-${task.title}`)}
          <div class="rounded-xl bg-white border border-slate-200/90 p-3 flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {task.title}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Deadline: {formatDeadline(task.deadline)} · Prioritas: {task.priority || "medium"}
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-md border text-[11px] font-semibold {taskStatusBadge(task.status)}">
              {taskStatusLabel(task.status)}
            </span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl bg-white border border-dashed border-slate-300 p-4 text-center space-y-2">
        <div class="text-xs text-slate-600">
          Belum ada tugas yang tersimpan di akun Anda saat ini.
        </div>
        <button
          type="button"
          onclick={onOpenTasks}
          class="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 text-[11px] font-bold cursor-pointer"
        >
          Tambah Tugas di Halaman Tugas
        </button>
      </div>
    {/if}
  </div>
{:else if card?.type === "summary"}
  <div class="rounded-2xl border border-[#035AB1]/20 bg-[#F4F8FF] p-3.5 sm:p-4 space-y-3">
    <div class="space-y-0.5 border-b border-blue-200/70 pb-2.5">
      <div class="text-xs sm:text-sm font-bold text-[#02389E]">
        {card.title || "Ringkasan Materi"}
      </div>
      {#if card.subtitle}
        <div class="text-[11px] text-slate-600">{card.subtitle}</div>
      {/if}
    </div>

    <ul class="space-y-1.5">
      {#each card.points || [] as point, idx (`${idx}-${point.slice(0, 12)}`)}
        <li class="flex items-start gap-2 text-xs text-slate-800 leading-relaxed">
          <span class="mt-1.5 w-2 h-2 rounded-full bg-[#FF6A00] shrink-0" aria-hidden="true"></span>
          <div class="min-w-0 flex-1">{@html renderMarkdown(point)}</div>
        </li>
      {/each}
    </ul>

    {#if card.tip}
      <div class="rounded-xl bg-white border border-blue-200/80 px-3 py-2 text-[11px] text-[#02389E] font-medium">
        Catatan Belajar: {card.tip}
      </div>
    {/if}
  </div>
{:else if card?.type === "schedule_action"}
  <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          ✓
        </span>
        <span class="text-xs sm:text-sm font-bold text-emerald-950">
          {card.title || "Jadwal Diperbarui"}
        </span>
      </div>

      <button
        type="button"
        onclick={onOpenProfile}
        class="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-900 transition-colors cursor-pointer"
      >
        Lihat di Profil
      </button>
    </div>

    {#if card.item}
      <div class="rounded-xl bg-white border border-emerald-200/80 p-3 space-y-1">
        <div class="text-xs sm:text-sm font-bold text-slate-900">
          {card.item.subject}
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span class="font-semibold text-[#02389E]">
            {card.item.day} · {card.item.time}
          </span>
          {#if card.item.lecturer}
            <span>Dosen: {card.item.lecturer}</span>
          {/if}
          {#if card.item.room}
            <span>Ruang: {card.item.room}</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{:else if card?.type === "task_action"}
  <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          ✓
        </span>
        <span class="text-xs sm:text-sm font-bold text-emerald-950">
          {card.title || "Tugas Diperbarui"}
        </span>
      </div>

      <button
        type="button"
        onclick={onOpenTasks}
        class="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-900 transition-colors cursor-pointer"
      >
        Lihat Halaman Tugas
      </button>
    </div>

    {#if card.item}
      <div class="rounded-xl bg-white border border-emerald-200/80 p-3 flex flex-wrap items-center justify-between gap-2">
        <div class="space-y-0.5 min-w-0">
          <div class="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {card.item.title}
          </div>
          <div class="text-[11px] text-slate-600">
            Deadline: {formatDeadline(card.item.deadline)} · Prioritas: {card.item.priority || "medium"}
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-md border text-[11px] font-semibold {taskStatusBadge(card.item.status)}">
          {taskStatusLabel(card.item.status)}
        </span>
      </div>
    {/if}
  </div>
{:else if card?.type === "schedule_delete_confirm"}
  <div class="rounded-2xl border p-3.5 sm:p-4 space-y-3 {card.status === 'deleted' || card.status === 'cancelled'
      ? 'border-slate-200 bg-slate-50'
      : 'border-rose-200 bg-rose-50/70'}">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs sm:text-sm font-bold {card.status === 'pending' ? 'text-rose-900' : 'text-slate-800'}">
        {card.title || "Konfirmasi Hapus Jadwal"}
      </span>

      {#if card.status === "deleted"}
        <span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
          Terhapus
        </span>
      {:else if card.status === "cancelled"}
        <span class="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold">
          Dibatalkan
        </span>
      {/if}
    </div>

    {#if card.item}
      <div class="rounded-xl bg-white border border-slate-200 p-3 space-y-1">
        <div class="text-xs sm:text-sm font-bold text-slate-900">
          {card.item.subject}
        </div>
        <div class="text-[11px] text-slate-600">
          {card.item.day} · {card.item.time}
          {#if card.item.room} · {card.item.room}{/if}
        </div>
      </div>
    {/if}

    {#if card.status === "pending"}
      <div class="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          disabled={isDeletingThis}
          onclick={() => onConfirmDeleteSchedule(messageId, card.item)}
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {isDeletingThis ? "Menghapus..." : "Ya, Hapus Jadwal"}
        </button>
        <button
          type="button"
          disabled={isDeletingThis}
          onclick={() => onCancelDeleteSchedule(messageId)}
          class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    {/if}
  </div>
{:else if card?.type === "task_delete_confirm"}
  <div class="rounded-2xl border p-3.5 sm:p-4 space-y-3 {card.status === 'deleted' || card.status === 'cancelled'
      ? 'border-slate-200 bg-slate-50'
      : 'border-rose-200 bg-rose-50/70'}">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs sm:text-sm font-bold {card.status === 'pending' ? 'text-rose-900' : 'text-slate-800'}">
        {card.title || "Konfirmasi Hapus Tugas"}
      </span>

      {#if card.status === "deleted"}
        <span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
          Terhapus
        </span>
      {:else if card.status === "cancelled"}
        <span class="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold">
          Dibatalkan
        </span>
      {/if}
    </div>

    {#if card.item}
      <div class="rounded-xl bg-white border border-slate-200 p-3 space-y-1">
        <div class="text-xs sm:text-sm font-bold text-slate-900">
          {card.item.title}
        </div>
        <div class="text-[11px] text-slate-600">
          Deadline: {formatDeadline(card.item.deadline)} · {taskStatusLabel(card.item.status)}
        </div>
      </div>
    {/if}

    {#if card.status === "pending"}
      <div class="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          disabled={isDeletingThis}
          onclick={() => onConfirmDeleteTask(messageId, card.item)}
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {isDeletingThis ? "Menghapus..." : "Ya, Hapus Tugas"}
        </button>
        <button
          type="button"
          disabled={isDeletingThis}
          onclick={() => onCancelDeleteTask(messageId)}
          class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    {/if}
  </div>
{/if}
