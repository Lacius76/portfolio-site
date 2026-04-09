import glob
import re

mobile_menu_html = """<div id="mobile-menu"
      class="hidden fixed inset-0 z-[110] bg-white dark:bg-[#101922] flex flex-col items-center justify-center gap-8">
      <button id="close-menu" class="absolute top-6 right-6 text-slate-900 dark:text-white"><span
          class="material-symbols-outlined text-4xl">close</span></button>
      <nav class="flex flex-col items-center gap-6 text-2xl font-bold w-full">

        <!-- Work dropdown -->
        <div id="mobile-work-wrapper" class="w-full flex flex-col items-center transition-colors duration-300">
          <div id="mobile-work-header"
            class="flex items-center justify-center w-full gap-1 transition-all duration-300">
            <a href="work.html" id="mobile-work-link"
              class="text-slate-900 dark:text-white hover:text-primary transition-colors text-2xl font-bold"
              data-i18n="nav.work">Work</a>
            <button id="mobile-work-toggle"
              class="flex items-center justify-center w-8 h-8 text-slate-900 dark:text-white hover:text-primary transition-colors"
              aria-label="Toggle case studies">
              <span id="mobile-work-chevron"
                class="material-symbols-outlined text-[22px] transition-transform duration-300">expand_more</span>
            </button>
          </div>
          <div id="mobile-work-dropdown" class="overflow-hidden transition-all duration-400 ease-in-out w-full"
            style="max-height: 0px;">
            <div id="mobile-work-dropdown-content"
              class="flex flex-col gap-1 text-base font-medium text-center transition-colors duration-300 py-4">
              <a href="case-study-ewa.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                eWa App</a>
              <a href="case-study-styleguide.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Project Antigravity</a>
              <a href="case-study-shadow.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Shadow Cartels</a>
              <a href="case-study-siemens.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Siemens</a>
              <a href="case-study-greent.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Greentube</a>
              <a href="case-study-amatic.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Amatic</a>
              <a href="case-study-funworld.html"
                class="mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Funworld</a>
            </div>
          </div>
        </div>

        <a href="about-me.html" class="text-slate-900 dark:text-white hover:text-primary transition-colors"
          data-i18n="nav.about">About</a>
        <a href="resume.html" class="text-slate-900 dark:text-white hover:text-primary transition-colors"
          data-i18n="nav.resume">Resume</a>
        <a href="contact.html" class="btn-sweep-primary px-8 py-3 rounded-xl" data-i18n="nav.letsTalk">Let's Talk</a>
      </nav>
    </div>

"""

mobile_menu_js = """// Mobile Menu Control
      document.addEventListener("DOMContentLoaded", () => {
        const menuBtn = document.getElementById('menu-button');
        const closeBtn = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const workToggle = document.getElementById('mobile-work-toggle');
        const workDropdown = document.getElementById('mobile-work-dropdown');
        const workChevron = document.getElementById('mobile-work-chevron');

        function toggleWorkStyles(isOpen) {
          const wrapper = document.getElementById('mobile-work-wrapper');
          if (wrapper) {
            wrapper.classList.toggle('is-active', isOpen);
          }
        }

        function closeMobileMenu() {
          mobileMenu.classList.add('hidden');
          document.body.style.overflow = 'auto';
          // reset dropdown
          if (workDropdown) {
            workDropdown.style.maxHeight = '0px';
            workChevron.style.transform = 'rotate(0deg)';
            toggleWorkStyles(false);
          }
        }

        if (menuBtn && closeBtn && mobileMenu) {
          menuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (workDropdown) {
              workDropdown.style.maxHeight = '0px';
              workChevron.style.transform = 'rotate(0deg)';
              toggleWorkStyles(false);
            }
          });

          closeBtn.addEventListener('click', closeMobileMenu);

          // Work dropdown toggle
          if (workToggle && workDropdown) {
            workToggle.addEventListener('click', () => {
              const isOpen = workDropdown.style.maxHeight && workDropdown.style.maxHeight !== '0px';
              if (isOpen) {
                workDropdown.style.maxHeight = '0px';
                workChevron.style.transform = 'rotate(0deg)';
                toggleWorkStyles(false);
              } else {
                workDropdown.style.maxHeight = workDropdown.scrollHeight + 'px';
                workChevron.style.transform = 'rotate(180deg)';
                toggleWorkStyles(true);
              }
            });
          }

          // Close menu on any nav link click
          mobileMenu.querySelectorAll('a').forEach(link => {
            if(link.id !== 'mobile-work-link') {
              link.addEventListener('click', closeMobileMenu);
            }
          });
        }
      });"""

css_content = """
    #mobile-work-wrapper.is-active #mobile-work-header {
      background-color: #4f46e5;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
    }
    #mobile-work-wrapper.is-active #mobile-work-link,
    #mobile-work-wrapper.is-active #mobile-work-toggle,
    #mobile-work-wrapper.is-active #mobile-work-toggle span {
      color: #ffffff !important;
    }
    #mobile-work-wrapper.is-active #mobile-work-dropdown-content {
      background-color: #818cf8;
    }
    .dark #mobile-work-wrapper.is-active #mobile-work-dropdown-content {
      background-color: #5c54f9;
    }
    #mobile-work-wrapper.is-active .mobile-work-link {
      color: #ffffff !important;
    }
    #mobile-work-wrapper.is-active .mobile-work-link:hover {
      background-color: rgba(255, 255, 255, 0.15) !important;
    }
</style>"""

html_files = glob.glob("*.html")
for f in html_files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()

    # 1. HTML Replace
    if '<div id="mobile-menu"' in content:
        content = re.sub(r'<div id="mobile-menu"[^>]*>.*?(?=\s*<main)', mobile_menu_html, content, flags=re.DOTALL)
        
    # 2. JS Replace
    if '// Mobile Menu Control' in content:
        # We find from // Mobile Menu Control up to the script closing or the next //
        content = re.sub(r'// Mobile Menu Control.*?(?=\n\s*</script>|\n\s*// footer|\n\s*// Optional|\n\s*// Footer)', mobile_menu_js, content, flags=re.DOTALL)
        # There might be remaining orphaned `});` or old Optional blocks depending on the regex. 
        # So instead of regex, let's match `<script>\n      // Mobile Menu Control.*?</script>`
        content = re.sub(r'<script>\s*// Mobile Menu Control.*?</script>', f'<script>\n      {mobile_menu_js}\n    </script>', content, flags=re.DOTALL)

    # 3. CSS Provide
    if '#mobile-work-wrapper.is-active' not in content:
        content = content.replace('</style>', css_content, 1)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print(f"Propagated correctly all across {len(html_files)} files.")
