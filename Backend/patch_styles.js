const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, '../public/styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// We want to safely update the .nav-links block inside the media query.
// Current:
//   .nav-links {
//     display: none;
//     position: fixed;
//     top: 0;
// ...
//     justify-content: center;
// ...
//   }

css = css.replace(/(\.nav-links\s*\{\s*display:\s*none;\s*position:\s*fixed;\s*top:\s*0;\s*left:\s*0;\s*right:\s*0;\s*bottom:\s*0;\s*background:[^;]+;\s*flex-direction:\s*column;\s*)justify-content:\s*center;(\s*gap:\s*28px;\s*z-index:\s*1001;\s*padding:\s*)(80px 40px;)(\s*\})/, 
  "$1justify-content: flex-start;$2 110px 40px 60px; overflow-y: auto; -webkit-overflow-scrolling: touch;$4");

// And remove the :has rule:
css = css.replace(/\.nav-links:has\(\.nav-dropdown\.open\)[^{]*\{[^}]*\}/g, "");

fs.writeFileSync(cssPath, css);
console.log("Patched styles.css for mobile navbar scrolling.");
