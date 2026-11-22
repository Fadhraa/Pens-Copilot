<script>
  /** @type {{ children?: import('svelte').Snippet }} */
  let { children } = $props();
  let logoError = $state(false);
</script>

<div
  class="min-h-screen w-full flex flex-col lg:flex-row bg-[#EBF0FA] font-sans antialiased text-slate-800 selection:bg-[#FF6A00] selection:text-white"
>
  <section
    class="relative lg:w-[48%] min-h-[460px] lg:min-h-screen bg-gradient-to-br from-[#02389E] via-[#035AB1] to-[#018FE6] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden select-none"
  >
    <div
      aria-hidden="true"
      class="absolute inset-0 blueprint-grid pointer-events-none opacity-90"
    ></div>

    <div class="relative z-10 flex items-center">
      <div class="h-9 sm:h-10 flex items-center">
        {#if !logoError}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNkLA4FHppDIX-jwlJtNWY4m-CMCun8khuzo5XYapjIdZ6ojrTk7N8iWVWUa4h7wxu4Ssg1KVXfiYAInHnnIdXHiJ5SBdRGD1q9RZNkn_v2TjbvqU0eeMTkZBFgm0gkybHzgqcX6y-hrbaTtB1KFZ9sZ_FWswcJLjsBsq4vaQd_Vlv1rXE17rXhiziuqEj4Dg7LuX-bqThradVbtFRaXLRjqpy4EE5MrTljcWiQMA6Sqg1S4Y8Zwbl"
            alt="PENS Copilot"
            class="h-9 w-auto object-contain drop-shadow-sm"
            onerror={() => (logoError = true)}
          />
        {:else}
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-xl bg-[#FF8500] shadow-md flex items-center justify-center shrink-0"
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
            <div class="flex items-baseline gap-1.5 select-none">
              <span
                class="font-michroma text-base font-bold tracking-tight text-[#001046]"
                >PENS</span
              >
              <span class="text-base font-semibold text-[#FF8500]">Copilot</span
              >
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Center Hero Copy -->
    <div class="relative z-10 my-auto py-10 lg:py-0 max-w-lg">
      <h2
        class="text-white font-semibold text-lg sm:text-xl tracking-normal mb-1"
      >
        Tugas Susah Bukan Halangan!
      </h2>

      <h1
        class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-5"
      >
        kerj<span class="text-[#FF6A00]">AI</span>n aja
      </h1>

      <p
        class="text-blue-100 text-sm sm:text-base leading-relaxed max-w-md font-normal opacity-95"
      >
        Tanya, susun, dan ingatkan tugas kuliahmu bersama asisten AI khusus
        mahasiswa PENS.
      </p>
    </div>
  </section>

  <!-- ================= RIGHT FORM PANEL (52%) ================= -->
  <section
    class="lg:w-[52%] flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-[#EBF0FA]"
  >
    {@render children?.()}
  </section>
</div>
