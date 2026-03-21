document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".stacked-cards-section");
    const container = document.querySelector(".cards-container");
    const tracker = document.querySelector(".scroll-tracker");

    if (!section || !container || !tracker) return;

    const cards = Array.from(container.querySelectorAll(".stacked-card"));
    const cardCount = cards.length;
    if (!cardCount) return;

    const totalSteps = cardCount - 1;

    // ─── LERP (Linear interpolation) ─────────────────────────────────
    // Adaptive lerp: gentle at small deltas (slow scroll),
    // aggressive at large deltas (fast scroll) so animation keeps up.
    const LERP_MIN = 0.08;  // gentle for slow scroll
    const LERP_MAX = 0.25;  // snappy for fast scroll
    function lerp(current, target, _unused) {
        const delta = Math.abs(target - current);
        // Ramp factor: small delta → LERP_MIN, large delta → LERP_MAX
        const factor = LERP_MIN + Math.min(delta / 50, 1) * (LERP_MAX - LERP_MIN);
        return current + (target - current) * factor;
    }

    // Per-card animated state — we interpolate THESE toward target values
    const state = cards.map(() => ({
        ty: 0, scale: 1, brightness: 1, opacity: 1, zIndex: 3
    }));

    // ─── Scroll progress ─────────────────────────────────────────────
    function getProgress() {
        const trackerRect = tracker.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // The sticky container starts when tracker.top is at windowHeight.
        // It ends when tracker.bottom is at windowHeight (tracker.top is windowHeight - tracker.offsetHeight).
        let progress = (windowHeight - trackerRect.top) / tracker.offsetHeight;
        return Math.max(0, Math.min(1, progress));
    }

    // ─── Compute TARGET values for each card ─────────────────────────
    function computeTargets(progress) {
        const vh = window.innerHeight;
        const targets = [];
        
        // We dynamically assign hold durations so the first and last cards 
        // have shorter holds *inside* the tracker because they gain organic hold time 
        // before and after the tracker pins. Middle cards get longer holds.
        const transitionDuration = 0.20; 
        const totalTransitions = Math.max(0, cardCount - 1);
        const remainingForHolds = Math.max(0, 1.0 - (totalTransitions * transitionDuration));
        
        // Middle cards get 2x the hold time of the first/last cards
        const middleCards = Math.max(0, cardCount - 2);
        const holdUnits = 2 + (middleCards * 2);
        const unitSize = remainingForHolds / holdUnits;
        const shortHold = unitSize;
        const longHold = unitSize * 2;

        const phases = [];
        let cursor = 0;
        
        for (let i = 0; i < cardCount; i++) {
            const isFirst = (i === 0);
            const isLast = (i === cardCount - 1);
            const holdDuration = (isFirst || isLast) ? shortHold : longHold;
            
            phases.push({
                holdStart: cursor,
                holdEnd: cursor + holdDuration
            });
            
            cursor += holdDuration + transitionDuration;
        }

        cards.forEach((card, index) => {
            const holdStart = phases[index].holdStart;
            const holdEnd = phases[index].holdEnd;
            
            const riseStart = index === 0 ? 0 : phases[index - 1].holdEnd;
            const riseEnd = holdStart;
            
            const exitStart = holdEnd;
            const exitEnd = index === cardCount - 1 ? 1.0 : phases[index + 1].holdStart;

            let ty, scale, opacity, zIndex, brightness;

            if (progress < holdStart) {
                // 1. RISING: Card is coming from below toward the center
                const diffRange = riseEnd - riseStart;
                let localProgress = 1;
                if (diffRange > 0) {
                    localProgress = Math.max(0, (progress - riseStart) / diffRange); 
                }
                const diff = localProgress - 1; // Approaches 0 as we enter hold phase
                
                const yOffsetVh = Math.abs(diff) * 100;
                ty = (yOffsetVh / 100) * vh; 
                scale = 1;
                opacity = 1;
                brightness = 1;
            } 
            else if (progress <= holdEnd) {
                // 2. HOLD PHASE: Card is perfectly active/focused (Plateau)
                ty = 0;
                scale = 1;
                opacity = 1;
                brightness = 1;
            } 
            else {
                // 3. EXITING: Card is scaling/fading away into the background
                const diffRange = exitEnd - exitStart;
                let localProgress = 0;
                if (diffRange > 0) {
                    localProgress = Math.min(1, (progress - exitStart) / diffRange); 
                }
                
                scale = 1 - (localProgress * 0.25); 
                // Fade out twice as fast so the card below is revealed instantly
                opacity = 1 - (localProgress * 4.0);
                ty = -localProgress * 40; 
                brightness = 1 - (localProgress * 0.5); 
            }

            zIndex = cardCount - index;

            targets.push({ 
                ty, 
                scale: Math.max(0.7, scale), 
                brightness: Math.max(0.4, brightness), 
                opacity: Math.max(0, opacity), 
                zIndex 
            });
        });

        return targets;
    }

    // ─── Footer Link Toggle ──────────────────────────────────────────
    const scrollDownIndicator = document.getElementById("scroll-down-indicator");
    const viewAllProjectsLink = document.getElementById("view-all-projects-link");

    // ─── Animation loop ──────────────────────────────────────────────
    let animating = false;

    function animate() {
        const progress = getProgress();
        const targets = computeTargets(progress);
        let needsUpdate = false;

        // Toggle links based on progress (0.6 is where we transition to the last card)
        // Using opacity instead of hidden to prevent layout shifts
        if (progress < 0.6) {
            scrollDownIndicator?.classList.remove("opacity-0");
            scrollDownIndicator?.classList.add("opacity-60");
            viewAllProjectsLink?.classList.add("opacity-0", "pointer-events-none");
            viewAllProjectsLink?.classList.remove("pointer-events-auto");
        } else {
            scrollDownIndicator?.classList.add("opacity-0");
            scrollDownIndicator?.classList.remove("opacity-60");
            viewAllProjectsLink?.classList.remove("opacity-0", "pointer-events-none");
            viewAllProjectsLink?.classList.add("pointer-events-auto");
        }

        cards.forEach((card, i) => {
            const t = targets[i];
            const s = state[i];

            // Lerp continuous values toward targets
            s.ty = lerp(s.ty, t.ty, null);
            s.scale = lerp(s.scale, t.scale, null);
            s.brightness = lerp(s.brightness, t.brightness, null);
            s.opacity = lerp(s.opacity, t.opacity, null);

            // z-index snaps immediately (no lerp — must be integer)
            s.zIndex = t.zIndex;

            // Apply styles
            card.style.transform = `translateY(${s.ty.toFixed(2)}px) scale(${s.scale.toFixed(4)})`;
            card.style.filter = `brightness(${s.brightness.toFixed(3)})`;
            card.style.opacity = s.opacity.toFixed(3);
            card.style.zIndex = s.zIndex;

            // Check if we're still moving (threshold for floating point)
            if (Math.abs(s.ty - t.ty) > 0.1 ||
                Math.abs(s.scale - t.scale) > 0.001 ||
                Math.abs(s.brightness - t.brightness) > 0.005 ||
                Math.abs(s.opacity - t.opacity) > 0.005) {
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            requestAnimationFrame(animate);
        } else {
            animating = false;
        }
    }

    function startAnimation() {
        if (!animating) {
            animating = true;
            requestAnimationFrame(animate);
        }
    }

    // ─── Initial paint: snap to correct positions immediately ────────
    const initialTargets = computeTargets(getProgress());
    cards.forEach((card, i) => {
        const t = initialTargets[i];
        state[i] = { ...t };
        card.style.transform = `translateY(${t.ty}px) scale(${t.scale})`;
        card.style.filter = `brightness(${t.brightness})`;
        card.style.opacity = t.opacity;
        card.style.zIndex = t.zIndex;
    });

    // ─── Event listeners ─────────────────────────────────────────────
    window.addEventListener("scroll", startAnimation, { passive: true });
    window.addEventListener("resize", () => {
        // On resize, snap immediately then start animating
        const targets = computeTargets(getProgress());
        cards.forEach((card, i) => {
            state[i] = { ...targets[i] };
            card.style.transform = `translateY(${targets[i].ty}px) scale(${targets[i].scale})`;
            card.style.filter = `brightness(${targets[i].brightness})`;
            card.style.opacity = targets[i].opacity;
            card.style.zIndex = targets[i].zIndex;
        });
    });
});
