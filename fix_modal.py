import re

with open('public/index.html', 'r') as f:
    index_html = f.read()

m = re.search(r'<!-- Product Detail Modal -->.*?</div>\n    </div>\n  </div>', index_html, re.DOTALL)
if m:
    product_modal = m.group(0)
    with open('public/all_products.html', 'r') as f:
        all_products = f.read()
    
    if "id=\"product-modal\"" not in all_products:
        cart_idx = all_products.find('<div class="cart-overlay"')
        if cart_idx == -1:
            cart_idx = all_products.find('<div class="cart-drawer"')
            
        if cart_idx != -1:
            all_products = all_products[:cart_idx] + "\n" + product_modal + "\n" + all_products[cart_idx:]
            with open('public/all_products.html', 'w') as f:
                f.write(all_products)
            print("Injected product-modal")
        else:
            print("Cart drawer not found")
else:
    print("Product modal not found in index.html")
