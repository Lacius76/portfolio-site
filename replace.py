import re

with open('work.html', 'r', encoding='utf-8') as f:
    html = f.read()

HeroStartPattern = r'<!-- === HERO SECTION \(FIXED LAYER 0\) === -->'
HeroEndPattern = r'<!-- End of content-wrapper -->'

# Create the new block
new_block = """<!-- === HERO SECTION (FIXED LAYER 0) === -->
      <div
        class="relative lg:fixed lg:inset-0 min-h-screen lg:min-h-0 z-0 overflow-hidden flex flex-col justify-start bg-background-light dark:bg-background-dark pt-4 lg:pt-16">
        
        <!-- Infinite Vertical Staggered Scroll Background Layer -->
        <!-- Takes over main visual space (right half on desktop, full background on mobile) -->
        <div id="infinite-scroll-container" class="absolute inset-0 lg:left-auto lg:right-0 w-full lg:w-[55%] h-screen z-0 pointer-events-auto">
          <!-- Fade masks for top/bottom -->
          <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background-light dark:from-background-dark to-transparent z-20 pointer-events-none"></div>
          <div class="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent z-20 pointer-events-none"></div>

          <div class="flex w-full h-full gap-6 px-4 py-[10vh] max-w-[800px] mx-auto">
            
            <!-- Column 1 -->
            <div class="flex-1 relative h-full overflow-visible">
              <div id="scroll-col-1" class="flex flex-col gap-6 w-full will-change-transform">
                <!-- 1. eWa Wallet App -->
                <a href="case-study-ewa.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-900 shadow-xl ring-1 ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="index.selectedWorks.ewa.tag">Fintech App</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <video autoplay loop muted playsinline class="w-full h-full object-cover">
                      <source src="img/ewa/ewa-card.webm" type="video/webm" />
                    </video>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="index.selectedWorks.ewa.title">eWa Wallet App</h3>
                    <p class="text-sm text-slate-300" data-i18n="index.selectedWorks.ewa.subtitle">UX/UI Design & Android APK</p>
                  </div>
                </a>

                <!-- 3. Shadow Cartels -->
                <a href="case-study-shadow.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-900 shadow-xl ring-1 ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="work.projectShadowTag">Shadow Cartels App</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <video autoplay loop muted playsinline class="w-full h-full object-cover">
                      <source src="img/shadow-cartels/shadow-card.webm" type="video/webm" />
                    </video>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="work.projectShadowTitle">Tactical Game Web & Mobile</h3>
                    <p class="text-sm text-slate-300" data-i18n="work.projectShadowDesc">UX/UI & Ai • iOS</p>
                  </div>
                </a>

                <!-- 5. Greentube - Bugs'n Bees -->
                <a href="case-study-greent.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="work.projectGreentubeTag">Greentube</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <img src="img/greentube/bugs-promo.jpg" alt="bugs'n-bees" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="work.projectGreentubeTitle">Bugs'n Bees UI</h3>
                    <p class="text-sm text-slate-300" data-i18n="work.projectGreentubeDesc">Slot Game UI & Visual Assets • Greentube</p>
                  </div>
                </a>

                <!-- 7. Funworld - Photoplay -->
                <a href="case-study-funworld.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-900 shadow-xl ring-1 ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="work.projectFunworldTag">Photoplay (2000)</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <img src="img/funworld/potoplay-terminal-2.jpg" alt="Photoplay Arcade" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="work.projectFunworldTitle">Funworld / Photoplay</h3>
                    <p class="text-sm text-slate-300" data-i18n="work.projectFunworldDesc">Touchscreen Ergonomics Pioneer • Funworld AG</p>
                  </div>
                </a>
              </div>
            </div>

            <!-- Column 2 (Staggered offset) -->
            <div class="flex-1 relative h-full overflow-visible mt-16 md:mt-[15vh]">
              <div id="scroll-col-2" class="flex flex-col gap-6 w-full will-change-transform">
                <!-- 2. Anti-Gravity -->
                <a href="case-study-styleguide.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-900 shadow-xl ring-1 ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="index.selectedWorks.antiGravity.tag">Case Study 2026</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <video autoplay loop muted playsinline class="w-full h-full object-cover">
                      <source src="img/style-guide/styleguide.webm" type="video/webm" />
                    </video>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="index.selectedWorks.antiGravity.title">Project Antigravity</h3>
                    <p class="text-sm text-slate-300" data-i18n="index.selectedWorks.antiGravity.subtitle">AI-Collaborative Design System</p>
                  </div>
                </a>

                <!-- 4. Siemens WinCC-OA -->
                <a href="case-study-siemens.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="work.projectWinccTag">WinCC-OA Interface</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <img src="img/siemens/wincc-oa.jpg" alt="wincc-oa project" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="work.projectWinccTitle">WinCC OA Registry</h3>
                    <p class="text-sm text-slate-300 line-clamp-2" data-i18n="work.projectWinccDesc">A complete PLC management system design for WinCC OA.</p>
                  </div>
                </a>

                <!-- 6. Amatic - Pharao -->
                <a href="case-study-amatic.html" class="group block cursor-pointer w-full aspect-[4/3] rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
                  <div class="absolute top-4 left-4 z-20">
                    <span class="inline-block rounded-xl bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow-lg" data-i18n="work.projectAmaticTag">Amatic</span>
                  </div>
                  <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <img src="img/pharao/pharo-promo.jpg" alt="pharao game" class="w-full h-full object-cover" />
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">
                    <h3 class="text-xl font-bold text-white" data-i18n="work.projectAmaticTitle">Pharao's Riches</h3>
                    <p class="text-sm text-slate-300" data-i18n="work.projectAmaticDesc">Cabinet UI & Digital Illustration • Amatic</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <section class="relative w-full h-full pointer-events-none z-10">
          <div class="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div class="w-full lg:w-[45%] flex flex-col items-start gap-6 relative">
              <!-- HERO TITLE BADGE -->
              <div class="hero-anim-badge inline-flex items-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 pointer-events-auto">
                <span class="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                <span data-i18n="work.heroBadge">Open for commissions</span>
              </div>
              <h1 class="text-4xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl pointer-events-auto mix-blend-normal drop-shadow-lg">
                <span data-i18n="work.heroTitle1">
                  <span class="hero-anim-title-1">Crafting </span>
                  <span class="hero-anim-title-1">Intuitive&nbsp;</span>
                </span>
                <span class="hero-anim-title-2 inline-block pb-2 lg:pb-3 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500" data-i18n="work.heroTitle2">Digital</span>
                <span data-i18n="work.heroTitle3">
                  <span class="hero-anim-title-3">&nbsp;Experiences</span>
                </span>
              </h1>
              <p class="hero-anim-subtitle max-w-xl text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed drop-shadow-md pointer-events-auto" data-i18n="work.heroDescription">
                Specialized UI/UX Designer bridging the gap between functional business solutions and high-engagement gaming interfaces.
              </p>
              
              <!-- PORTFOLIO & RESUME BUTTONS -->
              <div class="flex flex-wrap gap-4 pt-4 pointer-events-auto">
                <a href="img/laszlo_foldvary_portfolio.pdf" download class="hero-anim-btn-primary group flex h-14 items-center rounded-xl bg-primary px-10 text-lg font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all">
                  <span data-i18n="work.viewPortfolio">View Portfolio</span>
                </a>
                <a href="img/laszlo_foldvary_cv.pdf" download class="hero-anim-btn-secondary group flex h-14 items-center gap-3 rounded-xl border-2 border-slate-200 bg-white/90 backdrop-blur px-8 text-lg font-bold text-slate-900 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:hover:bg-slate-800 transition-all">
                  <span class="material-symbols-outlined text-[24px] group-hover:animate-bounce">download</span>
                  <span data-i18n="work.downloadResume">Resume</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Floating AI Bot Character (Decoupled and Z-indexed) -->
          <div id="aiBotDragWrapper" class="hero-anim-float-card fixed bottom-4 right-4 sm:bottom-6 sm:right-8 z-[60] flex items-center justify-end pointer-events-auto group mt-4 sm:mt-0 transform scale-75 sm:scale-100 origin-bottom-right">
            <!-- Radar Button -->
            <button id="hgReplayBtn" aria-label="Trigger Wave Scan" title="Run Bot Interaction" class="absolute -left-6 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center shrink-0 border border-primary/30 shadow-lg backdrop-blur-md">
              <span class="material-symbols-outlined text-[24px] sm:text-[28px] transition-transform duration-700">radar</span>
            </button>

            <!-- The Bot Container -->
            <div id="aiBotCard" class="relative bot-body-3d hg-float-anim backdrop-blur-md">
              <div class="bot-header-area group/handle">
                <div class="text-primary opacity-70 group-hover/handle:opacity-100 transition-opacity flex items-center justify-center shrink-0 w-8 h-8">
                  <span class="material-symbols-outlined text-[24px]">drag_indicator</span>
                </div>
                <span class="bot-title-text text-xs sm:text-sm tracking-[0.2em] uppercase select-none" data-i18n="bot.title">AI BOTT</span>
                <button class="bot-close-btn bot-btn-3d w-8 h-8 flex items-center justify-center shrink-0" aria-label="Close Bot">
                  <span class="material-symbols-outlined text-[18px] font-bold">close</span>
                </button>
              </div>
              <div class="bot-screen-container">
                <div class="bot-screen-inset flex flex-col items-center justify-center gap-6">
                  <div id="botEyesContainer" class="flex justify-between items-center w-24 h-8 relative z-10">
                    <div class="w-7 h-7 rounded-[10px] bot-eyes-glow bot-eye"></div>
                    <div id="botRightEye" class="w-7 h-7 rounded-[10px] bot-eyes-glow bot-eye transition-all duration-300"></div>
                  </div>
                  <div class="flex gap-1.5 items-end h-3 z-10">
                    <div class="w-2.5 h-2.5 bot-mouth-el"></div>
                    <div id="botMouthMiddle" class="w-10 h-2.5 bot-mouth-el transition-transform duration-300"></div>
                    <div class="w-2.5 h-2.5 bot-mouth-el"></div>
                  </div>
                </div>
              </div>
              <div class="bot-separator-line"></div>
              <div class="bot-bottom-area">
                <div class="bot-console-inset flex-1 px-3 py-2">
                  <div class="h-full overflow-y-auto pr-1">
                    <span id="botConsole" class="bot-console-text text-[11px] sm:text-xs font-mono leading-[0.8]">System online. Waiting for input...</span>
                    <span class="bot-cursor w-1.5 h-3 bg-[#28A530] shadow-[0_0_5px_rgba(40,165,48,0.8)] inline-block ml-0.5 align-middle"></span>
                  </div>
                </div>
                <button id="botTalkBtn" class="bot-btn-3d w-10 h-10 shrink-0" aria-label="Open Chat">
                  <span class="material-symbols-outlined text-[20px]">chat</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- SCROLLING CONTENT WRAPPER FOR BRIDGE ONLY (projects moved above) -->
      <div id="content-wrapper" class="relative z-10 mt-[100vh] bg-gray-100 dark:bg-[#0d141f] shadow-[0_-10px_2px_#f1f2f4] dark:shadow-[0_-10px_2px_#0d141f]">
        <section class="border-t border-slate-200 py-20 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
              <span class="material-symbols-outlined text-3xl">handshake</span>
            </div>
            <h2 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6 uppercase" data-i18n="work.bridgeTitle">Let's Bridge the Gap together</h2>
            <p class="mx-auto max-w-2xl text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed" data-i18n="work.bridgeDesc">From complex <span class="text-primary font-bold">Industrial HMI dashboards</span> to immersive <span class="text-primary font-bold">Game Interfaces</span>. I bring 20+ years of systematic thinking to your next digital product.</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="contact.html" class="flex h-14 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-white shadow-xl shadow-primary/20 transition-transform hover:-translate-y-1 hover:bg-primary/90">
                <span data-i18n="work.startCollaboration">Start a Collaboration</span>
              </a>
              <a href="mailto:foeldvary@gmail.com" class="flex h-14 min-w-[200px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 text-base font-bold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-colors">
                foeldvary@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
      <!-- End of content-wrapper -->"""

import re
# Regex replacement safely capturing block
pattern = re.compile(HeroStartPattern + r".*?" + HeroEndPattern, re.DOTALL)
new_html = pattern.sub(new_block, html)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Replacement complete.")
