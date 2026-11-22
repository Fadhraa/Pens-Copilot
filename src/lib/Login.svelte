<script>
  import AuthLayout from "./AuthLayout.svelte";
  import { supabase } from "./supabase.js";

  /** @type {{ onNavigate?: (view: string) => void, onLogin?: (data: Record<string, any>) => void }} */
  let { onNavigate = () => {}, onLogin = () => {} } = $props();

  let email = $state("");
  let password = $state("");
  let rememberMe = $state(false);
  let showPassword = $state(false);
  let errorMsg = $state("");
  let isSubmitting = $state(false);

  /** @param {SubmitEvent} [e] */
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!email || !password) {
      errorMsg = "Silakan isi email dan kata sandi Anda!";
      return;
    }
    errorMsg = "";
    isSubmitting = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      isSubmitting = false;
      errorMsg = error.message;
      return;
    }

    let profile = null;
    if (data?.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, nrp, prodi, email")
        .eq("id", data.user.id)
        .maybeSingle();
      profile = profileData;
    }

    isSubmitting = false;
    onLogin({
      id: data?.user?.id,
      email: profile?.email || email,
      name:
        profile?.full_name ||
        data?.user?.user_metadata?.full_name ||
        email.split("@")[0],
      nrp: profile?.nrp || data?.user?.user_metadata?.nrp || "",
      prodi: profile?.prodi || data?.user?.user_metadata?.prodi || "",
    });
  }

  function handleDemoLogin() {
    email = "fadhradzaki.s@gmail.com";
    password = "password123";
    onLogin({
      name: "Fadhra Dzaki",
      email: "fadhradzaki.s@gmail.com",
      nrp: "3124600001",
      prodi: "D4 Teknik Informatika",
    });
  }
</script>

<AuthLayout>
  <!-- Card Container (Matching design.md & HTML) -->
  <div
    class="w-full max-w-[530px] bg-white rounded-3xl p-7 sm:p-9 md:p-10 card-elevation transition-all duration-300"
  >
    <div class="mb-4">
      <button
        type="button"
        onclick={() => onNavigate("landing")}
        class="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-slate-600 hover:text-[#02389E] transition-colors cursor-pointer"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>Kembali ke Beranda</span>
      </button>
    </div>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
        Masuk ke Akun
      </h2>
      <p class="text-slate-500 text-sm mt-1">
        Masuk dan mulai kerjAIn tugasmu.
      </p>
    </div>

    {#if errorMsg}
      <div
        class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 shrink-0"
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
        <span>{errorMsg}</span>
      </div>
    {/if}

    <!-- Form -->
    <form onsubmit={handleSubmit} class="space-y-4">
      <!-- Field 1: Email -->
      <div>
        <label
          for="login-email"
          class="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Email
        </label>
        <div class="relative">
          <input
            id="login-email"
            type="email"
            bind:value={email}
            required
            placeholder="nama@email.com"
            class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 px-3.5 pr-10 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
          />
          <span
            class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </span>
        </div>
      </div>

      <!-- Field 2: Kata Sandi with Lupa Sandi Link -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label
            for="login-password"
            class="block text-xs font-semibold text-slate-700"
          >
            Kata sandi
          </label>
          <button
            type="button"
            onclick={() => onNavigate("forgot-password")}
            class="text-xs font-semibold text-[#FF6A00] hover:text-[#E65F00] transition-colors cursor-pointer"
          >
            Lupa kata sandi?
          </button>
        </div>

        <div class="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            required
            placeholder="Min. 8 karakter"
            class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 pl-3.5 pr-10 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {#if showPassword}
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            {:else}
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <!-- Checkbox: Ingat Saya -->
      <div class="pt-1">
        <label
          class="flex items-center gap-2 cursor-pointer text-slate-600 select-none"
        >
          <input
            type="checkbox"
            bind:checked={rememberMe}
            class="w-4 h-4 rounded border-[#CBD5E1] text-[#FF6A00] focus:ring-[#FF8500] cursor-pointer"
          />
          <span class="text-xs"> Ingat saya di perangkat ini </span>
        </label>
      </div>

      <!-- Tombol Masuk -->
      <div class="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#E65F00] hover:to-[#FF7700] active:scale-[0.99] shadow-md shadow-[#FF8500]/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
        >
          {#if isSubmitting}
            <svg
              class="w-4 h-4 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span>Memproses...</span>
          {:else}
            <span>Masuk</span>
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          {/if}
        </button>
      </div>

      <!-- Demo 1-Click Login Option -->
      <div class="pt-1">
        <button
          type="button"
          onclick={handleDemoLogin}
          class="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Masuk Cepat sebagai Mahasiswa Demo</span>
        </button>
      </div>

      <!-- Footer: Belum punya akun? Daftar -->
      <div class="text-center pt-2">
        <span class="text-xs text-slate-500">Belum punya akun? </span>
        <button
          type="button"
          onclick={() => onNavigate("register")}
          class="text-xs font-semibold text-[#02389E] hover:underline cursor-pointer"
        >
          Daftar
        </button>
      </div>
    </form>
  </div>
</AuthLayout>
