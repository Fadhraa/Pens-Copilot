<script>
  /**
   * @type {{
   *   alerts: Array<{
   *     id: string,
   *     kind?: 'schedule' | 'task',
   *     scheduleKey?: string,
   *     taskId?: string,
   *     subject: string,
   *     time: string,
   *     room?: string,
   *     stageShortLabel: string,
   *     stageLabel: string,
   *     message: string,
   *     emailNote?: string,
   *     isTest?: boolean
   *   }>,
   *   onMarkAttended: (scheduleKey: string) => void,
   *   onMarkTaskCompleted?: (taskId: string, alertId: string) => void,
   *   onDismiss: (alertId: string) => void
   * }}
   */
  let {
    alerts = [],
    onMarkAttended,
    onMarkTaskCompleted = () => {},
    onDismiss,
  } = $props();
</script>

{#if alerts.length > 0}
  <div
    aria-live="polite"
    class="fixed top-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm space-y-2.5 pointer-events-none"
  >
    {#each alerts as alert (alert.id)}
      <div class="pointer-events-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 text-slate-800 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-md bg-[#FF6A00] text-slate-950 text-[10px] font-bold uppercase tracking-wide">
              {alert.stageShortLabel}
            </span>
            <span class="text-[11px] font-semibold text-[#02389E]">
              {alert.time || "-"}
            </span>
          </div>

          <button
            type="button"
            aria-label="Tutup notifikasi"
            onclick={() => onDismiss(alert.id)}
            class="text-slate-400 hover:text-slate-700 text-xs p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-1">
          <div class="text-xs sm:text-sm font-bold text-slate-900">
            {alert.subject}
          </div>
          {#if alert.room}
            <div class="text-[11px] font-medium text-slate-500">
              Ruang / Link: {alert.room}
            </div>
          {/if}
          <p class="text-xs text-slate-700 leading-relaxed">
            {alert.message}
          </p>
        </div>

        {#if alert.emailNote}
          <div class="rounded-xl bg-[#EBF0FA] border border-blue-200/70 px-2.5 py-1.5 text-[11px] text-[#02389E] font-medium">
            {alert.emailNote}
          </div>
        {/if}

        <div class="flex flex-wrap items-center gap-2 pt-0.5">
          {#if !alert.isTest && alert.kind === "task" && alert.taskId}
            <button
              type="button"
              onclick={() => onMarkTaskCompleted(String(alert.taskId), alert.id)}
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tandai Selesai
            </button>
          {:else if !alert.isTest && alert.scheduleKey}
            <button
              type="button"
              onclick={() => onMarkAttended(String(alert.scheduleKey))}
              class="px-3 py-1.5 rounded-xl bg-[#02389E] hover:bg-[#035AB1] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Sudah Presensi
            </button>
          {/if}
          <a
            href="https://ethol.pens.ac.id"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            Buka ETHOL
          </a>
        </div>
      </div>
    {/each}
  </div>
{/if}
