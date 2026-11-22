<script>
  /**
   * @type {{
   *   value: string,
   *   disabled?: boolean,
   *   placeholder?: string,
   *   maxWidthClass?: string,
   *   onSubmit: (e?: SubmitEvent) => void
   * }}
   */
  let {
    value = $bindable(""),
    disabled = false,
    placeholder = "Tanya PENS untuk menyusun, mengingat, atau apa saja . . .",
    maxWidthClass = "max-w-2xl px-2",
    onSubmit,
  } = $props();
</script>

<form onsubmit={onSubmit} class="w-full {maxWidthClass}">
  <div
    class="bg-white rounded-full py-1.5 pl-6 pr-2 shadow-2xl flex items-center border border-white/40 transition-all"
  >
    <input
      type="text"
      bind:value
      {disabled}
      {placeholder}
      class="flex-1 bg-transparent border-none text-xs sm:text-sm text-[#334155] placeholder-[#8C8C8C] outline-none focus:outline-none focus-visible:outline-none pr-3"
    />
    <button
      type="submit"
      {disabled}
      class="w-9 h-9 rounded-full bg-[#035AB1] hover:bg-[#018FE6] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#035AB1]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
      title="Kirim Prompt"
    >
      <svg
        class="w-4 h-4 transform rotate-45 -ml-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
        />
      </svg>
    </button>
  </div>
</form>
