import urllib.request
from bs4 import BeautifulSoup

urls = {
    'Privacy Policy': 'https://www.posterized.in/policies/privacy-policy',
    'Terms of Service': 'https://www.posterized.in/policies/terms-of-service',
    'Refund Policy': 'https://www.posterized.in/policies/refund-policy',
    'Shipping Policy': 'https://www.posterized.in/policies/shipping-policy'
}

for name, url in urls.items():
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')
    
    body = soup.find('div', class_='shopify-policy__body')
    if body:
        print(f"=== {name} ===")
        text = ' '.join(body.stripped_strings)
        print(text[:2000] + '...') # Print first 2000 chars to avoid huge outputs
        print("\n" + "-"*50 + "\n")
    else:
        print(f"=== {name} (Not found in HTML) ===")

