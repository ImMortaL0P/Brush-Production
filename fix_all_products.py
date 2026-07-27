import re

with open('public/index.html', 'r') as f:
    index_html = f.read()

# Extract Auth Modal
auth_modal_match = re.search(r'<!-- Auth Modal -->.*?</div>\n  </div>', index_html, re.DOTALL)
auth_modal = auth_modal_match.group(0) if auth_modal_match else ""

# Extract Profile Modal
profile_modal_match = re.search(r'<!-- Profile Modal -->.*?</div>\n  </div>', index_html, re.DOTALL)
profile_modal = profile_modal_match.group(0) if profile_modal_match else ""

# Extract Product Modal
product_modal_match = re.search(r'<!-- Product Modal -->.*?</div>\n  </div>', index_html, re.DOTALL)
product_modal = product_modal_match.group(0) if product_modal_match else ""

with open('public/all_products.html', 'r') as f:
    all_products = f.read()

# Insert Modals before cart drawer if not already there
if "id=\"auth-modal\"" not in all_products:
    cart_drawer_idx = all_products.find('<div class="cart-drawer"')
    if cart_drawer_idx != -1:
        all_products = all_products[:cart_drawer_idx] + "\n" + auth_modal + "\n" + profile_modal + "\n" + product_modal + "\n" + all_products[cart_drawer_idx:]

# Remove custom cart drawer logic in all_products.html
all_products = re.sub(r'// Re-hook up cart integration for drawer UI.*?(?=</script>)', '', all_products, flags=re.DOTALL)

# Add script.js if not already there
if '<script src="script.js"></script>' not in all_products:
    all_products = all_products.replace('</body>', '  <script src="script.js"></script>\n</body>')

# Change <div class="list-item"> to <div class="list-item product-card">
all_products = all_products.replace('<div class="list-item"', '<div class="list-item product-card"')
all_products = all_products.replace('class="list-add-btn"', 'class="list-add-btn quick-add-btn"')

with open('public/all_products.html', 'w') as f:
    f.write(all_products)
print("Updated all_products.html")
