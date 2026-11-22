<script>
  /**
   * @type {{
   *   user: { name?: string, email?: string },
   *   isProfileActive?: boolean,
   *   subscriptionTier?: 'free' | 'pro',
   *   onOpenProfile?: () => void,
   *   onLogout?: () => void
   * }}
   */
  let {
    user = { name: "Mahasiswa PENS", email: "mahasiswa@gmail.com" },
    isProfileActive = false,
    subscriptionTier = 'free',
    onOpenProfile = () => {},
    onLogout = () => {},
  } = $props();
</script>

<div class="pt-3">
  <div class="flex items-center justify-between px-1 mb-2">
    <span class="text-xs font-bold text-[#475569]">Account</span>
    <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md {subscriptionTier === 'pro' ? 'bg-[#FF8500] text-slate-950 shadow-xs' : 'bg-slate-300 text-slate-700'}">
      {subscriptionTier === 'pro' ? 'PRO ⚡' : 'FREE'}
    </span>
  </div>

  <div
    class="bg-[#035AB1] rounded-2xl p-3 shadow-lg border border-[#02389E] space-y-2.5"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-xl bg-red-600 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm"
      >
        <svg
          class="w-7 h-7 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>
      <div class="truncate">
        <div class="text-xs font-bold text-white tracking-wide truncate">
          {user.name || "Mahasiswa PENS"}
        </div>
        <div class="text-[10px] text-blue-100 truncate">
          {user.email || "mahasiswa@gmail.com"}
        </div>
      </div>
    </div>

    <div class="space-y-1.5 pt-0.5">
      <button
        type="button"
        onclick={onOpenProfile}
        class="w-full py-1.5 px-3 font-semibold text-xs rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 {isProfileActive
          ? 'bg-white text-[#02389E] shadow-sm'
          : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'}"
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>Profil</span>
      </button>

      <button
        type="button"
        onclick={onLogout}
        class="w-full py-1.5 px-3 bg-[#FF6A00] hover:bg-[#FF8500] text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-[#FF6A00]/30 transition-all text-center cursor-pointer active:scale-98"
      >
        Log Out
      </button>
    </div>
  </div>
</div>
