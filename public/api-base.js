const getApiBase = () => {
  const hostname = window.location.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return `${window.location.protocol}//${hostname}:5500/api`;
  }
  return 'https://brush-production.onrender.com/api';
};

window.API_BASE = getApiBase();
// Keep the variable exported globally for old scripts picking it up from window
var API_BASE = window.API_BASE;
