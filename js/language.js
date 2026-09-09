// Language Switching System with JSON Translations
// Supports stacked circular EN/DE control (#lang-stack) and legacy dropdown markup.
let translations = {};
let currentLang = "en";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("translations.json");
    translations = await response.json();
  } catch (error) {
    console.error("Failed to load translations:", error);
    return;
  }

  currentLang = localStorage.getItem("preferred-language") || "en";
  applyLanguage(currentLang, false);
  syncLangStackUI(currentLang);
  wireLanguageControls();

  function wireLanguageControls() {
    const stacks = document.querySelectorAll(".lang-stack");
    stacks.forEach((stack) => {
      const primaryBtn = stack.querySelector(".lang-stack-primary");
      const panel = stack.querySelector(".lang-stack-panel");
      if (!primaryBtn || !panel) return;

      primaryBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !stack.classList.contains("is-open");
        closeAllLangStacks();
        if (willOpen) {
          stack.classList.add("is-open");
          primaryBtn.setAttribute("aria-expanded", "true");
        }
      });

      panel.querySelectorAll("[data-lang]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const lang = el.getAttribute("data-lang");
          if (lang && lang !== currentLang) {
            switchLanguage(lang);
          }
          closeAllLangStacks();
        });
      });
    });

    // Legacy icon dropdown (pages not yet migrated)
    const legacyBtn = document.getElementById("language-btn");
    const legacyDropdown = document.getElementById("language-dropdown");
    const inStack = legacyBtn && legacyBtn.closest(".lang-stack");
    if (legacyBtn && legacyDropdown && !inStack) {
      const languageIcon = legacyBtn.querySelector("img");
      legacyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        legacyDropdown.classList.toggle("hidden");
      });
      legacyDropdown.querySelectorAll("[data-lang]").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const lang = link.getAttribute("data-lang");
          if (lang && lang !== currentLang) switchLanguage(lang);
          legacyDropdown.classList.add("hidden");
        });
      });
      // keep flip animation hook available
      legacyBtn._languageIcon = languageIcon;
    }

    document.addEventListener("click", () => {
      closeAllLangStacks();
      if (legacyDropdown && !inStack) legacyDropdown.classList.add("hidden");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllLangStacks();
        if (legacyDropdown && !inStack) legacyDropdown.classList.add("hidden");
      }
    });
  }

  function closeAllLangStacks() {
    document.querySelectorAll(".lang-stack.is-open").forEach((stack) => {
      stack.classList.remove("is-open");
      const btn = stack.querySelector(".lang-stack-primary");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function syncLangStackUI(lang) {
    const other = lang === "de" ? "en" : "de";
    document.querySelectorAll(".lang-stack").forEach((stack) => {
      const currentLabel = stack.querySelector(".lang-stack-current");
      const secondary = stack.querySelector(".lang-stack-secondary");
      if (currentLabel) currentLabel.textContent = lang.toUpperCase();
      if (secondary) {
        secondary.setAttribute("data-lang", other);
        secondary.textContent = other.toUpperCase();
      }
    });
  }

  function switchLanguage(newLang) {
    applyLanguage(newLang, true);
    currentLang = newLang;
    localStorage.setItem("preferred-language", newLang);
    syncLangStackUI(newLang);
  }

  function applyLanguage(lang, animate = false) {
    const elementsToTranslate = document.querySelectorAll("[data-i18n]");
    const body = document.body;
    document.documentElement.setAttribute("lang", lang);

    if (animate) {
      body.classList.add("lang-fade-out");
      setTimeout(() => {
        translateElements(elementsToTranslate, lang);
        updatePDFLinks(lang);
        document.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
        body.classList.remove("lang-fade-out");
      }, 500);
    } else {
      translateElements(elementsToTranslate, lang);
      updatePDFLinks(lang);
      document.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
    }
  }

  function getTranslation(key, lang) {
    const keys = key.split(".");
    let translation = translations[lang];
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return null;
      }
    }
    return typeof translation === "string" ? translation : null;
  }

  function translateElements(elements, lang) {
    elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) return;
      const translation = getTranslation(key, lang);
      if (translation === null) {
        console.warn(`Translation key not found: ${key} for language: ${lang}`);
        return;
      }
      if (element.hasAttribute("data-i18n-html") || /\<[a-z][\s\S]*\>|&[a-z]+;/i.test(translation)) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const value = getTranslation(element.getAttribute("data-i18n-aria-label"), lang);
      if (value) element.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const value = getTranslation(element.getAttribute("data-i18n-title"), lang);
      if (value) element.setAttribute("title", value);
    });
  }

  function updatePDFLinks(lang) {
    const cvLinks = document.querySelectorAll('a[href*="cv"], a[href*="CV"], a[download*="cv"]');
    cvLinks.forEach((link) => {
      const currentHref = link.getAttribute("href");
      if (currentHref && currentHref.includes(".pdf")) {
        link.setAttribute(
          "href",
          lang === "de" ? "img/laszlo_foeldvary_cv_DE.pdf" : "img/laszlo_foeldvary_cv_EN.pdf"
        );
      }
    });

    const portfolioLinks = document.querySelectorAll('a[href*="portfolio"], a[download*="portfolio"]');
    portfolioLinks.forEach((link) => {
      const currentHref = link.getAttribute("href");
      if (currentHref && currentHref.includes(".pdf")) {
        link.setAttribute(
          "href",
          lang === "de" ? "img/laszlo_foeldvary_portfolio_DE.pdf" : "img/laszlo_foeldvary_portfolio_EN.pdf"
        );
      }
    });
  }
});
