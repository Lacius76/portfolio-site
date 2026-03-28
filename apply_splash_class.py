import glob

html_files = glob.glob('*.html')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to add btn-splash-logo to the logo div.
    # The logo div usually looks like:
    # <div data-icon="logo"
    #   class="flex size-9 items-center justify-center rounded-xl bg-primary text-sky-200 shadow-lg shadow-primary/20 p-1.5">
    
    # Let's find exactly this piece and insert btn-splash-logo
    old_class = 'class="flex size-9 items-center justify-center rounded-xl bg-primary text-sky-200 shadow-lg shadow-primary/20 p-1.5"'
    new_class = 'class="flex size-9 items-center justify-center rounded-xl bg-primary text-sky-200 shadow-lg shadow-primary/20 p-1.5 btn-splash-logo"'
    
    if old_class in content:
        content = content.replace(old_class, new_class)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
    else:
        # fallback, maybe it has different spacing or classes
        import re
        # Find <div data-icon="logo" ... class="..." ...>
        # and inject btn-splash-logo if not present
        pattern = r'(<div\s+data-icon="logo"[^>]*class=")([^"]+)(")'
        def repl(m):
            classes = m.group(2)
            if 'btn-splash-logo' not in classes:
                classes += ' btn-splash-logo'
            return m.group(1) + classes + m.group(3)
        
        new_content = re.sub(pattern, repl, content)
        if new_content != content:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated via regex {file}")
        else:
            print(f"No match or already updated in {file}")

