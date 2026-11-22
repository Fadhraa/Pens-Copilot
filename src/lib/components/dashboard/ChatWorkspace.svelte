<script>
  import { renderMarkdown } from "../../ai.js";
  import PromptBar from "./PromptBar.svelte";
  import ChatRichCard from "./ChatRichCard.svelte";

  /**
   * @type {{
   *   messages: Array<{ id: string | number, dbId?: string, sender: 'user' | 'assistant', text: string, card?: Record<string, any> | null, blocks?: Array<Record<string, any>> }>,
   *   promptText: string,
   *   selectedModel: string,
   *   isSending: boolean,
   *   elapsedSeconds: number,
   *   chatError: string,
   *   materialsCount: number,
   *   subscriptionTier?: 'free' | 'pro',
   *   isSessionRagLocked?: boolean,
   *   ragUsageCount?: number,
   *   deletingMessageId?: string | number | null,
   *   onSend: (e?: SubmitEvent) => void,
   *   onOpenMaterials?: () => void,
   *   onOpenScheduleManager?: () => void,
   *   onOpenProfile?: () => void,
   *   onOpenTasks?: () => void,
   *   onStartNewChat?: () => void,
   *   onOpenSubscription?: () => void,
   *   onConfirmDeleteSchedule?: (messageId: string | number, item: Record<string, any>) => void,
   *   onCancelDeleteSchedule?: (messageId: string | number) => void,
   *   onConfirmDeleteTask?: (messageId: string | number, item: Record<string, any>) => void,
   *   onCancelDeleteTask?: (messageId: string | number) => void
   * }}
   */
  let {
    messages = [],
    promptText = $bindable(""),
    selectedModel = $bindable("gemini-3.6-flash"),
    isSending = false,
    elapsedSeconds = 0,
    chatError = "",
    materialsCount = 0,
    subscriptionTier = 'free',
    isSessionRagLocked = false,
    ragUsageCount = 0,
    deletingMessageId = null,
    onSend,
    onOpenMaterials = () => {},
    onOpenScheduleManager = () => {},
    onOpenProfile = () => {},
    onOpenTasks = () => {},
    onStartNewChat = () => {},
    onOpenSubscription = () => {},
    onConfirmDeleteSchedule = () => {},
    onCancelDeleteSchedule = () => {},
    onConfirmDeleteTask = () => {},
    onCancelDeleteTask = () => {},
  } = $props();
</script>

