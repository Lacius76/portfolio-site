import re

with open("case-study-ewa.html", "r") as f:
    content = f.read()

# 1. Increment z-indexes for panels 2 through 7
for i in range(7, 1, -1):
    old_str = f'style="z-index: {i};"'
    new_str = f'style="z-index: {i+1};"'
    content = content.replace(old_str, new_str)

# 2. Insert Panel 1.5 before Panel 2
new_panel = """      <!-- ===== PANEL 1.5: PROJECT OVERVIEW ===== -->
      <div class="stack-panel bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-3xl border-t border-slate-200/50 dark:border-white/10" style="z-index: 2;">
        <section class="max-w-[1200px] mx-auto px-6 py-24 min-h-[70vh] flex items-center justify-center">
          <div class="w-full grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            <!-- Left Column -->
            <div class="space-y-10">
              <div class="space-y-6">
                <p class="text-sm font-medium text-slate-500 dark:text-slate-400">/ Project Overview</p>
                <p class="text-lg md:text-xl lg:text-2xl text-slate-700 dark:text-slate-300 font-light leading-relaxed">
                  The 2026 'Designer as Builder' paradigm shifts focus <strong class="font-bold text-slate-900 dark:text-white">from static screens to building functional logic.</strong> After planning the environment with Notebook LM and Google Stitch, I utilized Google AntiGravity &mdash; Google's AI-agent-based IDE &mdash; and Flutter to transform UI mockups into <strong class="font-bold text-slate-900 dark:text-white">fully functional, deployable applications.</strong>
                </p>
              </div>

              <!-- Pills -->
              <div class="flex flex-wrap gap-3">
                <span class="px-5 py-2 rounded-full border border-slate-300 dark:border-white/20 text-sm italic text-slate-600 dark:text-slate-300">concept</span>
                <span class="px-5 py-2 rounded-full border border-slate-300 dark:border-white/20 text-sm italic text-slate-600 dark:text-slate-300">branding</span>
                <span class="px-5 py-2 rounded-full border border-slate-300 dark:border-white/20 text-sm italic text-slate-600 dark:text-slate-300">motion</span>
                <span class="px-5 py-2 rounded-full border border-slate-300 dark:border-white/20 text-sm italic text-slate-600 dark:text-slate-300">UI Design</span>
                <span class="px-5 py-2 rounded-full border border-slate-300 dark:border-white/20 text-sm italic text-slate-600 dark:text-slate-300">development</span>
                <span class="px-6 py-2 rounded-full bg-[#5c54f9] text-white border border-[#5c54f9] text-lg font-bold italic shadow-lg shadow-[#5c54f9]/30">working product</span>
              </div>

              <!-- Role -->
              <div class="pt-2">
                <h4 class="text-xl md:text-2xl font-black italic text-[#c026d3] dark:text-[#e879f9] tracking-tight">Solo designer and developer</h4>
                <p class="text-sm italic font-medium text-sky-600 dark:text-sky-400 tracking-wide mt-1">UX/UI Design &amp; Android APK</p>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-12">
              <h3 class="text-xl md:text-2xl font-medium text-slate-800 dark:text-white">
                electronic / Wallet / app = <span class="font-bold">eWa</span>
              </h3>
              
              <div class="grid grid-cols-3 gap-y-6 gap-x-4 border-t border-slate-300 dark:border-white/10 pt-6">
                <!-- Industry -->
                <div class="col-span-1 text-slate-600 dark:text-slate-400 font-medium">Industry</div>
                <div class="col-span-2 space-y-2 text-slate-800 dark:text-slate-200 font-medium">
                  <p>Electronic Wallet</p>
                  <p>Mobile Tickets</p>
                  <p>Smart Parking</p>
                  <p>e-vignettes</p>
                </div>

                <div class="col-span-3 border-t border-slate-300 dark:border-white/10"></div>

                <!-- Year -->
                <div class="col-span-1 text-slate-600 dark:text-slate-400 font-medium">Year</div>
                <div class="col-span-2 text-slate-800 dark:text-slate-200 font-medium">2026</div>

                <div class="col-span-3 border-t border-slate-300 dark:border-white/10"></div>

                <!-- Timeline -->
                <div class="col-span-1 text-slate-600 dark:text-slate-400 font-medium">Timeline</div>
                <div class="col-span-2 text-slate-800 dark:text-slate-200 font-medium">2 weeks</div>
              </div>
            </div>

          </div>
        </section>
      </div>
      <!-- END PANEL 1.5 -->

"""

panel_2_marker = "      <!-- ===== PANEL 2: EXECUTIVE SUMMARY ===== -->"
content = content.replace(panel_2_marker, new_panel + panel_2_marker)

with open("case-study-ewa.html", "w") as f:
    f.write(content)

print("Success")
