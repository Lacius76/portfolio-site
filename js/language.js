// Language Switching System with JSON Translations
let translations = {};
let currentLang = 'en';

document.addEventListener('DOMContentLoaded', async () => {
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageIcon = languageBtn?.querySelector('img');

    if (!languageBtn || !languageDropdown) return;

    // Load translations from JSON
    try {
        const response = await fetch('translations.json');
        translations = await response.json();
    } catch (error) {
        console.error('Failed to load translations:', error);
        return;
    }

    // Get current language from localStorage or default to 'en'
    currentLang = localStorage.getItem('preferred-language') || 'en';

    // Apply language on page load
    applyLanguage(currentLang, false);

    // Toggle Dropdown
    languageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        languageDropdown.classList.toggle('hidden');
    });

    // Language selection handlers
    const langLinks = languageDropdown.querySelectorAll('a');
    langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.getAttribute('data-lang');
            if (lang && lang !== currentLang) {
                switchLanguage(lang);
            }
            languageDropdown.classList.add('hidden');
        });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
            languageDropdown.classList.add('hidden');
        }
    });

    // Close when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            languageDropdown.classList.add('hidden');
        }
    });

    function switchLanguage(newLang) {
        // Trigger icon flip animation
        if (languageIcon) {
            languageIcon.classList.add('flip');
            setTimeout(() => languageIcon.classList.remove('flip'), 300);
        }

        // Apply language with fade effect
        applyLanguage(newLang, true);

        // Save preference
        currentLang = newLang;
        localStorage.setItem('preferred-language', newLang);
    }

    function applyLanguage(lang, animate = false) {
        const elementsToTranslate = document.querySelectorAll('[data-i18n]');
        const body = document.body;

        // Update html lang attribute
        document.documentElement.setAttribute('lang', lang);

        if (animate) {
            // Fade out
            body.classList.add('lang-fade-out');

            setTimeout(() => {
                // Swap content
                translateElements(elementsToTranslate, lang);
                updatePDFLinks(lang);

                // Fade in
                body.classList.remove('lang-fade-out');
            }, 200);
        } else {
            // No animation on page load
            translateElements(elementsToTranslate, lang);
            updatePDFLinks(lang);
        }
    }

    function translateElements(elements, lang) {
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!key) return;

            // Navigate through nested object using dot notation
            const keys = key.split('.');
            let translation = translations[lang];

            for (const k of keys) {
                if (translation && translation[k] !== undefined) {
                    translation = translation[k];
                } else {
                    console.warn(`Translation key not found: ${key} for language: ${lang}`);
                    return;
                }
            }

            // Check if element should use innerHTML or textContent
            // If the translation contains HTML tags (e.g. <strong>), use innerHTML automatically
            if (element.hasAttribute('data-i18n-html') || /<[a-z][\s\S]*>/i.test(translation)) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });
    }

    function updatePDFLinks(lang) {
        // Update CV download links
        const cvLinks = document.querySelectorAll('a[href*="cv"], a[href*="CV"], a[download*="cv"]');
        cvLinks.forEach(link => {
            const currentHref = link.getAttribute('href');
            if (currentHref && currentHref.includes('.pdf')) {
                if (lang === 'de') {
                    link.setAttribute('href', 'img/laszlo_foeldvary_cv_DE.pdf');
                } else {
                    link.setAttribute('href', 'img/laszlo_foeldvary_cv_EN.pdf');
                }
            }
        });

        // Update portfolio download links
        const portfolioLinks = document.querySelectorAll('a[href*="portfolio"], a[download*="portfolio"]');
        portfolioLinks.forEach(link => {
            const currentHref = link.getAttribute('href');
            if (currentHref && currentHref.includes('.pdf')) {
                if (lang === 'de') {
                    link.setAttribute('href', 'img/laszlo_foeldvary_portfolio_DE.pdf');
                } else {
                    link.setAttribute('href', 'img/laszlo_foeldvary_portfolio_EN.pdf');
                }
            }
        });
    }
});
