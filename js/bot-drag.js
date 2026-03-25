/**
 * AI Bot Drag & Drop Script + Brain
 * Makes the AI Bot panel freely draggable across the page.
 * Also handles all logic: eye tracking, skin switching, typing, and random messages.
 */
document.addEventListener('DOMContentLoaded', () => {
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
        "Hey, did you know my 3D grid is just a CSS trick? Even I fell for it.",
        "I see you scrolling... but you still haven't clicked 'Download CV'.",
        "Not to brag, but Laszlo designed this layout in his head back in 1999.",
        "Excuse me, is there any coffee around? My processor is freezing.",
        "Analyzing portfolio... Result: Excellent architecture.",
        "CSS animations... Pfft. I generate humor using complex algorithms.",
        "Downloading cookies in the background. Just kidding. I don't eat.",
        "Know what holds this site together? CSS Grid and a little bit of magic.",
        "They told me to be interactive. Here I am. Interact.",
        "Every click you make forces me to compute another cycle. Thanks."
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
                typeWriter("System online. Hello! I am AI-Bott 9000.", botConsole);
                sessionStorage.setItem('botGreeted', 'true');
            }
        }, 2000);
    }
});
