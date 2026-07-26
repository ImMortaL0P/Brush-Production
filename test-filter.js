const allProductsData = [
  { name: 'Anime Girls', category: 'Anime' },
  { name: 'CyberPunk', category: 'Movies & TV' },
  { name: 'Minimalist', category: 'Minimalist' }
];

const categoryParam = "Movies";

let checkedCats = [];
const cbValues = ["Anime", "Movies", "Minimalist", "Cyberpunk", "Space"];
cbValues.forEach(val => {
    if (val.toLowerCase() === categoryParam.toLowerCase() || categoryParam.toLowerCase().includes(val.toLowerCase())) {
        checkedCats.push(val.toLowerCase());
    }
});

console.log("Checked cats:", checkedCats);

const keyword = "";
const filtered = allProductsData.filter(p => {
    const cat = p.category ? p.category.toLowerCase() : '';
    const name = p.name ? p.name.toLowerCase() : '';
    const desc = p.description ? p.description.toLowerCase() : '';
    
    const matchesKeyword = !keyword || (
        name.includes(keyword) || 
        cat.includes(keyword) || 
        desc.includes(keyword)
    );
    
    const matchesCat = checkedCats.length === 0 || checkedCats.some(c => cat.includes(c));
    
    return matchesKeyword && matchesCat;
});

console.log("Filtered:", filtered);