<div class="z-10 flex items-center justify-between gap-3 select-none">
  <div
    class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white shadow-lg border border-slate-200"
  >
    <div
      class="w-4 h-4 rounded bg-[#FF8500] flex items-center justify-center shadow-xs"
    >
      <svg
        class="w-2.5 h-2.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>
    <select
      bind:value={selectedModel}
      disabled={isSending}
      aria-label="Pilih model AI Gemini"
      class="bg-transparent text-xs font-semibold text-slate-700 tracking-wide outline-none focus:outline-none focus-visible:outline-none cursor-pointer pr-1 disabled:opacity-70"
    >
      <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
      <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Cepat)</option>
    </select>
  </div>

  <div class="flex items-center gap-2">
    {#if subscriptionTier === 'free'}
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 text-xs text-slate-700 shadow-sm border border-slate-200">
        <span class="text-slate-500">RAG Hari Ini:</span>
        <span class="font-bold {ragUsageCount >= 10 ? 'text-amber-700' : 'text-[#02389E]'}">
          {ragUsageCount} / 10
        </span>
      </div>
    {/if}

    <button
      type="button"
      onclick={onOpenMaterials}
      class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-xs font-semibold text-[#02389E] shadow-lg border border-slate-200 transition-all cursor-pointer"
    >
      <span>+ Materi Kuliah (RAG)</span>
      {#if materialsCount > 0}
        <span class="px-1.5 py-0.5 rounded-md bg-[#FF6A00] text-slate-950 text-[10px] font-bold">
          {materialsCount}
        </span>
      {/if}
    </button>
  </div>
</div>

{#if messages.length === 0}
  <div
    class="flex-1 flex flex-col items-center justify-center -mt-10 space-y-6 z-10 max-w-3xl mx-auto w-full select-none"
  >
    <div class="relative flex items-center justify-center">
      <div
        class="w-16 h-16 rounded-full bg-[#FF8500]/25 blur-md absolute"
      ></div>

      <svg
        class="w-14 h-14 relative drop-shadow-lg"
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle cx="32" cy="18" r="9" fill="#FF8500" />
        <circle cx="46" cy="32" r="9" fill="#FF8500" />
        <circle cx="32" cy="46" r="9" fill="#FF8500" />
        <circle cx="18" cy="32" r="9" fill="#FF8500" />
        <circle cx="42" cy="22" r="9" fill="#FF8500" />
        <circle cx="42" cy="42" r="9" fill="#FF8500" />
        <circle cx="22" cy="42" r="9" fill="#FF8500" />
        <circle cx="22" cy="22" r="9" fill="#FF8500" />
        <circle cx="32" cy="32" r="10" fill="#FFC789" />
        <circle cx="32" cy="32" r="6" fill="#FFFFFF" />
      </svg>
    </div>

    <h1
      class="font-michroma text-xl sm:text-2xl md:text-[26px] font-bold text-center tracking-tight text-white drop-shadow-md"
    >
      Selamat Datang, <span class="text-[#FF8500]">Mahasiswa PENS</span> Let's
      Start!
    </h1>

    {#if isSessionRagLocked}
      <div class="w-full max-w-2xl px-2 py-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-md text-amber-950 space-y-2.5 text-center">
        <div class="flex items-center justify-center gap-2 font-bold text-xs sm:text-sm">
          <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Batas Harian Percakapan RAG Tercapai (10/10)</span>
        </div>
        <p class="text-xs text-amber-800 leading-relaxed px-4">
          Sesi ini terhubung dengan materi kuliah dan terkunci untuk akun Free hingga kuota direset besok hari. Anda tetap dapat melanjutkan tanya jawab umum tanpa materi kuliah di sesi baru.
        </p>
        <div class="flex items-center justify-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onclick={onStartNewChat}
            class="px-3.5 py-1.5 rounded-xl bg-[#02389E] hover:bg-[#035AB1] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            + Mulai Chat Biasa Baru
          </button>
          <button
            type="button"
            onclick={onOpenSubscription}
            class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#EA5E00] hover:to-[#FF6A00] text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            ⚡ Upgrade Pro (Rp 50K)
          </button>
        </div>
      </div>
    {:else}
      <PromptBar
        bind:value={promptText}
        disabled={isSending}
        placeholder="Tanya PENS untuk menyusun, mengingat, atau apa saja . . ."
        maxWidthClass="max-w-2xl px-2"
        onSubmit={onSend}
      />
    {/if}
  </div>

  <div class="h-6"></div>
{:else}
  <div class="flex-1 overflow-y-auto no-scrollbar my-4 z-10 max-w-3xl mx-auto w-full space-y-3">
    {#each messages as m (m.id)}
      {#if m.sender === "user"}
        <div class="flex justify-end">
          <div class="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md bg-[#FF6A00] text-slate-950 font-medium">
            {m.text}
          </div>
        </div>
      {:else if m.text || m.card || (Array.isArray(m.blocks) && m.blocks.length > 0)}
        {@const blocksToRender =
          Array.isArray(m.blocks) && m.blocks.length > 0
            ? m.blocks
            : [
                ...(m.text ? [{ type: "markdown", content: m.text }] : []),
                ...(m.card ? [m.card] : []),
              ]}
        {@const hasRichBlock = blocksToRender.some((b) => b.type !== "markdown")}
        <div class="flex justify-start">
          <div class="{hasRichBlock ? 'w-full max-w-[94%] sm:max-w-[88%]' : 'max-w-[85%]'} px-4 py-3 rounded-2xl rounded-bl-sm text-xs sm:text-sm leading-relaxed shadow-md bg-white text-slate-800 space-y-3">
            {#each blocksToRender as block, bIdx (`${m.id}-b-${bIdx}-${block.type}`)}
              {#if block.type === "markdown"}
                {#if block.content}
                  <div>{@html renderMarkdown(block.content)}</div>
                {/if}
              {:else}
                <ChatRichCard
                  card={block}
                  messageId={m.id}
                  isDeletingId={deletingMessageId}
                  {onOpenScheduleManager}
                  {onOpenProfile}
                  {onOpenTasks}
                  {onConfirmDeleteSchedule}
                  {onCancelDeleteSchedule}
                  {onConfirmDeleteTask}
                  {onCancelDeleteTask}
                />
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {/each}

    {#if isSending && (!messages.length || (!messages[messages.length - 1]?.text && !messages[messages.length - 1]?.card && !(messages[messages.length - 1]?.blocks?.length)))}
      <div class="flex justify-start">
        <div class="bg-white/95 text-slate-700 px-4 py-2.5 rounded-2xl rounded-bl-sm text-xs shadow-md space-y-0.5">
          <div class="font-medium">
            PENS Copilot sedang mengetik... ({elapsedSeconds}d)
          </div>
          {#if elapsedSeconds >= 8 && selectedModel === "gemini-3.6-flash"}
            <div class="text-[11px] text-slate-500">
              (Menunggu antrean model Gemini 3.6 Flash di server Google...)
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if chatError}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs">
        {chatError}
      </div>
    {/if}
  </div>

  <div class="z-10 pt-2 w-full flex justify-center">
    {#if isSessionRagLocked}
      <div class="w-full max-w-3xl bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-md text-amber-950 space-y-2.5">
        <div class="flex items-center gap-2 font-bold text-xs sm:text-sm">
          <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Batas Harian Percakapan RAG Tercapai (10/10)</span>
        </div>
        <p class="text-xs text-amber-800 leading-relaxed">
          Sesi percakapan ini telah terhubung dengan rujukan materi kuliah dan terkunci untuk pengguna Free Tier hingga kuota direset besok hari. Anda tetap dapat melanjutkan percakapan umum tanpa rujukan materi di sesi baru.
        </p>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onclick={onStartNewChat}
            class="px-3.5 py-1.5 bg-[#02389E] hover:bg-[#035AB1] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+ Mulai Chat Biasa Baru</span>
          </button>
          <button
            type="button"
            onclick={onOpenSubscription}
            class="px-3.5 py-1.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#EA5E00] hover:to-[#FF6A00] text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡ Lihat Paket Pro (Rp 50K/bln)</span>
          </button>
        </div>
      </div>
    {:else}
      <PromptBar
        bind:value={promptText}
        disabled={isSending}
        placeholder="Ketik pertanyaan lanjutan atau tanya/kelola jadwal & materi..."
        maxWidthClass="max-w-3xl"
        onSubmit={onSend}
      />
    {/if}
  </div>
{/if}
