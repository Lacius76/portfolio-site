import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to find the broken height container
pattern_grad = r'<div class="absolute inset-x-0 bottom-0 h-\[60%\] pointer-events-none z-20" style="background: linear-gradient\(to top, rgba\(0,0,0,0.95\) 0%, rgba\(0,0,0,0.7\) 40%, transparent 100%\);"></div>'

# New container with purely inline styling for dimensions to bypass Tailwind limits
new_grad = r'<div class="absolute bottom-0 left-0 pointer-events-none z-20 w-full" style="height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%);"></div>'

text = re.sub(pattern_grad, new_grad, text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed arbitrary height variable.")
