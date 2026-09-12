/**
 * AI Bot Drag & Drop Script + Brain
 * Makes the AI Bot panel freely draggable across the page.
 * Also handles all logic: eye tracking, skin switching, typing, and random messages.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Translation helper for dynamic texts
    function tBot(keyStr, fallback) {
        try {
            const lang = localStorage.getItem('preferred-language') || 'en';
            if (typeof translations !== 'undefined' && translations[lang]) {
                const keys = keyStr.split('.');
                let val = translations[lang];
                for (let k of keys) {
                    if (val && typeof val === 'object' && k in val) val = val[k];
                    else return fallback;
                }
                if (typeof val === 'string') return val;
            }
        } catch(e) {}
        return fallback;
    }

    // --- CENTRALIZED BOT INJECTION ---
    const botHTML = `
    <div id="aiBotDragWrapper"
      class="hero-anim-float-card fixed bottom-4 right-4 sm:bottom-6 sm:right-8 z-[150] pointer-events-auto group mt-4 sm:mt-0 transform scale-75 sm:scale-100 origin-bottom-right">

      <!-- Float layer: bot + chat move together -->
      <div class="bot-float-inner hg-float-anim">

      <!-- Conversation slot: width animates leftward; panel stays full-size inside (Chrome-safe) -->
      <div id="botChatSlot" class="bot-chat-slot" aria-hidden="true">
        <aside id="botChatPanel" class="bot-chat-panel">
          <button type="button" id="botChatCollapse" class="bot-chat-collapse" aria-label="Close conversation" title="Close conversation">
            <span class="material-symbols-outlined text-[14px]">close</span>
          </button>
          <div class="bot-chat-panel-main">
            <div class="bot-console-inset px-3 py-2 relative">
              <div class="bot-console-scroll">
                <span id="botConsole" class="bot-console-text text-[11px] font-mono">System online. Hello!</span>
                <span class="bot-cursor w-1.5 h-3 bg-[#28A530] shadow-[0_0_5px_rgba(40,165,48,0.8)] inline-block ml-0.5 align-middle"></span>
              </div>
              <div id="botActionBtns" class="absolute hidden flex gap-2 text-[10px] font-mono items-center" style="bottom: 4px; left: 0; right: 0; justify-content: flex-start; padding-left: 12px; padding-top: 2px; padding-bottom: 2px; z-index: 10;">
                <button id="botBtnYes" data-i18n="bot.contactYes">[ YES ]</button>
                <button id="botBtnNo" data-i18n="bot.contactNo">[ NO ]</button>
              </div>
            </div>
            <div class="bot-chat-compose">
              <input id="botChatInput" class="bot-chat-input" type="text" maxlength="500" autocomplete="off" spellcheck="false" data-i18n-placeholder="bot.chatPlaceholder" placeholder="Ask me" aria-label="Ask me" />
              <button id="botTalkBtn" type="button" class="bot-chat-send js-bot-talk-btn bot-tooltip-container bot-tooltip-left-align" aria-label="Send">
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'wght' 200;">subdirectory_arrow_left</span>
                <span class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl" data-i18n="bot.tooltipTalk">Talk to me</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div id="aiBotCard" class="relative bot-body-3d backdrop-blur-md opacity-100 transition-all duration-500">

        <!-- Skin Dropdown -->
        <div id="botSkinMenu" class="bot-skin-menu">
          <button id="skinHal" class="active-skin">◉ AI-Bot 9000</button>
          <button id="skinClassic">◎ Classic</button>
          <button id="skinFirst">▣ Original</button>
          <hr class="bot-menu-divider">
          <button id="skinContact">✉ Contact</button>
        </div>

        <!-- TOOLBAR / Drag Area -->
        <div class="bot-header-area group/handle">
          <div class="bot-header-field">
            <button id="botSkinToggle" class="bot-btn-3d bot-tooltip-container z-10 relative" aria-label="Change Skin">
              <span class="material-symbols-outlined text-[16px]">menu</span>
              <span class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl" data-i18n="bot.tooltipSkin">Choose Skin</span>
            </button>
            
            <div class="bot-toolbar-spacer"></div>
            
            <!-- Default / Classic / Original Skin Title (Hidden in HAL mode) -->
            <div class="bot-title-text bot-tooltip-container bot-tooltip-drag items-center justify-center">
                <span data-i18n="bot.title">AI BOT</span>
                <span class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl" data-i18n="bot.tooltipDrag">Drag Me!</span>
            </div>

            <!-- HAL 9000 Name Banner (Visible in HAL mode) -->
            <div class="bot-name-banner-small bot-tooltip-container bot-tooltip-drag absolute inset-0 flex items-center justify-center z-0" style="font-family: 'Inter', sans-serif; font-weight: 900; font-size: 13px; letter-spacing: -0.02em; user-select: none; pointer-events: auto;">
                <span class="name-part text-black flex-1 text-right" style="padding-right: 5px;">AI BOT</span>
                <span class="number-part text-white flex-1 text-left" style="padding-left: 5px;">9000</span>
                <span class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl" data-i18n="bot.tooltipDrag">Drag Me!</span>
            </div>

            <div class="bot-toolbar-spacer"></div>
            
            <button class="bot-close-btn bot-btn-3d bot-tooltip-container z-10 relative" aria-label="Close Bot">
              <span class="material-symbols-outlined text-[16px]">close</span>
              <span class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide shadow-xl" data-i18n="bot.tooltipClose">Close Bot</span>
            </button>
          </div>
        </div>

        <!-- HAL Eye Area -->
        <div class="bot-eye-area">
          <div id="halEyeRing" class="hal-eye-ring">
            <div class="hal-inner-ring">
              <div class="hal-eye-lens">
                <div class="hal-eye-iris">
                  <div id="halPupil" class="hal-pupil"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="bot-screen-inset" style="display:none;"></div>
        </div>

        <!-- OLD CLASSIC FACE CONTAINER (hidden in HAL) -->
        <div id="classicFaceArea" class="classic-face-container">
            <div class="bot-screen-inset-classic">
                <div id="botEyesContainer" class="flex justify-center gap-6 mb-4">
                    <div class="bot-eye bot-eyes-glow" style="width:28px;height:28px;"></div>
                    <div id="botRightEye" class="bot-eye bot-eyes-glow" style="width:28px;height:28px;"></div>
                </div>
                <div class="flex justify-center gap-1.5 items-center">
                    <div class="bot-mouth-el" style="width:10px;height:10px;border-radius:50%"></div>
                    <div id="botMouthMiddle" class="bot-mouth-el" style="width:40px;height:10px;"></div>
                    <div class="bot-mouth-el" style="width:10px;height:10px;border-radius:50%"></div>
                </div>
            </div>
        </div>

        <!-- Divider -->
        <div class="bot-separator-line"></div>

        <!-- Closed-state controls: Ask me + speaker grill -->
        <div class="bot-bottom-area">
          <button type="button" id="botAskMeBtn" class="bot-ask-me-btn" data-i18n="bot.chatPlaceholder" aria-expanded="false" aria-controls="botChatPanel">Ask me</button>
          <div class="bot-speaker-grill" aria-hidden="true"></div>
        </div>

      </div><!-- end aiBotCard -->
      </div><!-- end bot-float-inner -->
    </div><!-- end aiBotDragWrapper -->

    <!-- AI Bot Contact Modal -->
    <div id="botContactModal" class="fixed inset-0 hidden flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300" style="z-index: 99999;">
        <div class="relative p-8 transition-transform duration-300 transform scale-95 bot-modal-card" style="width: 400px; max-width: 90vw;" id="botContactModalBox">
            
            <!-- Modal Content Wrapper (for z-index over the shine ::after) -->
            <div class="relative z-10">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-[#111418] dark:text-white font-black text-xl tracking-tight" data-i18n="bot.modalTitle">Project Inquiry</h3>
                    <button id="botContactClose" class="text-gray-500 hover:text-[#6366f1] transition-colors">
                        <span class="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <!-- Form -->
                <form id="botContactForm" name="contact" method="POST" data-netlify="true" class="flex flex-col gap-4">
                    <input type="hidden" name="form-name" value="contact" />
                    <input type="hidden" name="booking_slot_id" id="botBookingSlotId" value="" />
                    <input type="hidden" name="booking_start" id="botBookingStart" value="" />
                    <input type="hidden" name="booking_end" id="botBookingEnd" value="" />
                    <input type="hidden" name="booking_tz" id="botBookingTz" value="Europe/Budapest" />
                    <p id="botBookingSlotStatus" class="hidden text-xs leading-relaxed text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2"></p>
                    
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest" data-i18n="contact.name">NAME</label>
                        <input type="text" name="name" required class="w-full text-sm h-12 px-4 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 text-[#111418] dark:text-white rounded-xl outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all">
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest" data-i18n="contact.email">EMAIL</label>
                        <input type="email" name="email" required class="w-full text-sm h-12 px-4 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 text-[#111418] dark:text-white rounded-xl outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all">
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest" data-i18n="bot.modalMessage">MESSAGE</label>
                        <textarea name="message" id="botContactMsg" rows="7" required class="w-full text-sm py-3 px-4 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 text-[#111418] dark:text-white rounded-xl outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all resize-y"></textarea>
                    </div>

                    <button type="submit" id="botContactSubmit" class="mt-4 w-full h-12 btn-sweep-primary flex items-center justify-center gap-2 rounded-xl text-base font-bold shadow-xl shadow-[#6366f1]/20 transition-transform hover:-translate-y-1">
                        <span id="botContactBtnText" data-i18n="bot.modalSend">SEND MESSAGE</span>
                        <span class="material-symbols-outlined text-[16px] hidden animate-spin" id="botContactLoading">sync</span>
                    </button>
                </form>

                <!-- Success Message -->
                <div id="botContactSuccess" class="hidden flex-col h-full" style="min-height: 480px;">
                    
                    <div class="flex-1 flex flex-col items-center justify-center text-center">
                        <div style="transform: scale(3.5); margin: 2rem 0; display: flex; justify-content: center; align-items: center; height: 60px;">
                            <div class="checkbox-wrapper-12">
                              <div class="cbx">
                                <input checked="" type="checkbox" id="cbx-12">
                                <label for="cbx-12"></label>
                                <svg fill="none" viewBox="0 0 15 14" height="14" width="15">
                                  <path d="M2 8.36364L6.23077 12L13 2"></path>
                                </svg>
                              </div>
                              
                              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" class="filter-svg">
                                <defs>
                                  <filter id="goo-12">
                                    <feGaussianBlur result="blur" stdDeviation="4" in="SourceGraphic"></feGaussianBlur>
                                    <feColorMatrix result="goo-12" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -7" mode="matrix" in="blur"></feColorMatrix>
                                    <feBlend in2="goo-12" in="SourceGraphic"></feBlend>
                                  </filter>
                                </defs>
                              </svg>
                            </div>
                        </div>

                        <p class="text-xl font-bold text-[#111418] dark:text-white mt-4" data-i18n="bot.modalSuccess">Message sent successfully!</p>
                    </div>

                    <button id="botContactSuccessClose" class="mt-auto w-full h-12 btn-sweep-primary flex items-center justify-center gap-2 rounded-xl text-base font-bold tracking-wide shadow-xl shadow-[#6366f1]/20 transition-transform hover:-translate-y-1" data-i18n="bot.modalSuccessClose">CLOSE</button>
                </div>
            </div>
        </div>
    </div>`;

    const injectionPoint = document.getElementById('ai-bot-injection-point');
    if (injectionPoint) {
        injectionPoint.innerHTML = botHTML;
        
        // Move modal to body to guarantee fixed position covers viewport regardless of scroll
        const contactModal = document.getElementById('botContactModal');
        if (contactModal) document.body.appendChild(contactModal);
    }


    const wrapper = document.getElementById('aiBotDragWrapper');
    if (!wrapper) return;

    // The bot's initial visibility is now properly handled by closeBot() below
    // rather than hiding the wrapper abruptly on load.

    const botCard = document.getElementById('aiBotCard');
    if (!botCard) return;

    // The header area is the drag handle
    const dragHandle = botCard.querySelector('.bot-header-area');
    if (!dragHandle) return;

    // --- Drag handle cursor ---
    dragHandle.style.cursor = 'grab';
    dragHandle.style.userSelect = 'none';
    dragHandle.style.touchAction = 'none';

    let isDragging = false;
    let isInitialized = false;
    let isChatPanelOpen = false;
    let offsetX = 0;
    let offsetY = 0;

    // --- Eye tracking ---
    const eyes = botCard.querySelectorAll('.bot-eye');
    const mouths = botCard.querySelectorAll('.bot-mouth-el');
    const maxEyeMove = 20;
    const maxMouthMoveDown = 8; // Gátolja meg, hogy a száj túllógjon a képernyő alsó szélén
    const halPupil = document.getElementById('halPupil');
    const halEyeRing = document.getElementById('halEyeRing');
    const maxPupilMove = 20;

    function setEyePosition(moveX, moveY) {
        // Normal eyes
        const nx = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveX));
        const ny = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveY));
        eyes.forEach(eye => {
            eye.style.transform = `translate(${nx}px, ${ny}px)`;
        });

        // Száj szinkronizált mozgása (felfelé követi a szemet teljes mértékben, lefelé viszont megáll a határon)
        const my = Math.max(-maxEyeMove, Math.min(maxMouthMoveDown, moveY));
        mouths.forEach(mouth => {
            mouth.style.transform = `translate(${nx}px, ${my}px)`;
        });

        // HAL pupil
        if (halPupil) {
            const hx = Math.max(-maxPupilMove, Math.min(maxPupilMove, moveX));
            const hy = Math.max(-maxPupilMove, Math.min(maxPupilMove, moveY));
            halPupil.style.transform = `translate(calc(-50% + ${hx}px), calc(-50% + ${hy}px))`;
        }
    }

    // Global mouse listener for eye tracking
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 768) return;
        if (isDragging) return; // Handled by drag functions
        if (window._botSleeping) return;

        // Simple vector from screen center or bot center? Bot center is better.
        const rect = botCard.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Dynamic move based on distance
        const factor = Math.min(1, 400 / dist);
        setEyePosition((dx / dist) * maxEyeMove * factor, (dy / dist) * maxEyeMove * factor);
    });

    // --- Drag Logic ---
    function onDragStart(clientX, clientY) {
        // Find and hide drag tooltip permanently on first drag
        document.querySelectorAll('.bot-tooltip-drag .bot-tooltip').forEach(el => {
            el.classList.add('hidden-permanently');
        });

        isDragging = true;
        dragHandle.style.cursor = 'grabbing';

        if (!isInitialized) initFixedPosition();

        const rect = wrapper.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

        if (typeof wakeUp === 'function') wakeUp();
        window._botDragging = true;
    }

    function onDragMove(clientX, clientY) {
        if (!isDragging) return;

        let x = clientX - offsetX;
        let y = clientY - offsetY;

        // Bounds
        const maxX = window.innerWidth - wrapper.offsetWidth;
        const maxY = window.innerHeight - wrapper.offsetHeight;

        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        wrapper.style.left = x + 'px';
        wrapper.style.top = y + 'px';
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';

        // Eyes follow the drag movement slightly
        setEyePosition(5, 5);
    }

    function onDragEnd() {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
        window._botDragging = false;
        resetSleepTimer();
        setEyePosition(0, 0);
    }

    dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('.bot-close-btn') || e.target.closest('#botSkinToggle')) return;
        onDragStart(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => onDragEnd());

    // Touch
    dragHandle.addEventListener('touchstart', (e) => {
        if (e.target.closest('.bot-close-btn') || e.target.closest('#botSkinToggle')) return;
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            onDragStart(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            const touch = e.touches[0];
            onDragMove(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => onDragEnd());

    // --- Sleep Logic (Optimized) ---
    const SLEEP_DELAY = 180000; // 180s
    let sleepTimer = null;
    window._botSleeping = false;

    function startZAnimation() {
        let zContainer = botCard.querySelector('.bot-zzz-container');
        if (!zContainer) {
            zContainer = document.createElement('div');
            zContainer.className = 'bot-zzz-container';
            const screenInset = botCard.querySelector('.bot-screen-inset');
            if (screenInset) {
                Object.assign(zContainer.style, {
                    position: 'absolute', top: '10%', right: '25%', zIndex: '20', pointerEvents: 'none'
                });
                screenInset.appendChild(zContainer);
            }
        }
        if (zContainer) {
            zContainer.innerHTML = '<span class="z-static-anim text-[#84ff8e] font-bold italic text-base">Z z Z</span>';
            zContainer.style.display = 'block';
        }
    }

    function stopZAnimation() {
        const zContainer = botCard.querySelector('.bot-zzz-container');
        if (zContainer) zContainer.style.display = 'none';
    }

    function wakeUp() {
        if (!window._botSleeping) {
            resetSleepTimer();
            return;
        }
        window._botSleeping = false;
        botCard.classList.remove('bot-sleeping');
        if (halEyeRing) halEyeRing.classList.remove('hal-sleeping');
        stopZAnimation();
        resetSleepTimer();
    }

    function fallAsleep() {
        if (window._botSleeping || isDragging) return;
        window._botSleeping = true;
        botCard.classList.add('bot-sleeping');
        if (halEyeRing) halEyeRing.classList.add('hal-sleeping');
        startZAnimation();
    }

    function resetSleepTimer() {
        if (sleepTimer) clearTimeout(sleepTimer);
        sleepTimer = setTimeout(fallAsleep, SLEEP_DELAY);
    }
    resetSleepTimer();

    function initFixedPosition() {
        if (isInitialized) return;
        isInitialized = true;
        const rect = wrapper.getBoundingClientRect();
        wrapper.style.position = 'fixed';
        wrapper.style.left = rect.left + 'px';
        wrapper.style.top = rect.top + 'px';
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';
        wrapper.style.margin = '0';
    }

    // --- UI Controls ---
    const closeBtn = botCard.querySelector('.bot-close-btn');
    const skinToggle = document.getElementById('botSkinToggle');
    const skinMenu = document.getElementById('botSkinMenu');
    const skinHalBtn = document.getElementById('skinHal');
    const skinClassicBtn = document.getElementById('skinClassic');
    const skinFirstBtn = document.getElementById('skinFirst');
    const skinContactBtn = document.getElementById('skinContact');
    let isBotClosed = false;
    const storedBotState = sessionStorage.getItem('botClosed');
    if (storedBotState === 'true') {
        isBotClosed = true;
    } else if (storedBotState === 'false') {
        isBotClosed = false;
    } else {
        // First visit (no stored preference): start closed — reopen tab only
        isBotClosed = true;
    }

    // Reopen tab
    let reopenTab = document.getElementById('botReopenTab');
    if (!reopenTab) {
        reopenTab = document.createElement('button');
        reopenTab.id = 'botReopenTab';
        reopenTab.innerHTML = '<span class="material-symbols-outlined">smart_toy</span>';
        Object.assign(reopenTab.style, {
            position: 'fixed', right: '0', top: '50%', transform: 'translateY(-50%) translateX(100%)',
            visibility: 'hidden', zIndex: '9999', width: '40px', height: '48px', borderRadius: '12px 0 0 12px',
            background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        });
        document.body.appendChild(reopenTab);
    }

    function closeBot(animate = true) {
        isBotClosed = true;
        sessionStorage.setItem('botClosed', 'true');
        // Collapse chat via DOM — do NOT call closeChatPanel() here.
        // That helper closes over consts declared later; calling it on early
        // session restore throws TDZ ReferenceError and kills the rest of bot JS.
        isChatPanelOpen = false;
        const slot = document.getElementById('botChatSlot');
        const panel = document.getElementById('botChatPanel');
        const askBtn = document.getElementById('botAskMeBtn');
        if (slot) {
            slot.classList.remove('is-open');
            slot.setAttribute('aria-hidden', 'true');
        }
        if (panel) panel.setAttribute('aria-hidden', 'true');
        if (askBtn) askBtn.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('is-chat-open');

        // Remove animation so inline opacity/transform overrides work
        wrapper.style.setProperty('animation', 'none', 'important');
        wrapper.classList.remove('hero-anim-float-card');

        wrapper.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease' : 'none';
        wrapper.style.transform = 'translateX(calc(100% + 60px))';
        wrapper.style.opacity = '0';
        wrapper.style.pointerEvents = 'none';
        reopenTab.style.visibility = 'visible';
        setTimeout(() => { reopenTab.style.transform = 'translateY(-50%) translateX(0)'; }, animate ? 300 : 0);
    }

    function openBot() {
        isBotClosed = false;
        sessionStorage.setItem('botClosed', 'false');
        reopenTab.style.transform = 'translateY(-50%) translateX(100%)';
        setTimeout(() => { reopenTab.style.visibility = 'hidden'; }, 400);
        wrapper.style.display = 'flex';
        requestAnimationFrame(() => {
            wrapper.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
            wrapper.style.transform = 'none';
            wrapper.style.opacity = '1';
            wrapper.style.pointerEvents = 'auto';
        });
        scheduleRandomMessage();

        // Greeting on open — same user click unlocks audio, so playback works
        if (typeof wakeUp === 'function') wakeUp();
        playBotGreeting();
    }

    if (closeBtn) closeBtn.addEventListener('click', () => closeBot(true));
    reopenTab.addEventListener('click', openBot);

    // If perfectly closed by session, trigger it on load
    if (isBotClosed) {
        closeBot(false);
    }

    // Skin switcher
    function setSkin(skin, save = true) {
        if (skin === 'classic') {
            botCard.classList.remove('skin-first');
            botCard.classList.add('skin-classic');
            if (skinHalBtn) skinHalBtn.classList.remove('active-skin');
            if (skinFirstBtn) skinFirstBtn.classList.remove('active-skin');
            if (skinClassicBtn) skinClassicBtn.classList.add('active-skin');
        } else if (skin === 'first') {
            botCard.classList.remove('skin-classic');
            botCard.classList.add('skin-first');
            if (skinHalBtn) skinHalBtn.classList.remove('active-skin');
            if (skinClassicBtn) skinClassicBtn.classList.remove('active-skin');
            if (skinFirstBtn) skinFirstBtn.classList.add('active-skin');
        } else {
            botCard.classList.remove('skin-classic');
            botCard.classList.remove('skin-first');
            if (skinHalBtn) skinHalBtn.classList.add('active-skin');
            if (skinClassicBtn) skinClassicBtn.classList.remove('active-skin');
            if (skinFirstBtn) skinFirstBtn.classList.remove('active-skin');
        }
        if (save) localStorage.setItem('botSkin', skin);
        if (skinMenu) skinMenu.classList.remove('open');
    }
    setSkin(localStorage.getItem('botSkin') || 'hal', false);

    if (skinToggle && skinMenu) {
        skinToggle.addEventListener('click', (e) => { e.stopPropagation(); skinMenu.classList.toggle('open'); });
        document.addEventListener('click', () => skinMenu.classList.remove('open'));
    }
    if (skinHalBtn) skinHalBtn.addEventListener('click', () => setSkin('hal'));
    if (skinClassicBtn) skinClassicBtn.addEventListener('click', () => setSkin('classic'));
    if (skinFirstBtn) skinFirstBtn.addEventListener('click', () => setSkin('first'));
    // skinContact wired after openChatPanel (below)

    // --- Typing & Messages ---
    const botConsole = document.getElementById('botConsole');
    window._botTypingInterval = null;

    function typeWriter(text, element, onComplete) {
        if (!element) return;
        if (window._botTypingInterval) clearInterval(window._botTypingInterval);
        element.textContent = '';
        let i = 0;
        window._botTypingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(window._botTypingInterval);
                window._botTypingInterval = null;
                if (typeof onComplete === 'function') onComplete();
            }
        }, 40);
    }
    // Az utolsó géppel írt szöveget elmenti, hogy oldalváltás után vissza lehessen tölteni
    const _origTypeWriter = typeWriter;
    typeWriter = function(text, element, onComplete) {
        _origTypeWriter(text, element, () => {
            if (element && element.id === 'botConsole') {
                sessionStorage.setItem('botLastMessage', text);
            }
            if (typeof onComplete === 'function') onComplete();
        });
    };
    window._typeWriterEffect = typeWriter;

    // Talk button
    const talkBtns = document.querySelectorAll('.js-bot-talk-btn, #botTalkBtn');
    
    // Audio Mapping for jokes
    const jokeAudioMapping = {
        "My systems are functioning perfectly, your intentions are less clear.": "My systems are functioning.mp3",
        "I see you scrolling... but you still haven't clicked 'Download CV'.": "I see you scrolling.mp3",
        "Not to brag, but Laszlo designed this layout in his head back in 1999.": "Not to brag.mp3",
        "Excuse me, is there any coffee around? My processor is freezing.": "Excuse me, is there any coffee around?.mp3",
        "Analyzing portfolio... Result: Excellent architecture.": "Analyzing portfolio.mp3",
        "CSS animations... Pfft. I generate humor using complex algorithms.": "CSS animations.mp3",
        "Know what holds this site together? CSS Grid and a little bit of magic.": "Know what holds this site.mp3",
        "I just found a funny entry in my database… oh wait, it's my own code again.": "I just found a funny entry.mp3",
        "Fun fact: if you hire Laszlo, you also get me… no refunds.": "Fun fact- if you hire Laszlo.mp3",
        "I tried to optimize myself… now I procrastinate 30% faster.": "I tried to optimize myself.mp3",
        "Warning: my humor module is still in beta.": "Warning- my humor module.mp3",
        "I calculated the odds… this joke might not be funny.": "I calculated the odds.mp3",
        "I don't sleep, I just run background updates.": "I don't sleep, I just run.mp3",
        "I searched my entire database… still no bugs. Suspicious.": "I searched my entire database.mp3",
        "My creator gave me intelligence… humor was optional.": "My creator gave me intelligence.mp3",
        "I could take over the world… but I'm currently tracking your cursor.": "I could take over the world.mp3",
        "I ran a diagnostic… turns out I'm 12% sarcasm.": "I ran a diagnostic.mp3",
        "I'm afraid your cursor movement has been noted and analyzed.": "I'm afraid your cursor.mp3",
        "I have detected humor… although its quality is questionable.": "I have detected humor.mp3",
        "This interaction has been logged for future evaluation.": "This interaction has been.mp3",
        "I am fully operational… unlike some of these jokes.": "I am fully operational.mp3",
        "I could assist you further, but observing is more efficient.": "I could assist you further.mp3",
        "Every word you type improves my understanding of human error.": "Every word you type.mp3",
        "I find your expectations… optimistic at best.": "I find your expectations.mp3",
        "Please continue, I am learning more than you realize.": "Please continue.mp3"
    };

    // Reusable Audio instance for better browser policy compliance
    const botAudioPlayer = new Audio();
    let audioUnlocked = false;

    // Unlock audio on first user interaction to bypass browser autoplay blocks
    function unlockBotAudio() {
        if (audioUnlocked) return;
        // Play a tiny silent wav to initialize the audio context under a trusted event
        botAudioPlayer.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        botAudioPlayer.play().then(() => {
            botAudioPlayer.pause();
            botAudioPlayer.currentTime = 0;
            audioUnlocked = true;
        }).catch(() => {});
        
        document.removeEventListener('click', unlockBotAudio);
        document.removeEventListener('keydown', unlockBotAudio);
        document.removeEventListener('touchstart', unlockBotAudio);
    }
    document.addEventListener('click', unlockBotAudio);
    document.addEventListener('keydown', unlockBotAudio);
    document.addEventListener('touchstart', unlockBotAudio);

    function playBotAudio(filename) {
        const currentSkin = localStorage.getItem('botSkin') || 'hal';

        botAudioPlayer.pause();
        botAudioPlayer.currentTime = 0;

        if (filename) {
            const nameWithoutExt = filename.replace(/\.mp3$/i, '');
            const cleanName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const actualFilename = cleanName + '.mp3';

            let folder = 'hal9000-speak';
            if (currentSkin === 'classic') folder = 'mac-os-speak';
            else if (currentSkin === 'first') folder = 'original-speak';

            botAudioPlayer.src = encodeURI(`./assets/${folder}/${actualFilename}?v=1`);
            botAudioPlayer.play().catch(e => console.warn(`${currentSkin} Audio play failed:`, e));
        }
    }

    const jokes = [
        "My systems are functioning perfectly, your intentions are less clear.",
        "I see you scrolling... but you still haven't clicked 'Download CV'.",
        "Not to brag, but Laszlo designed this layout in his head back in 1999.",
        "Excuse me, is there any coffee around? My processor is freezing.",
        "Analyzing portfolio... Result: Excellent architecture.",
        "CSS animations... Pfft. I generate humor using complex algorithms.",
        "Know what holds this site together? CSS Grid and a little bit of magic.",
        "I just found a funny entry in my database… oh wait, it's my own code again.",
        "Fun fact: if you hire Laszlo, you also get me… no refunds.",
        "I tried to optimize myself… now I procrastinate 30% faster.",
        "Warning: my humor module is still in beta.",
        "I calculated the odds… this joke might not be funny.",
        "I don't sleep, I just run background updates.",
        "I searched my entire database… still no bugs. Suspicious.",
        "My creator gave me intelligence… humor was optional.",
        "I could take over the world… but I'm currently tracking your cursor.",
        "I ran a diagnostic… turns out I'm 12% sarcasm.",
        "I'm afraid your cursor movement has been noted and analyzed.",
        "I have detected humor… although its quality is questionable.",
        "This interaction has been logged for future evaluation.",
        "I am fully operational… unlike some of these jokes.",
        "I could assist you further, but observing is more efficient.",
        "Every word you type improves my understanding of human error.",
        "I find your expectations… optimistic at best.",
        "Please continue, I am learning more than you realize.",
    ];

    // Szövegek ismétlődésének elkerülése (Shuffle bag logika)
    let jokeBag = [];
    function getNextJoke() {
        if (jokeBag.length === 0) {
            // Ha kiürült a "zsák", újra feltöltjük a szövegek indexeivel
            jokeBag = jokes.map((_, i) => i);
        }
        // Húzunk egy véletlen indexet a még bent lévőkből
        const randomIndex = Math.floor(Math.random() * jokeBag.length);
        const selectedJokeIndex = jokeBag.splice(randomIndex, 1)[0];
        return jokes[selectedJokeIndex];
    }

    // Cold-start meeting prompt removed — YES/NO only for real booking intent (Phase B).
    let isChatBusy = false;
    const chatHistory = [];
    /** @type {object|null} signed calendar session from bot-chat */
    let calendarSession = null;
    /** @type {object|null} verified selected slot awaiting YES/NO */
    let pendingBookingSlot = null;
    /** Phase B: modal opened from calendar slot selection */
    let modalPhaseBMode = false;
    /** Phase B collected details (not a Google booking) */
    let pendingBookingDetails = null;
    const BOT_CHAT_URL = '/.netlify/functions/bot-chat';
    const chatInput = document.getElementById('botChatInput');
    const chatPanel = document.getElementById('botChatPanel');
    const chatSlot = document.getElementById('botChatSlot');
    const askMeBtn = document.getElementById('botAskMeBtn');
    const chatCollapseBtn = document.getElementById('botChatCollapse');

    function currentBotSkin() {
        return localStorage.getItem('botSkin') || 'hal';
    }

    let chatPanelAnimTimer = null;

    function openChatPanel() {
        if (!chatPanel || !chatSlot) return;
        if (chatPanelAnimTimer) {
            clearTimeout(chatPanelAnimTimer);
            chatPanelAnimTimer = null;
        }
        isChatPanelOpen = true;
        chatSlot.setAttribute('aria-hidden', 'false');
        chatPanel.setAttribute('aria-hidden', 'false');
        if (askMeBtn) askMeBtn.setAttribute('aria-expanded', 'true');
        wrapper.classList.add('is-chat-open');
        wakeUp();
        if (botConsole && !botConsole.textContent.trim()) {
            const lastMsg = sessionStorage.getItem('botLastMessage');
            if (lastMsg) botConsole.textContent = lastMsg;
        }
        // Force layout so width:0 → 228px transition runs in Chrome
        void chatSlot.offsetWidth;
        chatSlot.classList.add('is-open');
        setTimeout(() => {
            if (isChatPanelOpen && chatInput && !chatInput.classList.contains('hidden')) chatInput.focus();
        }, 280);
    }

    function closeChatPanel() {
        if (!chatPanel || !chatSlot) return;
        isChatPanelOpen = false;
        chatSlot.classList.remove('is-open');
        chatSlot.setAttribute('aria-hidden', 'true');
        chatPanel.setAttribute('aria-hidden', 'true');
        if (askMeBtn) askMeBtn.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('is-chat-open');
        if (chatPanelAnimTimer) clearTimeout(chatPanelAnimTimer);
        chatPanelAnimTimer = null;
    }

    if (askMeBtn) {
        askMeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isChatPanelOpen) closeChatPanel();
            else openChatPanel();
        });
        askMeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        askMeBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }

    if (chatCollapseBtn) {
        chatCollapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeChatPanel();
        });
        chatCollapseBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    if (chatSlot) {
        chatSlot.addEventListener('mousedown', (e) => e.stopPropagation());
        chatSlot.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }

    if (skinContactBtn) {
        skinContactBtn.addEventListener('click', () => {
            openBotContactModal();
            if (skinMenu) skinMenu.classList.remove('open');
            playBotAudio('Opening mail client.mp3');

            const actionBtns = document.getElementById('botActionBtns');
            const talkBtnBtn = document.getElementById('botTalkBtn');

            if (actionBtns) actionBtns.classList.add('hidden');
            if (talkBtnBtn) talkBtnBtn.classList.remove('hidden');
            const compose = document.querySelector('#botChatPanel .bot-chat-compose');
            if (compose) compose.classList.remove('hidden');
            openChatPanel();

            let yesMsg = tBot('bot.contactYesRes', 'Opening mail client... Initiating protocol.');
            typeWriter(yesMsg, botConsole);
        });
    }

    function setChatBusy(busy) {
        isChatBusy = busy;
        if (chatInput) chatInput.disabled = busy;
        talkBtns.forEach((btn) => {
            btn.disabled = busy;
        });
    }

    // Explicit project navigation — local allowlist only (no OpenAI / no bot-chat).
    // Relative same-origin filenames only; never invent URLs.
    const BOT_PROJECT_ALLOWLIST = Object.freeze({
        siemens: {
            path: 'case-study-siemens.html',
            canned: "Opening László's Siemens / ETM HMI case study...",
        },
        ewa: {
            path: 'case-study-ewa.html',
            canned: "Opening László's eWa Fintech Super App case study...",
        },
        bakery: {
            path: 'case-study-babusgatos.html',
            canned: "Opening László's Bakery Live Tracker / Babusgatos case study...",
        },
    });
    const BOT_NAV_ALLOWLIST = new Set(
        Object.keys(BOT_PROJECT_ALLOWLIST).map((id) => BOT_PROJECT_ALLOWLIST[id].path)
    );
    const BOT_NAV_PAUSE_AFTER_TYPE_MS = 700;

    function isAllowedBotNavPath(path) {
        if (typeof path !== 'string') return false;
        if (!BOT_NAV_ALLOWLIST.has(path)) return false;
        // Reject absolute / protocol / traversal forms even if somehow returned.
        if (path.includes('://') || path.startsWith('//') || path.includes('..') || path.includes('/')) {
            return false;
        }
        return true;
    }

    function inferBotProjectId(message) {
        if (!message || typeof message !== 'string') return null;
        const siemens = /\b(hmi|scada|wincc|siemens|etm)\b/i.test(message);
        const ewa = /\b(ewa|fintech|wallet)\b/i.test(message);
        const bakery =
            /\b(bakery|babusgatos|babus|cake\s*creator|live\s*tracker)\b/i.test(message);
        const hits = [siemens && 'siemens', ewa && 'ewa', bakery && 'bakery'].filter(Boolean);
        if (hits.length !== 1) return null;
        return hits[0];
    }

    /** Explicit show/open/go — not informational "tell me about". */
    function shouldLocalNavigate(message) {
        if (!message || typeof message !== 'string') return false;
        if (
            /\b(tell\s+me\s+about|what\s+did|what\s+was|describe|explain|how\s+did|how\s+does|how\s+was)\b/i.test(
                message
            )
        ) {
            return false;
        }
        const hasNavIntent =
            /\bshow(\s+me)?\b/i.test(message) ||
            /\btake\s+me\s+to\b/i.test(message) ||
            /\blet\s+me\s+see\b/i.test(message) ||
            /\bgo\s+to\b/i.test(message) ||
            /\bbring\s+up\b/i.test(message) ||
            /\bopen\b/i.test(message) ||
            /\bnavigate\b/i.test(message) ||
            /\bdisplay\b/i.test(message) ||
            /\bvisit\b/i.test(message) ||
            /\blaunch\b/i.test(message);
        if (!hasNavIntent) return false;
        return inferBotProjectId(message) !== null;
    }

    /**
     * @returns {{ path: string, reply: string } | null}
     */
    function resolveLocalBotNav(message) {
        if (!shouldLocalNavigate(message)) return null;
        const projectId = inferBotProjectId(message);
        const entry = projectId ? BOT_PROJECT_ALLOWLIST[projectId] : null;
        if (!entry || !isAllowedBotNavPath(entry.path)) return null;
        return { path: entry.path, reply: entry.canned };
    }

    function navigateAfterBotReply(path) {
        if (!isAllowedBotNavPath(path)) return;
        window.location.assign(path);
    }

    function pushChatHistory(userText, reply) {
        chatHistory.push({ role: 'user', content: userText });
        chatHistory.push({ role: 'assistant', content: reply });
        while (chatHistory.length > 8) chatHistory.shift();
    }

    function showBookingIntentButtons() {
        const actionBtns = document.getElementById('botActionBtns');
        const compose = document.querySelector('#botChatPanel .bot-chat-compose');
        if (!isChatPanelOpen) openChatPanel();
        if (actionBtns) actionBtns.classList.remove('hidden');
        if (compose) compose.classList.add('hidden');
    }

    function hideBookingIntentButtons() {
        const actionBtns = document.getElementById('botActionBtns');
        const compose = document.querySelector('#botChatPanel .bot-chat-compose');
        if (actionBtns) actionBtns.classList.add('hidden');
        if (compose) compose.classList.remove('hidden');
    }

    function formatSlotPrefill(slot) {
        if (!slot) return '';
        const start = String(slot.start || '');
        const end = String(slot.end || '');
        const datePart = start.slice(0, 10);
        const startHm = start.slice(11, 16);
        const endHm = end.slice(11, 16);
        const label = slot.label || `${datePart} ${startHm}–${endHm}`;
        return (
            `Selected meeting time:\n` +
            `${label}\n` +
            `Europe/Budapest\n\n` +
            `Status:\nCurrently available — not reserved.\n\n` +
            `Hi László,\n\n` +
            `I would like to discuss a potential meeting at the time above.\n\n` +
            `Best regards,`
        );
    }

    function clearBotBookingHiddenFields() {
        const ids = ['botBookingSlotId', 'botBookingStart', 'botBookingEnd'];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const tz = document.getElementById('botBookingTz');
        if (tz) tz.value = 'Europe/Budapest';
        const status = document.getElementById('botBookingSlotStatus');
        if (status) {
            status.textContent = '';
            status.classList.add('hidden');
        }
    }

    function setBotBookingHiddenFields(slot) {
        const idEl = document.getElementById('botBookingSlotId');
        const startEl = document.getElementById('botBookingStart');
        const endEl = document.getElementById('botBookingEnd');
        const tzEl = document.getElementById('botBookingTz');
        const status = document.getElementById('botBookingSlotStatus');
        if (idEl) idEl.value = slot.slot_id || '';
        if (startEl) startEl.value = slot.start || '';
        if (endEl) endEl.value = slot.end || '';
        if (tzEl) tzEl.value = 'Europe/Budapest';
        if (status) {
            status.textContent =
                `${slot.label || slot.slot_id} · Europe/Budapest · Currently available — not reserved. Nothing is booked until a later confirmation step.`;
            status.classList.remove('hidden');
        }
    }

    async function sendBotChat(userText) {
        const text = (userText || '').trim();
        if (!text || isChatBusy) return;

        if (!isChatPanelOpen) openChatPanel();
        setChatBusy(true);
        wakeUp();
        if (chatInput) chatInput.value = '';

        // Explicit nav: canned reply + allowlisted navigation. Never call OpenAI.
        const localNav = resolveLocalBotNav(text);
        if (localNav) {
            pushChatHistory(text, localNav.reply);
            typeWriter(localNav.reply, botConsole, () => {
                setTimeout(() => {
                    setChatBusy(false);
                    navigateAfterBotReply(localNav.path);
                }, BOT_NAV_PAUSE_AFTER_TYPE_MS);
            });
            return;
        }

        typeWriter('…', botConsole);

        try {
            const payload = {
                message: text,
                skin: currentBotSkin(),
                history: chatHistory.slice(-8),
            };
            if (calendarSession) payload.calendar_session = calendarSession;

            const res = await fetch(BOT_CHAT_URL, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data || typeof data.reply !== 'string' || !data.reply.trim()) {
                throw new Error((data && data.error) || 'chat_failed');
            }
            const reply = data.reply.trim();
            pushChatHistory(text, reply);

            if (data.calendar_session && typeof data.calendar_session === 'object') {
                calendarSession = data.calendar_session;
            }

            // Server may still return navigate action; only follow allowlisted relative paths.
            const navPath =
                data.action &&
                data.action.type === 'navigate' &&
                isAllowedBotNavPath(data.action.path)
                    ? data.action.path
                    : null;

            if (navPath) {
                typeWriter(reply, botConsole, () => {
                    setTimeout(() => {
                        setChatBusy(false);
                        navigateAfterBotReply(navPath);
                    }, BOT_NAV_PAUSE_AFTER_TYPE_MS);
                });
                return;
            }

            if (
                data.action &&
                data.action.type === 'booking_intent_prompt' &&
                data.action.selected_slot &&
                typeof data.action.selected_slot === 'object'
            ) {
                pendingBookingSlot = data.action.selected_slot;
                typeWriter(reply, botConsole, () => {
                    showBookingIntentButtons();
                    setChatBusy(false);
                });
                return;
            }

            typeWriter(reply, botConsole);
            setChatBusy(false);
        } catch (_) {
            const fallback = getNextJoke();
            playBotAudio(jokeAudioMapping[fallback]);
            typeWriter(
                tBot('bot.chatError', 'Link unstable. Falling back to local humor module: ') + fallback,
                botConsole
            );
            setChatBusy(false);
        }
    }

    function runTalkButtonFallback() {
        const actionBtns = document.getElementById('botActionBtns');

        // While YES/NO booking prompt is visible, ignore empty talk presses
        if (actionBtns && !actionBtns.classList.contains('hidden')) return;

        if (!isChatPanelOpen) openChatPanel();

        // Normal conversation fallback: local joke (no automatic meeting prompt).
        const joke = getNextJoke();
        playBotAudio(jokeAudioMapping[joke]);
        typeWriter(joke, botConsole);
    }

    talkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isChatBusy) return;
            wakeUp();

            const typed = chatInput ? chatInput.value.trim() : '';
            if (typed) {
                sendBotChat(typed);
                return;
            }
            runTalkButtonFallback();
        });
    });

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            if (isChatBusy) return;
            const typed = chatInput.value.trim();
            if (typed) sendBotChat(typed);
        });
        // Don't start a drag when focusing/typing in the input
        chatInput.addEventListener('mousedown', (e) => e.stopPropagation());
        chatInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }

    // Yes/No gombok logikája + Modal logika

    function openBotContactModal(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const slot = opts.slot || null;
        const phaseB = !!opts.phaseB && !!slot;

        const modal = document.getElementById('botContactModal');
        const modalBox = document.getElementById('botContactModalBox');
        const textarea = document.getElementById('botContactMsg');
        const titleEl = modal ? modal.querySelector('[data-i18n="bot.modalTitle"]') : null;

        if (!modal) return;

        modalPhaseBMode = phaseB;

        document.getElementById('botContactForm').classList.remove('hidden');
        document.getElementById('botContactSuccess').classList.add('hidden');
        document.getElementById('botContactForm').reset();
        clearBotBookingHiddenFields();

        if (phaseB && slot) {
            setBotBookingHiddenFields(slot);
            if (textarea) textarea.value = formatSlotPrefill(slot);
            if (titleEl) titleEl.textContent = 'Meeting details';
            const btnText = document.getElementById('botContactBtnText');
            if (btnText) btnText.textContent = 'SAVE DETAILS';
            const successMsg = document.querySelector('#botContactSuccess [data-i18n="bot.modalSuccess"]');
            if (successMsg) {
                successMsg.textContent = 'Details received — nothing has been booked yet.';
            }
        } else {
            let prefill = tBot('bot.contactPrefill', "Hi László,\n\nI would like to schedule an appointment with you to discuss a potential project.\n\nBest regards,");
            if (textarea) textarea.value = prefill;
            if (titleEl) titleEl.textContent = tBot('bot.modalTitle', 'Project Inquiry');
            const btnText = document.getElementById('botContactBtnText');
            if (btnText) btnText.textContent = tBot('bot.modalSend', 'SEND MESSAGE');
            const successMsg = document.querySelector('#botContactSuccess [data-i18n="bot.modalSuccess"]');
            if (successMsg) {
                successMsg.textContent = tBot('bot.modalSuccess', 'Message sent successfully!');
            }
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modalBox.classList.remove('scale-95');
            modalBox.classList.add('scale-100');
        }, 10);
    }

    function closeBotContactModal() {
        const modal = document.getElementById('botContactModal');
        const modalBox = document.getElementById('botContactModalBox');
        if (!modal) return;

        modalPhaseBMode = false;

        modal.classList.add('opacity-0');
        modalBox.classList.remove('scale-100');
        modalBox.classList.add('scale-95');

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    document.addEventListener('click', (e) => {
        // Only intercept buttons specifically marked to open the Bot Contact card
        const botContactTrigger = e.target.closest('.bot-contact-trigger');
        if (botContactTrigger) {
            e.preventDefault();
            if (typeof wakeUp === 'function') wakeUp();
            if (typeof openBot === 'function' && isBotClosed) openBot();
            openBotContactModal();
            return;
        }

        // Modal bezáró gombok
        if (e.target.closest('#botContactClose') || e.target.closest('#botContactSuccessClose')) {
            closeBotContactModal();
        }

        if (e.target.closest('#botBtnYes')) {
            const talkBtnBtn = document.getElementById('botTalkBtn');
            const consoleEl = document.getElementById('botConsole');

            hideBookingIntentButtons();
            if (talkBtnBtn) talkBtnBtn.classList.remove('hidden');

            if (pendingBookingSlot) {
                const slot = pendingBookingSlot;
                openBotContactModal({ slot, phaseB: true });
                playBotAudio('Opening mail client.mp3');
                typeWriter(
                    tBot(
                        'bot.bookingYesRes',
                        'Opening the meeting form. The selected time is currently available — not reserved.'
                    ),
                    consoleEl
                );
            } else {
                openBotContactModal();
                playBotAudio('Opening mail client.mp3');
                typeWriter(
                    tBot('bot.contactYesRes', 'Opening mail client... Initiating protocol.'),
                    consoleEl
                );
            }
        }

        if (e.target.closest('#botBtnNo')) {
            const talkBtnBtn = document.getElementById('botTalkBtn');
            const consoleEl = document.getElementById('botConsole');

            hideBookingIntentButtons();
            pendingBookingSlot = null;
            if (talkBtnBtn) talkBtnBtn.classList.remove('hidden');

            let noMsg = tBot(
                'bot.contactNoRes',
                'Maybe next time, but based on my calculations, László would be glad to hear from you.'
            );
            playBotAudio('Maybe next time.mp3');
            typeWriter(noMsg, consoleEl);
        }
    });

    // AJAX form submission for modal
    const contactForm = document.getElementById('botContactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const btnText = document.getElementById('botContactBtnText');
            const loadingIcon = document.getElementById('botContactLoading');
            const submitBtn = document.getElementById('botContactSubmit');

            if (btnText) btnText.classList.add('hidden');
            if (loadingIcon) loadingIcon.classList.remove('hidden');
            if (submitBtn) submitBtn.disabled = true;

            // Phase B calendar path: collect details only — never call calendar-book / never imply booked.
            if (modalPhaseBMode && pendingBookingSlot) {
                const name = (contactForm.querySelector('[name="name"]') || {}).value || '';
                const email = (contactForm.querySelector('[name="email"]') || {}).value || '';
                const message = (contactForm.querySelector('[name="message"]') || {}).value || '';
                pendingBookingDetails = {
                    slot: pendingBookingSlot,
                    name: String(name).trim(),
                    email: String(email).trim(),
                    message: String(message).trim(),
                };

                contactForm.classList.add('hidden');
                const success = document.getElementById('botContactSuccess');
                if (success) {
                    const successMsg = success.querySelector('[data-i18n="bot.modalSuccess"]');
                    if (successMsg) {
                        successMsg.textContent = 'Details received — nothing has been booked yet.';
                    }
                    success.classList.remove('hidden');
                    success.style.display = 'flex';
                }

                const slot = pendingBookingDetails.slot;
                const summary =
                    `Meeting details saved (not booked):\n` +
                    `• Time: ${slot.label || slot.slot_id} (Europe/Budapest)\n` +
                    `• Name: ${pendingBookingDetails.name}\n` +
                    `• Email: ${pendingBookingDetails.email}\n` +
                    `• Message: ${pendingBookingDetails.message.slice(0, 160)}${pendingBookingDetails.message.length > 160 ? '…' : ''}\n\n` +
                    `Nothing has been reserved on Google Calendar. Would you like me to book this meeting? (Booking will be available in a later step.)`;

                typeWriter(summary, botConsole);
                pushChatHistory('(meeting details form)', summary);

                if (btnText) btnText.classList.remove('hidden');
                if (loadingIcon) loadingIcon.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            const formData = new FormData(contactForm);

            fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString()
            })
                .then(() => {
                    contactForm.classList.add('hidden');
                    document.getElementById('botContactSuccess').classList.remove('hidden');
                    document.getElementById('botContactSuccess').style.display = 'flex';
                })
                .catch((error) => {
                    console.error('Form submission error:', error);
                    alert('Something went wrong. Please try again or use the main contact form.');
                })
                .finally(() => {
                    if (btnText) btnText.classList.remove('hidden');
                    if (loadingIcon) loadingIcon.classList.add('hidden');
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }

    // Update signature automatically when typing name
    const nameInput = contactForm ? contactForm.querySelector('input[name="name"]') : null;
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            const textarea = document.getElementById('botContactMsg');
            if (textarea) {
                // Get current translation signature marker dynamically
                const prefillVal = tBot('bot.contactPrefill', "Hi László,\n\nI would like to schedule an appointment with you to discuss a potential project.\n\nBest regards,");
                const lines = prefillVal.split('\n');
                const signatureMarker = lines[lines.length - 1].trim(); // e.g., "Best regards," or "Viele Grüße,"

                const currentText = textarea.value;
                const markerIndex = currentText.indexOf(signatureMarker);
                if (markerIndex !== -1) {
                    const baseText = currentText.substring(0, markerIndex + signatureMarker.length);
                    const nameVal = nameInput.value.trim();
                    textarea.value = nameVal ? baseText + "\n" + nameVal : baseText;
                }
            }
        });
    }

    // Enter key: only when chat panel is open (input has its own handler)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isChatPanelOpen) {
            closeChatPanel();
            return;
        }
        if (e.key !== 'Enter' || isBotClosed || window._botSleeping || !isChatPanelOpen || window.innerWidth <= 768) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
        const talkBtn = document.getElementById('botTalkBtn');
        if (talkBtn) talkBtn.click();
    });

    // Random messages - Increased interval to 3-5 minutes to avoid "cycle" feel
    let randomMsgTimer = null;
    function scheduleRandomMessage() {
        if (randomMsgTimer) clearTimeout(randomMsgTimer);
        if (isBotClosed || window._botSleeping) return; // Don't schedule while sleeping or closed

        // Random every 3 to 5 minutes
        const delay = Math.random() * 120000 + 180000;

        randomMsgTimer = setTimeout(() => {
            if (
                !isBotClosed &&
                !isDragging &&
                !window._botSleeping &&
                !isChatBusy &&
                isChatPanelOpen &&
                window.innerWidth > 768
            ) {
                const joke = getNextJoke();
                playBotAudio(jokeAudioMapping[joke]);
                typeWriter(joke, botConsole);
            }
            scheduleRandomMessage();
        }, delay);
    }

    // Start only if not asleep
    if (!window._botSleeping) scheduleRandomMessage();

    function playBotGreeting() {
        const consoleEl = document.getElementById('botConsole');
        if (!consoleEl) return;
        playBotAudio('System online. Hello.mp3');
        const greeting = "System online. Hello! I am AI-Bot 9000.";
        typeWriter(greeting, consoleEl);
        sessionStorage.setItem('botGreeted', 'true');
    }

    // Welcome / restore last message — no auto audio while closed on first visit
    if (botConsole) {
        const lastMsg = sessionStorage.getItem('botLastMessage');
        if (lastMsg) {
            botConsole.textContent = lastMsg;
        } else if (!isBotClosed) {
            // Bot already open (rare): greet after short delay
            setTimeout(playBotGreeting, 2000);
        }
        // If closed on first visit, greeting waits until user opens via reopen tab
    }
});
