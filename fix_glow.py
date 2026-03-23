import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the broken tailwind JIT classes and replace them with a single custom class name
broken_classes = r'hover:shadow-\[0_0_40px_rgba\(var\(--color-primary,99,102,241\),0.6\)\] hover:shadow-primary/60 hover:ring-primary/60 hover:ring-2'
text = text.replace(broken_classes, 'hg-card-glow')

# Find the start of the scroll column to inject the <style> block
# <div id="scroll-col-1" class="flex flex-col gap-8 w-full will-change-transform pt-12">
style_block = """<style>
  .hg-card-glow {
    transition: box-shadow 0.5s ease, transform 0.5s ease;
  }
  .hg-card-glow:hover {
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.6);
  }
</style>
<div id="scroll-col-1" """

text = text.replace('<div id="scroll-col-1" ', style_block)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Custom CSS glow class injected.")
