/**
 * Create inverted dictionaries
 * 
 * Takes ru-en and creates en-ru by flipping entries
 * Takes ko-en and creates en-ko by flipping entries
 */

const fs = require('fs');
const path = require('path');

const DICT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');

function invertDictionary(sourceFile, targetFile) {
  console.log(`\nInverting ${sourceFile} → ${targetFile}...`);
  
  const sourcePath = path.join(DICT_DIR, sourceFile);
  const targetPath = path.join(DICT_DIR, targetFile);
  
  // Load source dictionary
  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const sourceCount = Object.keys(sourceData).length;
  console.log(`  Source entries: ${sourceCount}`);
  
  // Load existing target dictionary (to merge with)
  let existingData = {};
  if (fs.existsSync(targetPath)) {
    existingData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    console.log(`  Existing target entries: ${Object.keys(existingData).length}`);
  }
  
  // Invert: for each (word → translation), create (translation → word)
  const inverted = {};
  let newEntries = 0;
  
  for (const [word, data] of Object.entries(sourceData)) {
    const translation = data.t;
    if (!translation || translation.length < 1 || translation.length > 40) continue;
    
    // Clean and normalize the translation (will become the new key)
    const newKey = translation.toLowerCase().trim();
    
    // Skip if it's not a clean word (contains special chars)
    if (/[0-9.,;:!?()[\]{}"]/.test(newKey)) continue;
    if (newKey.includes(' ') && newKey.split(' ').length > 3) continue; // Skip long phrases
    
    // Only add if not already in existing dictionary (prefer original over inverted)
    if (!existingData[newKey] && !inverted[newKey]) {
      inverted[newKey] = {
        t: word,  // The original word becomes the translation
        p: data.p || '',
      };
      newEntries++;
    }
  }
  
  console.log(`  New inverted entries: ${newEntries}`);
  
  // Merge: existing takes priority, then add inverted
  const merged = { ...inverted, ...existingData };
  const mergedCount = Object.keys(merged).length;
  
  console.log(`  Total merged entries: ${mergedCount}`);
  
  // Save
  fs.writeFileSync(targetPath, JSON.stringify(merged), 'utf8');
  
  const fileSize = fs.statSync(targetPath).size;
  console.log(`  Saved: ${targetPath}`);
  console.log(`  Size: ${(fileSize / 1024).toFixed(1)} KB`);
  
  return mergedCount;
}

async function main() {
  console.log('===============================================');
  console.log('Dictionary Inverter');
  console.log('===============================================');
  
  // Invert ru-en to expand en-ru
  invertDictionary('ru-en.json', 'en-ru.json');
  
  // Invert ko-en to expand en-ko
  invertDictionary('ko-en.json', 'en-ko.json');
  
  console.log('\n===============================================');
  console.log('Done!');
  console.log('===============================================');
}

main().catch(console.error);

