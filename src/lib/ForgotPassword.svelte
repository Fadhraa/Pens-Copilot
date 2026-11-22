<script>
  import AuthLayout from './AuthLayout.svelte';
  import { supabase } from './supabase.js';

  /** @type {{ onNavigate?: (view: string) => void }} */
  let { onNavigate = () => {} } = $props();

  let activeTab = $state('formulir'); // 'formulir' | 'terkirim'
  let email = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let sentEmail = $state('');

  /** @param {SubmitEvent} [e] */
  async function handleSendReset(e) {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      errorMsg = 'Silakan masukkan alamat email yang valid!';
      return;
    }

    errorMsg = '';
    isSubmitting = true;

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    isSubmitting = false;
    if (error) {
      errorMsg = error.message;
      return;
    }

    sentEmail = email;
    activeTab = 'terkirim';
  }

  async function handleResend() {
    if (!sentEmail && !email) return;
    isSubmitting = true;
    await supabase.auth.resetPasswordForEmail(sentEmail || email);
    isSubmitting = false;
  }
</script>

<AuthLayout>
  <!-- Card Container (Matching design.md & HTML) -->
  <div class="w-full max-w-[530px] bg-white rounded-3xl p-7 sm:p-9 md:p-10 card-elevation transition-all duration-300">
    
    <!-- Top Tabs Segment Control -->
    <div class="bg-[#F1F5F9] p-1 rounded-xl flex items-center mb-7 select-none">
      <button
        type="button"
        onclick={() => activeTab = 'formulir'}
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'formulir' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}"
      >
        Formulir
      </button>
      <button
        type="button"
        onclick={() => {
          if (sentEmail) activeTab = 'terkirim';
          else activeTab = 'terkirim';
        }}
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'terkirim' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}"
      >
        Terkirim (Sukses)
      </button>
    </div>

    {#if activeTab === 'formulir'}
      <!-- Heading -->
      <div class="mb-6">
        <h2 class="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
          Lupa Kata Sandi?
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          Masukkan email kamu, kami kirim tautan untuk reset kata sandi.
        </p>
      </div>

      {#if errorMsg}
        <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      {/if}

      <!-- Form -->
      <form onsubmit={handleSendReset} class="space-y-5">
        <div>
          <label for="reset-email" class="block text-xs font-semibold text-slate-700 mb-1.5">
            Email
          </label>
          <div class="relative">
            <input
              id="reset-email"
              type="email"
              bind:value={email}
              required
              placeholder="nama@email.com"
              class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
            />
            <!-- Mail Icon inside right -->
            <span class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 pointer-events-none">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#E65F00] hover:to-[#FF7700] active:scale-[0.99] shadow-md shadow-[#FF8500]/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {#if isSubmitting}
            <svg class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Mengirim...</span>
          {:else}
            <span>Kirim Tautan Reset</span>
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          {/if}
        </button>
      </form>

      <!-- Back to Login Link -->
      <div class="mt-6 text-center">
        <button
          type="button"
          onclick={() => onNavigate('login')}
          class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#02389E] transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Kembali ke Masuk</span>
        </button>
      </div>

    {:else}
      <!-- Terkirim (Sukses) Tab Content -->
      <div class="text-center py-2">
        <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#A7F3D0]/50 border border-[#6EE7B7] flex items-center justify-center text-[#065F46] shadow-sm">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 class="text-xl font-bold text-slate-900 tracking-tight">
          Tautan Terkirim!
        </h3>
        
        <p class="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          Kami telah mengirimkan tautan untuk mereset kata sandi ke:
        </p>
        
        <div class="my-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 inline-block font-medium text-xs text-slate-800">
          {sentEmail || email || 'mahasiswa@email.com'}
        </div>

        <p class="text-[11px] text-slate-400 mb-6">
          Periksa kotak masuk (Inbox) atau folder Spam. Tautan berlaku selama 15 menit.
        </p>

        <div class="space-y-3">
          <button
            type="button"
            onclick={handleResend}
            class="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Belum menerima email? Kirim Ulang
          </button>

          <button
            type="button"
            onclick={() => onNavigate('login')}
            class="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#E65F00] hover:to-[#FF7700] shadow-md shadow-[#FF8500]/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>
      </div>
    {/if}

  </div>
</AuthLayout>
