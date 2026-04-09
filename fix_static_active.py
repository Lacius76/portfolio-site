import glob
import os

# Map: filename → which href should be "active" (the link in the dropdown that is this page)
page_active = {
    'case-study-ewa.html': 'case-study-ewa.html',
    'case-study-styleguide.html': 'case-study-styleguide.html',
    'case-study-shadow.html': 'case-study-shadow.html',
    'case-study-siemens.html': 'case-study-siemens.html',
    'case-study-greent.html': 'case-study-greent.html',
    'case-study-amatic.html': 'case-study-amatic.html',
    'case-study-funworld.html': 'case-study-funworld.html',
}

# The base class string that all dropdown links share
base_classes = 'mobile-work-link py-3 px-4 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors'
active_style = 'font-size: 1.25rem; font-weight: 700; background-color: rgba(255,255,255,0.08);'

for fname, active_href in page_active.items():
    if not os.path.exists(fname):
        continue

    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the specific anchor for THIS page's active link and add inline style to it
    # The link looks like: <a href="case-study-funworld.html"\n                class="mobile-work-link ...">
    # We need to add style="..." to ONLY the matching link

    # Build search/replace for this specific active link
    old_link = f'href="{active_href}"\n                class="{base_classes}"'
    new_link = f'href="{active_href}"\n                style="{active_style}"\n                class="{base_classes}"'

    if old_link in content:
        new_content = content.replace(old_link, new_link)
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Static active style applied to {active_href} in {fname}")
    else:
        print(f"WARNING: Could not find link pattern in {fname}")

print("Done.")
