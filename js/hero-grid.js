document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('hgGrid');
    const replayBtn = document.getElementById('hgReplayBtn');

    if (!gridElement || !replayBtn) return;

    const size = 10;
    const cubes = [];
    let isWaving = false;
    let waveInterval = null;

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
        if (waveInterval) clearInterval(waveInterval);
    }

    function triggerInitialWave(isAmbient = false) {
        stopWave(); // Előző megállítása, ha futna
        clearAllClasses();
        isWaving = true;

        const maxDiagonal = (size - 1) * 2;
        let currentStep = 0;

        const peakClass = isAmbient ? 'hg-ambient-wave' : 'hg-wave-peak';
        const trailClass = isAmbient ? 'hg-ambient-wave-trail' : 'hg-wave-trail';
        const speed = isAmbient ? 120 : 150; // Ambient picit gyorsabb, mert nem mozog a térben

        waveInterval = setInterval(() => {
            if (!isWaving || currentStep > maxDiagonal + 3) {
                clearInterval(waveInterval);
                if (isWaving) clearAllClasses();
                isWaving = false;
                return;
            }

            clearAllClasses(peakClass, trailClass);

            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const diagonalIndex = (size - 1 - r) + c;

                    if (diagonalIndex === currentStep) {
                        cubes[r][c].classList.add(peakClass);
                    } else if (diagonalIndex === currentStep - 1) {
                        cubes[r][c].classList.add(trailClass);
                    }
                }
            }
            currentStep++;
        }, speed);
    }

    function updateGrid(row, col, isActive) {
        clearAllClasses();
        if (!isActive) return;

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = row + dr;
                const nc = col + dc;

                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (dr === 0 && dc === 0) {
                        cubes[nr][nc].classList.add('hg-active-main');
                    } else {
                        cubes[nr][nc].classList.add('hg-active-neighbor');
                    }
                }
            }
        }
    }

    function clearAllClasses(class1, class2) {
        const classesToRemove = ['hg-active-main', 'hg-active-neighbor', 'hg-wave-peak', 'hg-wave-trail', 'hg-ambient-wave', 'hg-ambient-wave-trail'];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (class1) {
                    cubes[r][c].classList.remove(class1);
                    if (class2) cubes[r][c].classList.remove(class2);
                } else {
                    cubes[r][c].classList.remove(...classesToRemove);
                }
            }
        }
    }

    replayBtn.addEventListener('click', () => {
        triggerInitialWave();
        resetAmbientWave(); // Gombnyomásra is újraindul a számláló
    });

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
});
