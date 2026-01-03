// Quick debug script to check localStorage data structure
console.log('=== LOCALSTORAGE DEBUG ===');

// Check what's currently stored
const keys = [
  'currentAppraiser',
  'customerFrontImage', 
  'customerSideImage',
  'jewelleryItems',
  'rbiCompliance',
  'purityResults'
];

keys.forEach(key => {
  const data = localStorage.getItem(key);
  console.log(`${key}:`, data ? 'EXISTS' : 'MISSING');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      console.log(`  ${key} structure:`, typeof parsed, Array.isArray(parsed) ? `Array[${parsed.length}]` : Object.keys(parsed));
      if (key === 'jewelleryItems' && Array.isArray(parsed) && parsed.length > 0) {
        console.log(`  First item keys:`, Object.keys(parsed[0]));
        console.log(`  First item sample:`, parsed[0]);
      }
    } catch (e) {
      console.log(`  ${key} (string):`, data.substring(0, 100));
    }
  }
});

console.log('=== END DEBUG ===');