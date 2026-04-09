import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# 1. HTML
html_match = re.search(r'(<div id="mobile-menu"[^>]*>.*\n(?:.*\n)*?)\s*<main', index_content)
mobile_menu_html = html_match.group(1).rstrip() + '\n'

# 2. JS
js_match = re.search(r'(// Mobile Menu Control.*?\}\n\s*\}\);)\n', index_content, re.DOTALL)
if not js_match:
    print("Could not extract JS from index.html")
    exit(1)
mobile_menu_js = js_match.group(1)

# 3. CSS
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

html_files = [f for f in os.listdir('.') if f.endswith('.html') and f != 'index.html']

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. HTML Replace
    if '<div id="mobile-menu"' in content:
        content = re.sub(r'<div id="mobile-menu"[^>]*>.*?(?=\s*<main)', mobile_menu_html, content, flags=re.DOTALL)
        
    # 2. JS Replace
    if '// Mobile Menu Control' in content:
        content = re.sub(r'// Mobile Menu Control.*?(?=\n\s*</script>)', mobile_menu_js, content, flags=re.DOTALL)
        
    # 3. CSS Provide
    # We want to insert into the <style> that is located in the <head>.
    # Find the first </style>
    if '#mobile-work-wrapper' not in content:
        content = content.replace('</style>', css_content, 1) # Only replace the first occurrence!
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Files updated safely.")
