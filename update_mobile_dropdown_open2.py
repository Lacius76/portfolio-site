import glob
import re

count = 0
for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # regex to find the menuBtn.addEventListener('click', () => { ... toggleWorkStyles(false); } });
    pattern = re.compile(
        r"menuBtn\.addEventListener\('click',\s*\(\)\s*=>\s*\{"
        r"\s*mobileMenu\.classList\.remove\('hidden'\);"
        r"\s*document\.body\.style\.overflow\s*=\s*'hidden';"
        r"\s*if\s*\(workDropdown\)\s*\{"
        r"\s*workDropdown\.style\.maxHeight\s*=\s*'0px';"
        r"\s*workChevron\.style\.transform\s*=\s*'rotate\(0deg\)';"
        r"\s*toggleWorkStyles\(false\);"
        r"\s*\}"
        r"\s*\}\);",
        re.MULTILINE
    )
    
    replacement = """menuBtn.addEventListener('click', () => {
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
    
    new_content, num_subs = pattern.subn(replacement, content)
    
    if num_subs > 0:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {f}")
        count += 1

print(f"Done. Updated {count} files.")
