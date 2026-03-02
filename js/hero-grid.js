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

            container.addEventListener('mouseenter', () => {
                stopWave();
                updateGrid(r, c, true);
            });
            container.addEventListener('mouseleave', () => updateGrid(r, c, false));
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

    // Matrix Analyzer Kártya logika (Progress bar animálása és ikon forgatása)
    const matrixCard = document.getElementById('matrixAnalyzerCard');
    const matrixProgress = document.getElementById('matrixProgressBar');
    const matrixStatusText = document.getElementById('matrixStatusText');
    const radarBtnContainer = document.getElementById('hgReplayBtn');
    const radarIcon = document.querySelector('#hgReplayBtn .material-symbols-outlined');
    let currentRotation = 0;

    let buttonTimeout1;
    let buttonTimeout2;
    let isRadarScanning = false;

    if (matrixCard && matrixProgress && matrixStatusText) {
        matrixCard.addEventListener('click', () => {
            // Szigorú megakadályozása az újraindításnak amíg a zöld szkenner fut
            if (isRadarScanning) return;
            isRadarScanning = true;

            // Ha épp futott valami (pl. beakadt korábbi vizuális cucc), töröljük
            if (buttonTimeout1) clearTimeout(buttonTimeout1);
            if (buttonTimeout2) clearTimeout(buttonTimeout2);

            // 1) Hullám indítása
            triggerInitialWave();
            resetAmbientWave();

            // 1.5) Radar ikon azonnali 360 forgatása és "Radar/Szkenner Zöld" festése
            if (radarIcon && radarBtnContainer) {
                // Forgatás animáció
                currentRotation += 360;
                radarIcon.style.transition = 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                radarIcon.style.transform = `rotate(${currentRotation}deg)`;

                // AZONNALI színcsere zöldre (felülírva minden alap és hover hatást is ideiglenesen)
                radarBtnContainer.classList.remove('text-primary', 'bg-primary/20', 'border-primary/30');
                radarBtnContainer.classList.add('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                radarIcon.classList.add('text-green-400');
            }

            // 2) Progress bar "Analizálás" indítása
            matrixStatusText.textContent = "Analyzing...";
            matrixStatusText.classList.replace('text-primary', 'text-green-400'); // Sárga helyett ez is legyen zöld

            // Vissza 0-ra azonnal
            matrixProgress.style.transition = 'none';
            matrixProgress.style.width = '0%';
            matrixProgress.classList.replace('bg-primary', 'bg-green-400'); // A betöltő csík is zöld lesz erre a 2.5 másodpercre

            // Induljon a 100% felé lassan
            buttonTimeout1 = setTimeout(() => {
                matrixProgress.style.transition = 'width 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                matrixProgress.style.width = '100%';
            }, 50);

            // 3) Analízis vége (kb a wave lefutásával egy időben)
            buttonTimeout2 = setTimeout(() => {
                isRadarScanning = false; // Újra lehet kattintani rajta!
                matrixStatusText.textContent = "Active";
                matrixStatusText.classList.replace('text-green-400', 'text-primary');

                // Progress bar szín vissza
                matrixProgress.classList.replace('bg-green-400', 'bg-primary');

                // Szkenner dizájn visszaállítása kékre
                if (radarBtnContainer) {
                    radarBtnContainer.classList.remove('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                    radarIcon.classList.remove('text-green-400');
                    radarBtnContainer.classList.add('text-primary', 'bg-primary/20', 'border-primary/30');
                }
            }, 2600);
        });
    }

});
