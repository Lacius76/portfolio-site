document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('hgGrid');
    const replayBtn = document.getElementById('hgReplayBtn');

    if (!gridElement || !replayBtn) return;

    const size = 7; // 8→7: Csökkentett rács a kérésnek megfelelően
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
    // ELTÁVOLÍTVA: Ne legyen automatikus hullám betöltéskor, hogy ne zavarja a felhasználót
    // setTimeout(() => triggerInitialWave(true), 1000);

    // Automatikus, időnkénti lágy hullámzás beállítása (10 másodpercenként)
    // Ez CSAK a lapos színváltó ("ambient") hullám, nem okoz performancia-problémát.

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

    // --- RADAR BUTTON: Wave only ---
    const radarBtnContainer = document.getElementById('hgReplayBtn');
    const radarIcon = document.querySelector('#hgReplayBtn .material-symbols-outlined');
    let isRadarScanning = false;
    let currentRotation = 0;

    if (radarBtnContainer) {
        radarBtnContainer.addEventListener('click', () => {
            if (isRadarScanning) return;
            isRadarScanning = true;

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
            setTimeout(() => {
                isRadarScanning = false;

                if (radarBtnContainer) {
                    radarBtnContainer.classList.remove('text-green-400', 'bg-green-400/20', 'border-green-400/30', 'shadow-[0_0_15px_rgba(74,222,128,0.5)]');
                    radarIcon.classList.remove('text-green-400');
                    radarBtnContainer.classList.add('text-primary', 'bg-primary/20', 'border-primary/30');
                }
            }, 2600);
        });
    }
});
