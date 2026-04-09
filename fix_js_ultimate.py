import glob
import re

mobile_menu_js_block = """<script>
      // Mobile Menu Control
      document.addEventListener("DOMContentLoaded", () => {
        const menuBtn = document.getElementById('menu-button');
        const closeBtn = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const workToggle = document.getElementById('mobile-work-toggle');
        const workDropdown = document.getElementById('mobile-work-dropdown');
        const workChevron = document.getElementById('mobile-work-chevron');

        function toggleWorkStyles(isOpen) {
          const wrapper = document.getElementById('mobile-work-wrapper');
          if (wrapper) {
            wrapper.classList.toggle('is-active', isOpen);
          }
        }

        function closeMobileMenu() {
          mobileMenu.classList.add('hidden');
          document.body.style.overflow = 'auto';
          // reset dropdown
          if (workDropdown) {
            workDropdown.style.maxHeight = '0px';
            workChevron.style.transform = 'rotate(0deg)';
            toggleWorkStyles(false);
          }
        }

        if (menuBtn && closeBtn && mobileMenu) {
          menuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (workDropdown) {
              workDropdown.style.maxHeight = '0px';
              workChevron.style.transform = 'rotate(0deg)';
              toggleWorkStyles(false);
            }
          });

          closeBtn.addEventListener('click', closeMobileMenu);

          // Work dropdown toggle
          if (workToggle && workDropdown) {
            workToggle.addEventListener('click', () => {
              const isOpen = workDropdown.style.maxHeight && workDropdown.style.maxHeight !== '0px';
              if (isOpen) {
                workDropdown.style.maxHeight = '0px';
                workChevron.style.transform = 'rotate(0deg)';
                toggleWorkStyles(false);
              } else {
                workDropdown.style.maxHeight = workDropdown.scrollHeight + 'px';
                workChevron.style.transform = 'rotate(180deg)';
                toggleWorkStyles(true);
              }
            });
          }

          // Close menu on any nav link click
          mobileMenu.querySelectorAll('a').forEach(link => {
            if(link.id !== 'mobile-work-link') {
              link.addEventListener('click', closeMobileMenu);
            }
          });
        }
      });
    </script>"""

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to find the <script> block that contains `getElementById('menu-button')` OR `getElementById("menu-button")`
    # and replace that entire <script> block!
    
    # regex to match: <script>[^<]*?getElementById\(['"]menu-button['"]\)[^<]*?<\/script>
    
    # But wait, wait! The new mobile_menu_js_block ALSO contains getElementById('menu-button') !
    # So if it's already the NEW block, we don't want to replace it again if it's correct.
    # How to tell it's the NEW block? It has `toggleWorkStyles` checking.
    
    if "toggleWorkStyles" in content:
        # Already good!
        continue
        
    # It must be the OLD or Hungarian block. let's replace it.
    new_content = re.sub(
        r'<script>(?:(?!</script>).)*?getElementById\([\'"]menu-button[\'"]\)(?:(?!</script>).)*?</script>', 
        mobile_menu_js_block, 
        content, 
        flags=re.DOTALL
    )
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"ULTIMATE FIX applied to {f}")

print("Done.")
