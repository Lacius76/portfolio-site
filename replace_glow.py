import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern for the cards container class. Adding the hover attributes
# The current strings look like: class="group block cursor-pointer w-full aspect-[4/3] rounded-3xl overflow-hidden shrink-0 relative bg-slate-900 shadow-2xl ring-1 ring-white/10"
# or bg-slate-100 dark:bg-slate-800 ...
# Let's replace the whole exact snippet and just dynamically append to the classes.

def add_glow(m):
    # Match group 1 is the class string up to the end caret
    original_classes = m.group(1)
    
    # Check if we already applied glow
    if 'hover:shadow-[0_0_40px' in original_classes:
        return m.group(0)
    
    nuevo = original_classes + " transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(var(--color-primary,99,102,241),0.6)] hover:shadow-primary/60 hover:ring-primary/60 hover:ring-2"
    return f'class="{nuevo}"'

# We find precisely the classes for the cards by anchoring to aspect-[4/3] rounded-3xl
# e.g., class="group block cursor-pointer w-full aspect-[4/3] rounded-3xl overflow-hidden shrink-0 relative bg-slate-900 shadow-2xl ring-1 ring-white/10"

res = re.sub(r'class="([^"]*?aspect-\[4\/3\] rounded-3xl[^"]*?)"', add_glow, text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Done inserting glow classes.")
