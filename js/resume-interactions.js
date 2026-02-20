document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.getAttribute('data-width');
                // Small delay to ensure the transition is visible if it happens immediately on load
                setTimeout(() => {
                    bar.style.width = targetWidth;
                }, 100);
                observer.unobserve(bar);
            }
        });
    }, observerOptions);

    const skillBars = document.querySelectorAll('.skill-bar');
    skillBars.forEach(bar => {
        observer.observe(bar);
    });
});
