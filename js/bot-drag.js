/**
 * AI Bot Drag & Drop Script + Brain
 * Makes the AI Bot panel freely draggable across the page.
 * Also handles all logic: eye tracking, skin switching, typing, and random messages.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- CENTRALIZED BOT INJECTION ---
    const botHTML = `
    <div id="aiBotDragWrapper"
      class="hero-anim-float-card fixed bottom-4 right-4 sm:bottom-6 sm:right-8 z-[150] flex items-center justify-end pointer-events-auto group mt-4 sm:mt-0 transform scale-75 sm:scale-100 origin-bottom-right">

      <div id="aiBotCard" class="relative bot-body-3d hg-float-anim backdrop-blur-md opacity-100 transition-all duration-500">

        <!-- Skin Dropdown -->
        <div id="botSkinMenu" class="bot-skin-menu">
          <button id="skinHal" class="active-skin">◉ AI-Bot 9000</button>
          <button id="skinClassic">◎ Classic</button>
        </div>

        <!-- TOOLBAR / Drag Area -->
        <div class="bot-header-area group/handle">
          <div class="bot-header-field">
            <div class="bot-drag-handle-indicator" title="Drag to move">
              <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
            </div>
            
            <button id="botSkinToggle" class="bot-btn-3d" aria-label="Change Skin">
              <span class="material-symbols-outlined text-[16px]">menu</span>
            </button>
            
            <div class="bot-toolbar-spacer"></div>
            <span class="bot-title-text" data-i18n="bot.title">AI BOTT</span>
            
            <button class="bot-close-btn bot-btn-3d" aria-label="Close Bot">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        <!-- Name Banner -->
        <div class="bot-name-banner">
          <span class="name-part">AI-Bot</span>
          <span class="number-part">9000</span>
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
                    <div id="botRightEye" class="bot-eye bot-eyes-glow transition-all duration-300" style="width:28px;height:28px;"></div>
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

        <!-- Console Area -->
        <div class="bot-bottom-area">
          <div class="bot-screen-container w-full">
            <div class="bot-console-inset px-3 py-2 relative">
              <div class="h-full pb-6">
                <span id="botConsole" class="bot-console-text text-[11px] font-mono">System online. Hello!</span>
                <span class="bot-cursor w-1.5 h-3 bg-[#28A530] shadow-[0_0_5px_rgba(40,165,48,0.8)] inline-block ml-0.5 align-middle"></span>
              </div>
              <button id="botTalkBtn" class="absolute flex items-center justify-center w-4 h-4 bg-transparent hover:scale-110 active:scale-95 transition-all border-none cursor-pointer z-50 opacity-80 hover:opacity-100 js-bot-talk-btn" style="right: 4px; bottom: 3px; color: #28a530;" title="Generate Response (Enter)">
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'wght' 200;">subdirectory_arrow_left</span>
              </button>
            </div>
          </div>
          <button id="botTalkBtnClassic" class="bot-btn-3d js-bot-talk-btn flex-shrink-0" style="display:none;" aria-label="Open Chat">
              <span class="material-symbols-outlined text-[18px]">chat</span>
          </button>
        </div>

      </div><!-- end aiBotCard -->
    </div>`;

    const injectionPoint = document.getElementById('ai-bot-injection-point');
    if (injectionPoint) {
        injectionPoint.innerHTML = botHTML;
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
    let offsetX = 0;
    let offsetY = 0;

    // --- Eye tracking ---
    const eyes = botCard.querySelectorAll('.bot-eye');
    const maxEyeMove = 6;
    const halPupil = document.getElementById('halPupil');
    const halEyeRing = document.getElementById('halEyeRing');
    const maxPupilMove = 10;

    function setEyePosition(moveX, moveY) {
        // Normal eyes
        const nx = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveX));
        const ny = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveY));
        eyes.forEach(eye => {
            eye.style.transform = `translate(${nx}px, ${ny}px)`;
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
    const SLEEP_DELAY = 30000; // 30s
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
    let isBotClosed = (sessionStorage.getItem('botClosed') === 'true');

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
        sessionStorage.removeItem('botClosed');
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
            botCard.classList.add('skin-classic');
            if (skinHalBtn) skinHalBtn.classList.remove('active-skin');
            if (skinClassicBtn) skinClassicBtn.classList.add('active-skin');
        } else {
            botCard.classList.remove('skin-classic');
            if (skinHalBtn) skinHalBtn.classList.add('active-skin');
            if (skinClassicBtn) skinClassicBtn.classList.remove('active-skin');
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

    // --- Typing & Messages ---
    const botConsole = document.getElementById('botConsole');
    window._botTypingInterval = null;

    function typeWriter(text, element) {
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
            }
        }, 40);
    }
    window._typeWriterEffect = typeWriter;

    // Talk button
    const talkBtns = document.querySelectorAll('.js-bot-talk-btn, #botTalkBtn');
    const jokes = [
        "My systems are functioning perfectly, your intentions are less clear.",
        "Hey, did you know my 3D grid is just a CSS trick? Even I fell for it.",
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

    talkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            wakeUp();
            const joke = jokes[Math.floor(Math.random() * jokes.length)];
            typeWriter(joke, botConsole);
        });
    });

    // Enter key triggers interaction (only when bot is active/visible)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isBotClosed && !window._botSleeping && window.innerWidth > 768) {
            // Find the talk button and click it
            const talkBtn = botCard.querySelector('#botTalkBtn');
            if (talkBtn) talkBtn.click();
        }
    });

    // Random messages - Increased interval to 3-5 minutes to avoid "cycle" feel
    let randomMsgTimer = null;
    function scheduleRandomMessage() {
        if (randomMsgTimer) clearTimeout(randomMsgTimer);
        if (isBotClosed || window._botSleeping) return; // Don't schedule while sleeping or closed

        // Random every 3 to 5 minutes
        const delay = Math.random() * 120000 + 180000;

        randomMsgTimer = setTimeout(() => {
            if (!isBotClosed && !isDragging && !window._botSleeping && window.innerWidth > 768) {
                const joke = jokes[Math.floor(Math.random() * jokes.length)];
                typeWriter(joke, botConsole);
            }
            scheduleRandomMessage();
        }, delay);
    }

    // Start only if not asleep
    if (!window._botSleeping) scheduleRandomMessage();

    // Welcome
    if (botConsole) {
        setTimeout(() => {
            if (!sessionStorage.getItem('botGreeted')) {
                typeWriter("System online. Hello! I am AI-Bot 9000.", botConsole);
                sessionStorage.setItem('botGreeted', 'true');
            }
        }, 2000);
    }
});
