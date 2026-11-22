<script>
  import AuthLayout from './AuthLayout.svelte';
  import { supabase } from './supabase.js';

  /** @type {{ onNext?: (data: Record<string, any>) => void, onNavigate?: (view: string) => void, initialData?: Record<string, any> }} */
  let { onNext = () => {}, onNavigate = () => {}, initialData = {} } = $props();

  let name = $state('Fadhra Dzaki');
  let nrp = $state('3124600001');
  let prodi = $state('D4 Teknik Informatika');
  let email = $state('fadhradzaki.s@gmail.com');
  let password = $state('password123');
  let confirmPassword = $state('password123');
  let agreeTerms = $state(true);
  
  let showPassword = $state(false);
  let showConfirm = $state(false);
  let errorMsg = $state('');
  let isSubmitting = $state(false);

  const studyPrograms = [
    'D4 Teknik Informatika',
    'D3 Teknik Informatika',
    'D4 Sains Data Terapan',
    'D4 Teknik Komputer',
    'D3 Teknik Komputer',
    'D4 Teknik Mekatronika',
    'D3 Teknik Mekatronika',
    'D4 Teknik Elektronika',
    'D3 Teknik Elektronika',
    'D4 Teknik Telekomunikasi',
    'D3 Teknik Telekomunikasi',
    'D4 Teknologi Rekayasa Multimedia',
    'D4 Sistem Pembangkit Energi',
    'D4 Teknologi Rekayasa Internet'
  ];

  $effect(() => {
    if (initialData.name) name = initialData.name;
    if (initialData.nrp) nrp = initialData.nrp;
    if (initialData.prodi) prodi = initialData.prodi;
    if (initialData.email) email = initialData.email;
    if (initialData.password) {
      password = initialData.password;
      confirmPassword = initialData.password;
    }
  });

  /** @param {SubmitEvent} e */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreeTerms) {
      errorMsg = 'Harap setujui syarat & ketentuan PENS Copilot untuk melanjutkan.';
      return;
    }
    if (password.length < 8) {
      errorMsg = 'Kata sandi minimal 8 karakter!';
      return;
    }
    if (password !== confirmPassword) {
      errorMsg = 'Kata sandi dan konfirmasi sandi tidak cocok!';
      return;
    }

    errorMsg = '';
    isSubmitting = true;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          nrp,
          prodi
        }
      }
    });

    if (error) {
      isSubmitting = false;
      errorMsg = error.message;
      return;
    }

    isSubmitting = false;
    onNext({ id: data?.user?.id, name, nrp, prodi, email, password });
  }
</script>

<AuthLayout>
  <!-- Card Container (Matching design.md & HTML) -->
  <div class="w-full max-w-[530px] bg-white rounded-3xl p-7 sm:p-9 md:p-10 card-elevation transition-all duration-300">
    
    <div class="mb-4">
      <button
        type="button"
        onclick={() => onNavigate('landing')}
        class="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-slate-600 hover:text-[#02389E] transition-colors cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Kembali ke Beranda</span>
      </button>
    </div>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
        Buat Akun
      </h2>
      <p class="text-slate-500 text-sm mt-1">
        Daftar dan mulai kerjAIn tugasmu.
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
    <form onsubmit={handleSubmit} class="space-y-4">
      
      <!-- Field 1: Nama Lengkap -->
      <div>
        <label for="reg-name" class="block text-xs font-semibold text-slate-700 mb-1.5">
          Nama lengkap
        </label>
        <input
          id="reg-name"
          type="text"
          bind:value={name}
          required
          placeholder="Nama sesuai KRS"
          class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 px-3.5 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
        />
      </div>

      <!-- Field 2: NRP & Program Studi (2 Kolom) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label for="reg-nrp" class="block text-xs font-semibold text-slate-700 mb-1.5">
            NRP
          </label>
          <input
            id="reg-nrp"
            type="text"
            bind:value={nrp}
            required
            placeholder="Contoh: 3124600001"
            class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 px-3.5 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
          />
        </div>

        <div>
          <label for="reg-prodi" class="block text-xs font-semibold text-slate-700 mb-1.5">
            Program studi
          </label>
          <div class="relative">
            <select
              id="reg-prodi"
              bind:value={prodi}
              required
              class="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl py-2 pl-3.5 pr-8 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all cursor-pointer"
            >
              <option value="" disabled>Pilih Program Studi</option>
              {#each studyPrograms as sp}
                <option value={sp}>{sp}</option>
              {/each}
            </select>
            <!-- Chevron Down Icon -->
            <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 pointer-events-none">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <!-- Field 3: Email (Bebas email biasa sesuai preferensi user) -->
      <div>
        <label for="reg-email" class="block text-xs font-semibold text-slate-700 mb-1.5">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          bind:value={email}
          required
          placeholder="nama@email.com"
          class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 px-3.5 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
        />
      </div>

      <!-- Field 4: Kata Sandi & Konfirmasi (2 Kolom) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label for="reg-password" class="block text-xs font-semibold text-slate-700 mb-1.5">
            Kata sandi
          </label>
          <div class="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              required
              placeholder="Min. 8 karakter"
              class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 pl-3.5 pr-9 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {#if showPassword}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <div>
          <label for="reg-confirm" class="block text-xs font-semibold text-slate-700 mb-1.5">
            Konfirmasi
          </label>
          <div class="relative">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              bind:value={confirmPassword}
              required
              placeholder="Ulangi kata sandi"
              class="w-full bg-white border border-[#E2E8F0] rounded-xl py-2 pl-3.5 pr-9 text-sm text-slate-900 placeholder-[#94A3B8] focus:outline-none focus:border-[#FF8500] focus:ring-2 focus:ring-[#FF8500]/15 transition-all"
            />
            <button
              type="button"
              onclick={() => showConfirm = !showConfirm}
              class="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {#if showConfirm}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Checkbox Syarat & Ketentuan -->
      <div class="pt-1">
        <label class="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
          <input
            type="checkbox"
            bind:checked={agreeTerms}
            class="w-4 h-4 rounded border-[#CBD5E1] text-[#FF6A00] focus:ring-[#FF8500] cursor-pointer"
          />
          <span class="text-xs">
            Saya setuju dengan syarat & ketentuan PENS Copilot.
          </span>
        </label>
      </div>

      <!-- Tombol Daftar -->
      <div class="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:from-[#E65F00] hover:to-[#FF7700] active:scale-[0.99] shadow-md shadow-[#FF8500]/30 transition-all text-sm cursor-pointer disabled:opacity-70"
        >
          {isSubmitting ? 'Mendaftarkan...' : 'Daftar'}
        </button>
      </div>

      <!-- Footer: Sudah punya akun? Masuk -->
      <div class="text-center pt-2">
        <span class="text-xs text-slate-500">Sudah punya akun? </span>
        <button
          type="button"
          onclick={() => onNavigate('login')}
          class="text-xs font-semibold text-[#02389E] hover:underline cursor-pointer"
        >
          Masuk
        </button>
      </div>

    </form>

  </div>
</AuthLayout>
