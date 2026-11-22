<script>
  import AccountCard from "./AccountCard.svelte";

  /**
   * @type {{
   *   user: { name?: string, email?: string },
   *   searchQuery: string,
   *   sessions: Array<{ id: string, title: string, created_at: string }>,
   *   activeSessionId: string | null,
   *   activeSection: 'chat' | 'profile' | 'tasks' | 'materials' | 'subscription',
   *   activeTaskTab?: 'all' | 'deadlines' | 'status',
   *   urgentTasksCount?: number,
   *   materialsCount?: number,
   *   subscriptionTier?: 'free' | 'pro',
   *   onStartNewChat: () => void,
   *   onSelectSession: (sessionId: string) => void,
   *   onDeleteSession?: (sessionId: string) => void,
   *   onOpenTasks?: (tab: 'all' | 'deadlines' | 'status') => void,
   *   onOpenMaterials?: () => void,
   *   onOpenSubscription?: () => void,
   *   todaySchedules?: Array<{ key: string, subject: string, time: string, room?: string, attended: boolean }>,
   *   notificationPermission?: string,
   *   emailStatus?: { emailConfigured: boolean, emailFrom: string } | null,
   *   isTestingNotif?: boolean,
   *   notifTestFeedback?: string,
   *   onEnableBrowserNotif?: () => void,
   *   onMarkAttended?: (scheduleKey: string) => void,
   *   onTestNotif?: () => void,
   *   onOpenProfile: () => void,
   *   onLogout: () => void
   * }}
   */
  let {
    user,
    searchQuery = $bindable(""),
    sessions = [],
    activeSessionId = null,
    activeSection = "chat",
    activeTaskTab = "all",
    urgentTasksCount = 0,
    materialsCount = 0,
    subscriptionTier = 'free',
    onStartNewChat,
    onSelectSession,
    onDeleteSession = () => {},
    onOpenTasks = () => {},
    onOpenMaterials = () => {},
    onOpenSubscription = () => {},
    todaySchedules = [],
    notificationPermission = "default",
    emailStatus = null,
    isTestingNotif = false,
    notifTestFeedback = "",
    onEnableBrowserNotif = () => {},
    onMarkAttended = () => {},
    onTestNotif = () => {},
    onOpenProfile,
    onLogout,
  } = $props();

  const pendingAttendanceCount = $derived(
    todaySchedules.filter((s) => !s.attended).length,
  );

  let cekTugasOpen = $state(true);
  let historyOpen = $state(true);
  let etholOpen = $state(false);
  /** @type {{ id: string, top: number, left: number } | null} */
  let openMenu = $state(null);
  /** @type {HTMLDivElement | null} */
  let menuEl = $state(null);

  /**
   * @param {MouseEvent} e
   * @param {string} sessionId
   */
  function toggleMenu(e, sessionId) {
    e.stopPropagation();
    if (openMenu?.id === sessionId) {
      openMenu = null;
      return;
    }
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    const rect = btn.getBoundingClientRect();
    openMenu = {
      id: sessionId,
      top: rect.bottom + 4,
      left: Math.max(12, rect.right - 128),
    };
  }
</script>

<svelte:window
  onclick={(e) => {
    if (
      openMenu &&
      menuEl &&
      !menuEl.contains(/** @type {Node} */ (e.target))
    ) {
      openMenu = null;
    }
  }}
  onkeydown={(e) => {
    if (e.key === "Escape") openMenu = null;
  }}
/>

<aside
  class="w-[290px] shrink-0 bg-[#EAEFF5] border-r border-[#D4DEEB] flex flex-col justify-between p-4 overflow-y-auto no-scrollbar select-none"
