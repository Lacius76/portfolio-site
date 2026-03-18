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
    const LERP_MIN = 0.04;  // gentle for slow scroll
    const LERP_MAX = 0.15;  // snappy for fast scroll
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
        // Calculation matching the user's provided snippet: 0 at start, 1 at end
        let progress = -trackerRect.top / (tracker.offsetHeight - windowHeight);
        return Math.max(0, Math.min(1, progress));
    }

    // ─── Compute TARGET values for each card ─────────────────────────
    function computeTargets(progress) {
        const vh = window.innerHeight;
        const targets = [];
        
        // Total cards: 3. Steps to cycle: C0 focus, T1, C1 focus, T2, C2 focus.
        // Total segments: cardCount + (cardCount - 1) = 5 segments.
        // Each segment is 1/5 = 0.2 (20% of the total 500vh scroll tracker).
        const segmentSize = 1 / (cardCount + (cardCount - 1)); 

        cards.forEach((card, index) => {
            // Define the specific range where this card is "Held" at center (scale 1, ty 0)
            const holdStart = index * (segmentSize * 2); 
            const holdEnd = holdStart + segmentSize;
            
            let ty, scale, opacity, zIndex, brightness;

            if (progress < holdStart) {
                // 1. RISING: Card is coming from below toward the center
                const prevHoldEnd = holdStart - segmentSize;
                const localProgress = Math.max(0, (progress - prevHoldEnd) / segmentSize); 
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
                const diff = (progress - holdEnd) / segmentSize; 
                
                scale = 1 - (diff * 0.25); 
                opacity = 1 - (diff * 1.5);
                ty = -diff * 40; 
                brightness = 1 - (diff * 0.5); 
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

        // Toggle footer link based on progress (0.6 is where we transition to the last card)
        if (progress < 0.6) {
            scrollDownIndicator?.classList.remove("hidden");
            viewAllProjectsLink?.classList.add("hidden");
        } else {
            scrollDownIndicator?.classList.add("hidden");
            viewAllProjectsLink?.classList.remove("hidden");
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
