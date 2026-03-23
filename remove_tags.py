import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to find the tag blocks at top-5 left-5
pattern = re.compile(r'<div class="absolute top-5 left-5 z-20">.*?</div>', re.DOTALL)

res = pattern.sub('', text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Done removing tags.")