>
  <div class="space-y-3.5">
    <div class="flex items-center gap-2.5 px-1 py-1">
      <div
        class="w-7 h-7 rounded-lg bg-[#FF8500] flex items-center justify-center shadow-sm shrink-0"
      >
        <svg
          class="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <div class="flex items-baseline gap-1.5">
        <span
          class="font-michroma text-sm font-bold tracking-tight text-[#1E293B]"
          >PENS</span
        >
        <span class="text-sm font-medium text-[#FF8500]">Copilot</span>
      </div>
    </div>

    <div class="relative">
      <span
        class="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8C8C8C]"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </span>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search..."
        class="w-full bg-[#DAE2EC] border border-[#CCD7E5] rounded-xl py-2 pl-8 pr-3 text-xs text-[#334155] placeholder-[#8C8C8C] outline-none focus:outline-none focus-visible:outline-none focus:border-[#018FE6] transition-colors"
      />
    </div>

    <div class="space-y-2">
      <span class="text-xs font-bold text-[#475569] px-1 block">Main</span>

      <button
        type="button"
        onclick={onStartNewChat}
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#035AB1] to-[#018FE6] text-white shadow-md shadow-[#018FE6]/20 transition-all cursor-pointer"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-5 h-5 rounded-md bg-[#FF8500] flex items-center justify-center shrink-0"
          >
            <svg
              class="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span class="text-xs font-bold tracking-wide">Tanya AI</span>
        </div>
        <span
          class="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-md"
          >+ Baru</span
        >
      </button>

      <div
        class="bg-[#DAE2EC] border border-[#CCD7E5] rounded-2xl p-2.5 space-y-2 transition-all"
      >
        <button
          type="button"
          onclick={() => (cekTugasOpen = !cekTugasOpen)}
          class="w-full flex items-center justify-between text-xs font-semibold text-[#334155] hover:text-[#0f172a] cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-4 h-4 text-[#475569]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Cek Tugas</span>
          </div>
          <svg
            class="w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 {cekTugasOpen
              ? 'rotate-180'
              : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {#if cekTugasOpen}
          <div class="pl-4 space-y-1 pt-1 text-xs text-[#475569]">
            <button
              type="button"
              onclick={() => onOpenTasks("all")}
              class="w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer {activeSection ===
                'tasks' && activeTaskTab === 'all'
                ? 'bg-white/75 text-[#02389E] font-semibold'
                : 'hover:bg-white/40 hover:text-[#0F172A]'}"
            >
              <svg
                class="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span>Daftar Tugas</span>
            </button>

            <button
              type="button"
              onclick={() => onOpenTasks("deadlines")}
              class="w-full flex items-center justify-between px-2 py-1 rounded-lg transition-colors cursor-pointer {activeSection ===
                'tasks' && activeTaskTab === 'deadlines'
                ? 'bg-white/75 text-[#02389E] font-semibold'
                : 'hover:bg-white/40 hover:text-[#0F172A]'}"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Deadline Tugas</span>
              </div>
              {#if urgentTasksCount > 0}
                <span
                  class="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6A00] text-slate-950 text-[10px] font-bold flex items-center justify-center"
                >
                  {urgentTasksCount}
                </span>
              {/if}
            </button>

            <button
              type="button"
              onclick={() => onOpenTasks("status")}
              class="w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer {activeSection ===
                'tasks' && activeTaskTab === 'status'
                ? 'bg-white/75 text-[#02389E] font-semibold'
                : 'hover:bg-white/40 hover:text-[#0F172A]'}"
            >
              <svg
                class="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Status Tugas</span>
            </button>
          </div>
        {/if}
      </div>

      <button
        type="button"
        onclick={onOpenMaterials}
        class="w-full flex items-center justify-between px-2.5 py-2.5 rounded-2xl border transition-all cursor-pointer {activeSection ===
        'materials'
          ? 'bg-[#02389E] text-white border-[#02389E] shadow-sm'
          : 'bg-[#DAE2EC] hover:bg-[#CFD9E6] text-[#334155] border-[#CCD7E5]'}"
      >
        <div class="flex items-center gap-2 text-xs font-semibold">
          <svg
            class="w-4 h-4 {activeSection === 'materials'
              ? 'text-white'
              : 'text-[#475569]'}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span>Materi Kuliah (RAG)</span>
        </div>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-bold {activeSection ===
          'materials'
            ? 'bg-[#FF6A00] text-slate-950'
            : 'bg-white/80 text-[#02389E]'}"
        >
          {materialsCount}
        </span>
      </button>

      <button
        type="button"
        onclick={onOpenSubscription}
        class="w-full flex items-center justify-between px-2.5 py-2.5 rounded-2xl border transition-all cursor-pointer {activeSection ===
        'subscription'
          ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF8500] text-slate-950 font-bold border-[#FF8500] shadow-md shadow-[#FF8500]/20'
          : 'bg-[#DAE2EC] hover:bg-[#CFD9E6] text-[#334155] border-[#CCD7E5]'}"
      >
        <div class="flex items-center gap-2 text-xs font-semibold">
          <svg
            class="w-4 h-4 {activeSection === 'subscription'
              ? 'text-slate-950'
              : 'text-[#FF8500]'}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span>Langganan Pro</span>
        </div>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-black {activeSection ===
          'subscription'
            ? 'bg-slate-950 text-white'
            : 'bg-[#FF8500] text-slate-950'}"
        >
          {subscriptionTier === 'pro' ? 'AKTIF' : 'Rp 50K'}
        </span>
      </button>

      <div
        class="bg-[#DAE2EC] border border-[#CCD7E5] rounded-2xl p-2.5 space-y-2 transition-all"
      >
        <button
          type="button"
          onclick={() => (historyOpen = !historyOpen)}
          class="w-full flex items-center justify-between text-xs font-semibold text-[#334155] hover:text-[#0f172a] cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-4 h-4 text-[#475569]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Histori Percakapan</span>
          </div>
          <svg
            class="w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 {historyOpen
              ? 'rotate-180'
              : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {#if historyOpen}
          <div class="pt-1">
            <div
              class="space-y-1 text-[11px] text-[#475569] max-h-44 overflow-y-auto no-scrollbar"
            >
              {#if sessions.length > 0}
                {#each sessions as s (s.id)}
                  <div
                    class="group relative flex items-center justify-between gap-1 rounded-lg px-1.5 py-0.5 transition-colors {activeSection ===
                      'chat' && activeSessionId === s.id
                      ? 'bg-[#035AB1]/15 text-[#02389E] font-semibold'
                      : 'hover:text-[#0F172A] hover:bg-white/45'}"
                  >
                    <button
                      type="button"
                      onclick={() => onSelectSession(s.id)}
                      class="flex-1 min-w-0 text-left truncate py-1 cursor-pointer"
                    >
                      {s.title}
                    </button>

                    <button
                      type="button"
                      aria-label="Opsi percakapan"
                      aria-expanded={openMenu?.id === s.id}
                      onclick={(e) => toggleMenu(e, s.id)}
                      class="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-opacity cursor-pointer {openMenu?.id ===
                      s.id
                        ? 'opacity-100 bg-slate-200/70 text-slate-900'
                        : 'opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100'}"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                        />
                      </svg>
                    </button>
                  </div>
                {/each}
              {:else}
                <div class="text-[#8C8C8C] text-[10px] italic px-1">
                  Belum ada percakapan tersimpan
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div
        class="bg-[#DAE2EC] border border-[#CCD7E5] rounded-2xl p-2.5 space-y-2.5"
      >
        <button
          type="button"
          onclick={() => (etholOpen = !etholOpen)}
          class="w-full flex items-center justify-between text-xs font-semibold text-[#334155] hover:text-[#0f172a] cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-4 h-4 text-[#475569]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span>Notifikasi ETHOL</span>
            {#if pendingAttendanceCount > 0}
              <span
                class="px-1.5 py-0.2 rounded-full bg-[#FF6A00] text-slate-950 text-[10px] font-bold"
              >
                {pendingAttendanceCount}
              </span>
            {/if}
          </div>
          <svg
            class="w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 {etholOpen
              ? 'rotate-180'
              : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {#if etholOpen}
          <div class="pt-1 space-y-2.5 text-[11px]">
            <div
              class="flex flex-wrap items-center justify-between gap-1.5 bg-white/60 rounded-xl px-2.5 py-2 border border-white/80"
            >
              <span class="font-medium text-slate-700">
                {#if notificationPermission === "granted"}
                  Notifikasi Web: Aktif
                {:else if notificationPermission === "denied"}
                  Notifikasi Web: Diblokir
                {:else if notificationPermission === "unsupported"}
                  Browser tidak mendukung
                {:else}
                  Notifikasi Web: Nonaktif
                {/if}
              </span>

              {#if notificationPermission === "default"}
                <button
                  type="button"
                  onclick={onEnableBrowserNotif}
                  class="px-2 py-0.5 rounded-lg bg-[#02389E] hover:bg-[#035AB1] text-white text-[10px] font-semibold cursor-pointer"
                >
                  Aktifkan
                </button>
              {/if}
            </div>

            <div class="px-1 text-[10px] text-slate-600 leading-snug">
              {#if emailStatus?.emailConfigured}
                Email pengingat aktif via <span
                  class="font-semibold text-[#02389E]"
                  >{emailStatus.emailFrom}</span
                >
              {:else}
                Email: mode preview terminal server (siap pakai dengan Resend
                API)
              {/if}
            </div>

            {#if todaySchedules.length > 0}
              <div class="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {#each todaySchedules as item (item.key)}
                  <div
                    class="rounded-xl bg-white/80 border border-white p-2 space-y-1"
                  >
                    <div
                      class="font-semibold text-slate-800 truncate"
                      title={item.subject}
                    >
                      {item.subject}
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] text-slate-500">{item.time}</span
                      >
                      {#if item.attended}
                        <span
                          class="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold"
                        >
                          Sudah Presensi
                        </span>
                      {:else}
                        <button
                          type="button"
                          onclick={() => onMarkAttended(item.key)}
                          class="px-2 py-0.5 rounded-md bg-[#02389E] hover:bg-[#035AB1] text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Sudah Presensi
                        </button>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-[10px] text-slate-500 italic px-1">
                Tidak ada jadwal kuliah hari ini.
              </div>
            {/if}

            <button
              type="button"
              disabled={isTestingNotif}
              onclick={onTestNotif}
              class="w-full py-1.5 px-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#EA5E00] text-slate-950 font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-60"
            >
              {isTestingNotif
                ? "Mengirim Uji Coba..."
                : "Uji Notifikasi (Web + Email)"}
            </button>

            {#if notifTestFeedback}
              <div
                class="rounded-lg bg-white/80 border border-slate-200 px-2 py-1.5 text-[10px] text-slate-700 leading-snug"
              >
                {notifTestFeedback}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <AccountCard
    {user}
    isProfileActive={activeSection === "profile"}
    {subscriptionTier}
    {onOpenProfile}
    {onLogout}
  />
</aside>

{#if openMenu}
  <div
    bind:this={menuEl}
    role="menu"
    tabindex="-1"
    style={`top: ${openMenu.top}px; left: ${openMenu.left}px;`}
    class="fixed z-50 w-32 rounded-xl bg-white border border-slate-200 shadow-lg p-1"
  >
    <button
      type="button"
      role="menuitem"
      onclick={(e) => {
        e.stopPropagation();
        const targetId = openMenu?.id;
        openMenu = null;
        if (targetId) onDeleteSession(targetId);
      }}
      class="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
    >
      <svg
        class="w-3.5 h-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      <span>Hapus</span>
    </button>
  </div>
{/if}
