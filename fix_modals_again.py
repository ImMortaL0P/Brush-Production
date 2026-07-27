import re

with open('public/index.html', 'r') as f:
    index_html = f.read()

# Extract modals correctly
auth_modal_match = re.search(r'<!-- Auth Modal -->.*?</div>\n  </div>', index_html, re.DOTALL)
profile_modal_match = re.search(r'<!-- Profile Modal -->.*?</div>\n  </div>', index_html, re.DOTALL)

with open('public/all_products.html', 'r') as f:
    all_products = f.read()

# Remove old auth and profile modals
all_products = re.sub(r'<!-- Auth Modal -->.*?</div>\n  </div>', '', all_products, flags=re.DOTALL)
all_products = re.sub(r'<!-- Profile Modal -->.*?</div>\n  </div>', '', all_products, flags=re.DOTALL)

# Insert the new ones before Product Modal
product_modal_idx = all_products.find('<!-- Product Detail Modal -->')
if product_modal_idx == -1:
    product_modal_idx = all_products.find('<div class="cart-overlay"')

if product_modal_idx != -1:
    all_products = all_products[:product_modal_idx] + auth_modal_match.group(0) + "\n\n  " + profile_modal_match.group(0) + "\n\n  " + all_products[product_modal_idx:]
    with open('public/all_products.html', 'w') as f:
        f.write(all_products)
    print("Modals re-injected!")
else:
    print("Insertion point not found")
