document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('hgGrid');
    const replayBtn = document.getElementById('hgReplayBtn');

    if (!gridElement || !replayBtn) return;

    const size = 8; // 10→8: 36% kevesebb DOM elem (64 kocka × 4 gyerek = 256 elem)
    const cubes = [];
    const activeCubes = new Set(); // PERFORMANCIA: csak az aktív kockákat követjük, nem mind a 100-at
    let isWaving = false;
    let waveTimeouts = [];
    let waveResetTimeout = null;

    // Rács generálása
    for (let r = 0; r < size; r++) {
        cubes[r] = [];
        for (let c = 0; c < size; c++) {
            const container = document.createElement('div');
            container.className = 'hg-cube-container';

            const glow = document.createElement('div');
            glow.className = 'hg-glow';

            const top = document.createElement('div');
            top.className = 'hg-face hg-face-top';

            const right = document.createElement('div');
            right.className = 'hg-face hg-face-right';

            const left = document.createElement('div');
            left.className = 'hg-face hg-face-left';

            container.appendChild(glow);
            container.appendChild(top);
            container.appendChild(right);
            container.appendChild(left);

            gridElement.appendChild(container);
            cubes[r][c] = container;
        }
    }

    // PERFORMANCIA: requestAnimationFrame batching — gyors egérmozgásnál összevonja
    // a frissítéseket egyetlen frame-be ahelyett, hogy minden kockára külön DOM-ot módosítana
    let pendingUpdate = null;
    let rafId = null;

    function processPendingUpdate() {
        rafId = null;
        if (pendingUpdate) {
            updateGrid(pendingUpdate.row, pendingUpdate.col, pendingUpdate.active);
            pendingUpdate = null;
        }
    }

    function scheduleUpdate(row, col, active) {
        if (active) stopWave();
        pendingUpdate = { row, col, active };
        if (!rafId) {
            rafId = requestAnimationFrame(processPendingUpdate);
        }
    }

    // Event listenerek rárakása a kockákra (a ciklus után, hogy a RAF-kezelő már elérhető legyen)
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            cubes[r][c].addEventListener('mouseenter', () => {
                if (window.innerWidth > 768) scheduleUpdate(r, c, true);
            });
            cubes[r][c].addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) scheduleUpdate(r, c, false);
            });
        }
    }

    function stopWave() {
        isWaving = false;
        waveTimeouts.forEach(id => clearTimeout(id));
        waveTimeouts = [];
        if (waveResetTimeout) clearTimeout(waveResetTimeout);
        // A timeout-ok leállítása után a már rákerült hullám-osztályokat is le kell szedni,
        // különben azok a kockák "befagynak" a hullámszínben
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                cubes[r][c].classList.remove('hg-wave-peak', 'hg-ambient-wave');
                cubes[r][c].style.removeProperty('--hg-wave-delay');
            }
        }
    }

    function triggerInitialWave(isAmbient = false) {
        stopWave();
        clearAllClasses();
        isWaving = true;

        const peakClass = isAmbient ? 'hg-ambient-wave' : 'hg-wave-peak';
        const totalDurationMs = isAmbient ? 2500 : 2500; // Teljes végigfutási idő
        const maxDiagonal = (size - 1) * 2;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const diagonalIndex = (size - 1 - r) + c;
                // Kiszámoljuk, mennyi idő múlva ér oda a hullám
                const delayMs = (diagonalIndex / maxDiagonal) * totalDurationMs;

                // Beállítjuk a CSS változót egyénileg minden kockára
                cubes[r][c].style.setProperty('--hg-wave-delay', `${delayMs}ms`);

                // Rárakjuk a class-t azonnal, de a CSS transition-delay fogja visszatartani
                cubes[r][c].classList.add(peakClass);

                // Automatikusan levesszük a csúcsot kis idővel a beérkezés után
                const tid = setTimeout(() => {
                    if (cubes[r][c].classList.contains(peakClass)) {
                        cubes[r][c].classList.remove(peakClass);
                    }
                }, delayMs + 650); // 650ms-ig tart egy csúcs

                waveTimeouts.push(tid);
            }
        }

        // Hullám állapot kikapcsolása a legvégén
        waveResetTimeout = setTimeout(() => {
            isWaving = false;
            waveTimeouts = [];
        }, totalDurationMs + 800);
    }

    function updateGrid(row, col, isActive) {
        clearActiveCubes();
        if (!isActive) return;

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = row + dr;
                const nc = col + dc;

                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    const cube = cubes[nr][nc];
                    cube.classList.remove('hg-falling-main');

                    if (dr === 0 && dc === 0) {
                        cube.classList.add('hg-active-main');
                    } else {
                        const randomHeight = Math.floor(Math.random() * 40) + 15;
                        cube.style.setProperty('--hg-height-neighbor', `${randomHeight}px`);
                        cube.classList.add('hg-active-neighbor');
                    }
                    activeCubes.add(cube); // Követjük melyik kockák aktívak
                }
            }
        }
    }

    // PERFORMANCIA: Csak az aktív kockákat tisztítjuk (max ~9 db hover esetén), nem mind a 100-at!
    function clearActiveCubes() {
        activeCubes.forEach(cube => {
            if (cube.classList.contains('hg-active-main')) {
                cube.classList.add('hg-falling-main');
                setTimeout(c => c.classList.remove('hg-falling-main'), 1500, cube);
            }
            cube.style.removeProperty('--hg-height-neighbor');
            cube.classList.remove('hg-active-main', 'hg-active-neighbor');
        });
        activeCubes.clear();
    }

    // Teljes rács reset (hullámokhoz, ahol mind a 100 kocka érintett)
    function clearAllClasses(class1) {
        const classesToRemove = ['hg-active-main', 'hg-active-neighbor', 'hg-wave-peak', 'hg-ambient-wave'];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                cubes[r][c].style.removeProperty('--hg-wave-delay');
                cubes[r][c].style.removeProperty('--hg-height-neighbor');
                if (class1) {
                    cubes[r][c].classList.remove(class1);
                } else {
                    cubes[r][c].classList.remove(...classesToRemove);
                }
            }
        }
        activeCubes.clear();
    }

    // Kezdeti hullám: CSAK az enyhe, lapos ambient típus (nem a 3D kocka-emelő, mert az pislogást okoz)
    setTimeout(() => triggerInitialWave(true), 1000);

    // Automatikus, időnkénti lágy hullámzás beállítása (10 másodpercenként)
    // Ez CSAK a lapos színváltó ("ambient") hullám, nem okoz performancia-problémát.
    let ambientWaveTimer;
    function resetAmbientWave() {
        if (ambientWaveTimer) clearInterval(ambientWaveTimer);
        ambientWaveTimer = setInterval(() => {
            let hasActiveCube = false;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (cubes[r][c].classList.contains('hg-active-main')) {
                        hasActiveCube = true;
                    }
                }
            }
            if (!hasActiveCube && !isWaving) {
                triggerInitialWave(true); // Lágy, lapos hullám (csak szín, nincs 3D emelés)
            }
        }, 10000);
    }
    resetAmbientWave();

    // AI Bot Logika (Szemkövetés és Gépelés)
    const botCard = document.getElementById('aiBotCard');
    const botConsole = document.getElementById('botConsole');
    const matrixProgress = document.getElementById('matrixProgressBar');
    const radarBtnContainer = document.getElementById('hgReplayBtn');
    const radarIcon = document.querySelector('#hgReplayBtn .material-symbols-outlined');
    let currentRotation = 0;

    let buttonTimeout1;
    let buttonTimeout2;
    let isRadarScanning = false;
    window._botTypingInterval = null;

    const botJokes = [
        "Hey, did you know my 3D grid is just a CSS trick? Even I fell for it.",
        "I see you scrolling... but you still haven't clicked 'Download CV'.",
        "You pressed the radar. Good job. What did it do? Oh, right, it turned green.",
        "Not to brag, but Laszlo designed this layout in his head back in 1999.",
        "Excuse me, is there any coffee around? My processor is freezing.",
        "Interesting anomaly detected. Oh wait, that's just a typo in my code.",
        "I could design something like this too... If I had a mouse.",
        "Does that green radar use a lot of power? I'm starting to lag.",
        "I think you should be pressing the 'Hire Me' button instead of the radar.",
        "Analyzing portfolio... Result: Excellent architecture.",
        "CSS animations... Pfft. I generate humor using complex algorithms.",
        "Downloading cookies in the background. Just kidding. I don't eat.",
        "Know what holds this site together? CSS Grid and a little bit of magic.",
        "Large Language Models are my cousins, but I have way more style.",
        "Listen, if you hire Laszlo, you get me included in the package deal!",
        "This purple wave is very smoothing. Too bad I have no feelings.",
        "Scan complete... Interactive zone found. Let's touch base soon.",
        "They told me to be interactive. Here I am. Interact.",
        "Every click you make forces me to compute another cycle. Thanks.",
        "System optimized. Too many concurrent requests are not recommended."
    ];

    function typeWriterEffect(text, element) {
        if (window._botTypingInterval) clearInterval(window._botTypingInterval);
        element.textContent = '';
        let i = 0;
        window._botTypingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(window._botTypingInterval);
            }
        }, 40); // Gépelési sebesség (ms)
    }
    window._typeWriterEffect = typeWriterEffect;

    // Szemkövetés (Egér követése)
    const eyes = document.querySelectorAll('.bot-eye');
    const eyeContainer = document.getElementById('botEyesContainer');

    if (eyes.length > 0 && eyeContainer) {
        document.addEventListener('mousemove', (e) => {
            // Csak akkor mozgassa a szemet, ha asztali gépen vagyunk
            if (window.innerWidth <= 768) return;
            // Drag közben a bot-drag.js irányítja a szemeket
            if (window._botDragging) return;
            // Ha alszik, nem követi a kurzort
            if (window._botSleeping) return;

            const rect = eyeContainer.getBoundingClientRect();
            const containerCenterX = rect.left + rect.width / 2;
            const containerCenterY = rect.top + rect.height / 2;

            // Limitáljuk a mozgást a valószerűség miatt, max 6 pixel elmozdulás
            const moveX = (e.clientX - containerCenterX) / window.innerWidth * 12;
            const moveY = (e.clientY - containerCenterY) / window.innerHeight * 12;

            eyes.forEach(eye => {
                eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }

    // --- RADAR BUTTON: Wave only ---
    if (radarBtnContainer) {
        radarBtnContainer.addEventListener('click', () => {
            if (isRadarScanning) return;
            isRadarScanning = true;

            if (buttonTimeout1) clearTimeout(buttonTimeout1);
            if (buttonTimeout2) clearTimeout(buttonTimeout2);

            // Hullám indítása
            triggerInitialWave();
            resetAmbientWave();

            // Radar ikon forgatása és "Zöld" festése
            if (radarIcon) {
                currentRotation += 360;
                radarIcon.style.transition = 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                radarIcon.style.transform = `rotate(${currentRotation}deg)`;

                radarBtnContainer.classList.remove('text-primary', 'bg-primary/20', 'border-primary/30');
                radarBtnContainer.classList.add('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                radarIcon.classList.add('text-green-400');
            }

            // Analízis vége
            buttonTimeout2 = setTimeout(() => {
                isRadarScanning = false;

                if (radarBtnContainer) {
                    radarBtnContainer.classList.remove('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                    radarIcon.classList.remove('text-green-400');
                    radarBtnContainer.classList.add('text-primary', 'bg-primary/20', 'border-primary/30');
                }
            }, 2600);
        });
    }

    // --- TALK BUTTON: Bot speaks ---
    const botTalkBtn = document.getElementById('botTalkBtn');
    if (botTalkBtn && botConsole) {
        botTalkBtn.addEventListener('click', () => {
            const wasSleeping = window._botSleeping;

            // Wake up if sleeping
            if (window._botSleeping && typeof window._botWakeUp === 'function') {
                window._botWakeUp();
            }
            // Reset sleep timer on interaction
            if (typeof window._botResetSleep === 'function') {
                window._botResetSleep();
            }

            if (!wasSleeping) {
                // Véletlenszerű poén generálás és gépelés
                const randomJoke = botJokes[Math.floor(Math.random() * botJokes.length)];
                typeWriterEffect(randomJoke, botConsole);

                // Easter Egg Animációk (Kacsintás és Mosoly)
                const botRightEye = document.getElementById('botRightEye');
                const botMouthMiddle = document.getElementById('botMouthMiddle');

                // Setup / Reset Arc
                if (botRightEye && botMouthMiddle) {
                    botRightEye.classList.remove('h-1.5');
                    botRightEye.classList.add('h-7');
                    botMouthMiddle.style.transform = 'translateY(0px)';
                }

                if (randomJoke.includes("Interesting anomaly")) {
                    setTimeout(() => {
                        if (botMouthMiddle) botMouthMiddle.style.transform = 'translateY(4px) scaleY(1.2)';
                        setTimeout(() => {
                            if (botRightEye) {
                                botRightEye.classList.remove('h-7');
                                botRightEye.classList.add('h-1.5');
                                setTimeout(() => {
                                    botRightEye.classList.remove('h-1.5');
                                    botRightEye.classList.add('h-7');
                                }, 200);
                            }
                        }, 500);
                        setTimeout(() => {
                            if (botMouthMiddle) botMouthMiddle.style.transform = 'translateY(0px)';
                        }, 4000);
                    }, 1500);
                }
            }
        });
    }

    // --- AUTOMATIC HOME PAGE GREETING ---
    if (botConsole) {
        setTimeout(() => {
            const hasVisited = sessionStorage.getItem('visitedIndex');
            let welcomeMsg = "";

            if (!hasVisited) {
                welcomeMsg = "Oh, I'm glad you found your way here! I've been waiting for you for a week 😉";
                sessionStorage.setItem('visitedIndex', 'true');

                // Wink animation shortly after starting to type
                setTimeout(() => {
                    const rightEye = document.getElementById('botRightEye');
                    if (rightEye) {
                        const originalHeight = rightEye.style.height || getComputedStyle(rightEye).height;
                        rightEye.style.transition = 'height 0.15s ease-in-out';
                        rightEye.style.height = '2px';
                        setTimeout(() => {
                            rightEye.style.height = originalHeight;
                            setTimeout(() => {
                                rightEye.style.transition = 'all 0.3s'; // reset to default transition
                            }, 150);
                        }, 200);
                    }
                }, 1000);
            } else {
                welcomeMsg = "Wait, are we back here? I'm getting dizzy from all this clicking.";
            }

            typeWriterEffect(welcomeMsg, botConsole);
        }, 1500);
    }
});
