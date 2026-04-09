import glob
import os

# Map each filename to its identifier (same as the href value without .html)
page_map = {
    'case-study-ewa.html': 'case-study-ewa',
    'case-study-styleguide.html': 'case-study-styleguide',
    'case-study-shadow.html': 'case-study-shadow',
    'case-study-siemens.html': 'case-study-siemens',
    'case-study-greent.html': 'case-study-greent',
    'case-study-amatic.html': 'case-study-amatic',
    'case-study-funworld.html': 'case-study-funworld',
    'work.html': 'work',
    'about-me.html': 'about-me',
    'resume.html': 'resume',
    'contact.html': 'contact',
    'index.html': 'index',
    'impressum.html': 'impressum',
    'datenschutz.html': 'datenschutz',
    'success.html': 'success',
}

old_active_block = """        // Active page highlight in mobile dropdown
        let pathParts = window.location.pathname.split('/').filter(Boolean);
        let currentPage = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'index';
        const currentPath = currentPage.replace('.html', '').replace('#', '').split('?')[0];
        const dropdownLinks = document.querySelectorAll('#mobile-work-dropdown-content a');
        dropdownLinks.forEach(link => {
            if (link.getAttribute('href').replace('.html', '') === currentPath) {
                link.classList.remove('text-slate-500', 'dark:text-slate-400');
                // Give it the accent color, a subtle background tint, and bold text
                link.classList.add('font-bold', 'text-xl');
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }
        });"""

for fname, page_id in page_map.items():
    if not os.path.exists(fname):
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_active_block not in content:
        print(f"SKIPPED (block not found): {fname}")
        continue

    new_active_block = f"""        // Active page highlight in mobile dropdown
        const currentPath = '{page_id}';
        const dropdownLinks = document.querySelectorAll('#mobile-work-dropdown-content a');
        dropdownLinks.forEach(link => {{
            if (link.getAttribute('href').replace('.html', '') === currentPath) {{
                link.classList.remove('text-slate-500', 'dark:text-slate-400');
                link.classList.add('font-bold', 'text-xl');
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
        }});"""

    new_content = content.replace(old_active_block, new_active_block)
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Hardcoded page ID '{page_id}' in {fname}")

print("Done.")
