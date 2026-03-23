import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# The deeply flawed tailwind classes because it's a static CSS file:
old_pattern = r'<div class="absolute inset-x-0 bottom-0 h-\[60%\] bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none z-10"></div>'
# The ultimate CSS fallback gradient. 
# Matches the user request: dark 80-90% at bottom, fading to transparent linearly up to 60% height of the card.
new_gradient = r'<div class="absolute inset-x-0 bottom-0 h-[60%] pointer-events-none z-10" style="background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%);"></div>'

res = re.sub(old_pattern, new_gradient, text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Inline styling gradient applied.")
