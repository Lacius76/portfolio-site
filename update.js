const fs = require('fs');
const path = require('path');

const targetReplacement = `        <div class="flex items-center gap-4">
          <div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
            <a href="contact.html"
              class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors nav-anim-contact"
              aria-label="Contact">
              <img src="img/contact-icon.svg" alt="Contact" class="size-6" />
            </a>
            <span
              class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl"
              data-i18n="nav.contactMeTooltip">Contact Me</span>
          </div>
          <!-- Language Dropdown -->
          <div class="relative nav-anim-lang">
            <div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
              <button id="language-btn"
                class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <img src="img/language-icon.svg" alt="Select Language" class="size-6" />
              </button>
              <span
                class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl"
                data-i18n="nav.switchLanguage">Switch Language</span>
            </div>
            <!-- Dropdown Menu -->
            <div id="language-dropdown"
              class="hidden absolute right-0 mt-2 w-30 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 origin-top-right transition-all transform">
              <div class="py-1">
                <a href="#" data-lang="en"
                  class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span class="text-lg">🇬🇧</span> English
                </a>
                <a href="#" data-lang="de"
                  class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700/50">
                  <span class="text-lg">🇩🇪</span> Deutsch
                </a>
              </div>
            </div>
          </div>
          <div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
            <button id="theme-toggle" class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#111418] dark:text-white nav-anim-theme theme__icon">
              <span></span>
              <span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span></span>
            </button>
            <span
              class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl"
              data-i18n="nav.toggleTheme">Toggle Theme</span>
          </div>
          <button id="menu-button"
            class="md:hidden flex items-center justify-center p-2 text-slate-900 dark:text-white">
            <span class="material-symbols-outlined text-[28px]">menu</span>
          </button>
        </div>`;

const files = fs.readdirSync('.')
  .filter(f => f.endsWith('.html') && !['index.html', 'about-me.html', 'work.html'].includes(f));

// Match from <div class="flex items-center gap-4"> up to the closing div AFTER <button id="menu-button"...</button>
const regex = /<div class="flex items-center gap-4">[\s\S]*?<button id="menu-button"[\s\S]*?<\/button>\s*<\/div>/m;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    const updatedContent = content.replace(regex, targetReplacement);
    fs.writeFileSync(file, updatedContent, 'utf8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Pattern not found in: ${file}`);
  }
}
