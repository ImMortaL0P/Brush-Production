# Copies the rate table + pricing helpers from Backend/productTypes.js into
# public/cart.js (browser code can't require the Node module). Run after
# editing productTypes.js:  python3 tools/sync-cart-config.py
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
back = open(os.path.join(root, 'Backend/productTypes.js')).read()
a = back.index('const PRODUCT_TYPES = {'); b = back.index('};\n\n// category -> productType') + 2
cfg = back[a:b]
fa = back.index('// Maps whatever productType'); fb = back.index('function getProductType(category)')
funcs = back[fa:fb]
indent = lambda t: '\n'.join(('  ' + l if l.strip() else l) for l in t.split('\n'))
p = os.path.join(root, 'public/cart.js'); s = open(p).read()
a = s.index('  const PRODUCT_TYPES = {'); b = s.index('  function typeConfigFor(productType) {')
s = s[:a] + indent(cfg) + '\n\n' + indent(funcs.rstrip()) + '\n\n' + s[b:]
open(p, 'w').write(s)
print('cart.js synced')
