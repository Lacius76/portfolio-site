document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('hgGrid');
    const replayBtn = document.getElementById('hgReplayBtn');

    if (!gridElement || !replayBtn) return;

    const size = 10;
    const cubes = [];
    let isWaving = false;
    let waveTimeouts = []; // Tömb az összes aktív setTimeout tárolására
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

            // PERFORMANCE OPTIMIZATION: Csak asztali/nagyobb kijelzőkön (képernyő szélesség > 768px) engedjük futni
            // a roppant matematika-igényes "100 szomszéd kockát megemelő" hover animációkat.
            // Mobilon ezeket a böngésző a scroll-lal (görgetéssel) próbálná felváltva számolni, amitől laggol a telefon.
            container.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768) {
                    stopWave();
                    updateGrid(r, c, true);
                }
            });
            container.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) {
                    updateGrid(r, c, false);
                }
            });
        }
    }

    function stopWave() {
        isWaving = false;
        // Az összes épp futó setTimeout-ot (kockánkéntit) kilőjük
        waveTimeouts.forEach(id => clearTimeout(id));
        waveTimeouts = [];
        if (waveResetTimeout) clearTimeout(waveResetTimeout);
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
        clearAllClasses();
        if (!isActive) return;

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = row + dr;
                const nc = col + dc;

                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    cubes[nr][nc].classList.remove('hg-falling-main'); // Ha ráhúzzuk újra mielőtt leesne, szakítsa meg a zuhanást

                    if (dr === 0 && dc === 0) {
                        cubes[nr][nc].classList.add('hg-active-main');
                    } else {
                        // Random magasság beállítása a szomszédoknak: 15px és 55px között (kisebb mint a fő 70px)
                        const randomHeight = Math.floor(Math.random() * 40) + 15;
                        cubes[nr][nc].style.setProperty('--hg-height-neighbor', `${randomHeight}px`);
                        cubes[nr][nc].classList.add('hg-active-neighbor');
                    }
                }
            }
        }
    }

    function clearAllClasses(class1) {
        const classesToRemove = ['hg-active-main', 'hg-active-neighbor', 'hg-wave-peak', 'hg-ambient-wave'];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {

                // HA épp lereseteljük a hovert (nem egyedi class1 pl hullám miatt), indítsuk a zuhanást egy explicit class-szal
                if (!class1 && cubes[r][c].classList.contains('hg-active-main')) {
                    cubes[r][c].classList.add('hg-falling-main');
                    // Töröljük a zuhanó osztályt idővel, hogy ne ragadjon be
                    setTimeout((cube) => {
                        cube.classList.remove('hg-falling-main');
                    }, 1500, cubes[r][c]);
                }

                cubes[r][c].style.removeProperty('--hg-wave-delay'); // Reseteljük a delay-t is
                cubes[r][c].style.removeProperty('--hg-height-neighbor'); // Töröljük a random magasságot

                if (class1) {
                    cubes[r][c].classList.remove(class1);
                } else {
                    cubes[r][c].classList.remove(...classesToRemove);
                }
            }
        }
    }

    // Hullám indítása egy kis késleltetéssel (1mp várás után)
    setTimeout(triggerInitialWave, 1000);

    // Automatikus, időnkénti lágy hullámzás beállítása (10 másodpercenként)
    let ambientWaveTimer;
    function resetAmbientWave() {
        if (ambientWaveTimer) clearInterval(ambientWaveTimer);
        ambientWaveTimer = setInterval(() => {
            // Csak akkor indít hullámot automatikusan, ha épp nem állunk az egerünkkel rajta
            let hasActiveCube = false;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (cubes[r][c].classList.contains('hg-active-main')) {
                        hasActiveCube = true;
                    }
                }
            }
            if (!hasActiveCube && !isWaving) {
                triggerInitialWave(true); // Lágy, lapos hullám indítása színnel
            }
        }, 10000); // 10 másodperc
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
    let typingInterval = null;

    const botJokes = [
        "Hey, did you know my 3D grid is just a CSS trick? Even I fell for it.",
        "I see you scrolling... but you still haven't clicked 'Download CV'.",
        "You pressed the radar. Good job. What did it do? Oh, right, it turned green.",
        "Not to brag, but Laci designed this layout in his head back in 1999.",
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
        "Listen, if you hire Laci, you get me included in the package deal!",
        "This purple wave is very smoothing. Too bad I have no feelings.",
        "Scan complete... Interactive zone found. Let's touch base soon.",
        "They told me to be interactive. Here I am. Interact.",
        "Every click you make forces me to compute another cycle. Thanks.",
        "System optimized. Too many concurrent requests are not recommended."
    ];

    function typeWriterEffect(text, element) {
        if (typingInterval) clearInterval(typingInterval);
        element.textContent = '';
        let i = 0;
        typingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, 40); // Gépelési sebesség (ms)
    }

    // Szemkövetés (Egér követése)
    const eyes = document.querySelectorAll('.bot-eye');
    const eyeContainer = document.getElementById('botEyesContainer');

    if (eyes.length > 0 && eyeContainer) {
        document.addEventListener('mousemove', (e) => {
            // Csak akkor mozgassa a szemet, ha asztali gépen vagyunk
            if (window.innerWidth <= 768) return;

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

    if (radarBtnContainer && botConsole && matrixProgress) {
        radarBtnContainer.addEventListener('click', () => {
            // Szigorú megakadályozása az újraindításnak amíg a zöld szkenner fut
            if (isRadarScanning) return;
            isRadarScanning = true;

            // Ha épp futott valami, töröljük
            if (buttonTimeout1) clearTimeout(buttonTimeout1);
            if (buttonTimeout2) clearTimeout(buttonTimeout2);

            // 1) Hullám indítása
            triggerInitialWave();
            resetAmbientWave();

            // 1.5) Gépelős poén generálás
            const randomJoke = botJokes[Math.floor(Math.random() * botJokes.length)];
            typeWriterEffect(randomJoke, botConsole);

            // 1.6) Easter Egg Animációk (Kacsintás és Mosoly)
            const botRightEye = document.getElementById('botRightEye');
            const botMouthMiddle = document.getElementById('botMouthMiddle');

            // Setup / Reset Arc
            if (botRightEye && botMouthMiddle) {
                botRightEye.classList.remove('h-1.5');
                botRightEye.classList.add('h-7');
                botMouthMiddle.style.transform = 'translateY(0px)';
            }

            if (randomJoke.includes("Interesting anomaly")) {
                // Várunk picit amíg a szöveget írja (pl 1.5mp), aztán mosolyog
                setTimeout(() => {
                    if (botMouthMiddle) botMouthMiddle.style.transform = 'translateY(4px) scaleY(1.2)';

                    // Kis késéssel utána (2mp) kacsint egyet
                    setTimeout(() => {
                        if (botRightEye) {
                            botRightEye.classList.remove('h-7');
                            botRightEye.classList.add('h-1.5');

                            // 200ms múlva visszanyitja a szemét
                            setTimeout(() => {
                                botRightEye.classList.remove('h-1.5');
                                botRightEye.classList.add('h-7');
                            }, 200);
                        }
                    }, 500);

                    // A szkennelés végén visszamegy komolyba a mosolyból
                    setTimeout(() => {
                        if (botMouthMiddle) botMouthMiddle.style.transform = 'translateY(0px)';
                    }, 4000);
                }, 1500);
            }

            // 1.8) Radar ikon forgatása és "Zöld" festése
            if (radarIcon) {
                currentRotation += 360;
                radarIcon.style.transition = 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                radarIcon.style.transform = `rotate(${currentRotation}deg)`;

                radarBtnContainer.classList.remove('text-primary', 'bg-primary/20', 'border-primary/30');
                radarBtnContainer.classList.add('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                radarIcon.classList.add('text-green-400');
            }

            // Vissza 0-ra azonnal a progress bar
            matrixProgress.style.transition = 'none';
            matrixProgress.style.width = '0%';
            matrixProgress.classList.replace('bg-emerald-400', 'bg-green-400');

            // Induljon a 100% felé lassan
            buttonTimeout1 = setTimeout(() => {
                matrixProgress.style.transition = 'width 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                matrixProgress.style.width = '100%';
            }, 50);

            // 3) Analízis vége
            buttonTimeout2 = setTimeout(() => {
                isRadarScanning = false;

                // Progress bar szín és dizájn visszaállítása
                matrixProgress.classList.replace('bg-green-400', 'bg-emerald-400');

                if (radarBtnContainer) {
                    radarBtnContainer.classList.remove('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                    radarIcon.classList.remove('text-green-400');
                    radarBtnContainer.classList.add('text-primary', 'bg-primary/20', 'border-primary/30');
                }
            }, 2600);
        });
    }

    // --- AUTOMATIC HOME PAGE GREETING ---
    if (botConsole) {
        setTimeout(() => {
            const welcomeMsg = "Wait, are we back here? I'm getting dizzy from all this clicking.";
            typeWriterEffect(welcomeMsg, botConsole);
        }, 1500);
    }
});
