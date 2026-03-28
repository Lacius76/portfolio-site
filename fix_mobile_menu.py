import glob

html_files = glob.glob('*.html')

for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
    
    # We want to replace the btn-sweep-primary from the Let's talk buttons in mobile menus
    if 'class="btn-sweep-primary px-8 py-3 rounded-xl"' in content:
        new_content = content.replace(
            'class=\"btn-sweep-primary px-8 py-3 rounded-xl\"', 
            'class=\"bg-primary text-white hover:bg-primary/90 transition-colors px-8 py-3 rounded-xl\"'
        )
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Fixed {file}")
