import glob

target_content = """                menuBtn.addEventListener('click', () => {
                    mobileMenu.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    if (workDropdown) {
                        workDropdown.style.maxHeight = '0px';
                        workChevron.style.transform = 'rotate(0deg)';
                        toggleWorkStyles(false);
                    }
                });"""

replacement_content = """                menuBtn.addEventListener('click', () => {
                    mobileMenu.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    if (workDropdown) {
                        if (window.location.pathname.includes('case-study-')) {
                            setTimeout(() => {
                                workDropdown.style.maxHeight = workDropdown.scrollHeight + 'px';
                                workChevron.style.transform = 'rotate(180deg)';
                                toggleWorkStyles(true);
                            }, 50);
                        } else {
                            workDropdown.style.maxHeight = '0px';
                            workChevron.style.transform = 'rotate(0deg)';
                            toggleWorkStyles(false);
                        }
                    }
                });"""

count = 0
for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if target_content in content:
        new_content = content.replace(target_content, replacement_content)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {f}")
        count += 1
    else:
        # try formatting fallback
        pass

print(f"Done. Updated {count} files.")
