import os
import glob
import re

target_dir = "/Users/laszlofoldvary/laszlofoldvary/projects/portfolio-site"
html_files = glob.glob(os.path.join(target_dir, "*.html"))

for file_path in html_files:
    # skip ones we already know are correct
    if file_path.endswith('index.html') or file_path.endswith('about-me.html') or file_path.endswith('work.html') or file_path.endswith('resume.html') or file_path.endswith('contact.html') or file_path.endswith('success.html'):
        continue

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # 1. Contact Icon
    contact_old = r'''(?:<!--\s*Let's Talk\s*-->\s*)?<a href="contact\.html"\s*class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors nav-anim-contact"\s*aria-label="Contact">\s*<img src="img/contact-icon\.svg" alt="Contact" class="size-6">\s*</a>'''
    contact_new = '''<!-- Let's Talk -->
                    <div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
                        <a href="contact.html"
                            class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors nav-anim-contact"
                            aria-label="Contact">
                            <img src="img/contact-icon.svg" alt="Contact" class="size-6">
                        </a>
                        <span
                            class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl"
                            data-i18n="nav.contactMeTooltip">Contact Me</span>
                    </div>'''
    if re.search(contact_old, content):
        content = re.sub(contact_old, contact_new, content, count=1)

    # 2. Language Button
    lang_btn_old = r'''<button id="language-btn"\s*class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">\s*<img src="img/language-icon\.svg" alt="Select Language" class="size-6">\s*</button>'''
    lang_btn_new = '''<div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
                            <button id="language-btn"
                                class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <img src="img/language-icon.svg" alt="Select Language" class="size-6">
                            </button>
                            <span
                                class="bot-tooltip text-[#303030] dark:text-[#f8fafc] text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap shadow-xl"
                                data-i18n="nav.switchLanguage">Switch Language</span>
                        </div>'''
    if re.search(lang_btn_old, content):
        content = re.sub(lang_btn_old, lang_btn_new, content, count=1)

    # 3. Dark Mode Toggle
    dark_mode_old = r'''<button id="theme-toggle" class="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-\[#111418\] dark:text-white nav-anim-theme theme__icon">\s*<span></span>\s*<span>\s*<span></span>\s*<span></span>\s*<span></span>\s*<span></span>\s*</span>\s*<span></span>\s*</button>'''
    dark_mode_new = '''<div class="bot-tooltip-container bot-tooltip-down relative flex items-center justify-center">
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
                    </div>'''
    if re.search(dark_mode_old, content):
        content = re.sub(dark_mode_old, dark_mode_new, content, count=1)

    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")
