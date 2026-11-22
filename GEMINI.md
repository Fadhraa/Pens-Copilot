# Project Guidelines & Agent Rules

## Anti-Slop (Rules for AI Coding Agents)
Proyek ini mengadopsi dan mewajibkan penggunaan **anti-slop** (`https://github.com/miqdadbadjuber/anti-slop.git`).
File skill terpasang di dalam proyek pada direktori:
- `.agents/skills/antislop/` (Core filter, always on)
- `.agents/skills/antislop-ui/` (UI and visual guidelines)
- `.agents/skills/antislop-copywriting/` (Copy and text hygiene)
- `.agents/skills/antislop-human/` (Accessibility, contrast, focus, states)
- `.agents/skills/antislop-layoutmobile/` (Responsive layout, tap targets, viewport adaptation)
- `.agents/skills/antislop-code/` (Code comment hygiene)

### Prinsip Utama Anti-Slop:
1. **Filter, Not a Style Guide**: Anti-slop menghapus pola generik AI (slop), placeholder buatan yang tidak masuk akal, dan komentar kode yang tidak perlu.
2. **Direction Comes From Design Guidelines**: Arahan visual, komponen, dan warna resmi mengacu pada [agent/design.md](agent/design.md).
3. **No Slop**:
   - Jangan gunakan statistik palsu / angka fiktif yang bombastis.
   - Jangan tambahkan komentar kode yang hanya mengulangi nama fungsi / baris kode.
   - Gunakan salinan teks (*copywriting*) yang jujur, lugas, dan sesuai konteks mahasiswa PENS.
   - Pastikan aksesibilitas, kontras warna yang ramah pengguna, dan interaksi form yang jelas.
