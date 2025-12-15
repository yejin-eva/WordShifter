/**
 * Create bridge dictionaries for language pairs without direct translations
 * 
 * Uses English as intermediate language:
 * - ru-ko: Russian → English → Korean
 * - ko-ru: Korean → English → Russian
 * 
 * Usage: node scripts/create-bridge-dictionaries.cjs
 */

const fs = require('fs');
const path = require('path');

const DICT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');

function loadDictionary(filename) {
  const filePath = path.join(DICT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  Warning: ${filename} not found`);
    return new Map();
  }
  
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const dict = new Map();
  
  // Handle both formats
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      dict.set(entry.word.toLowerCase(), entry.translation || entry.t);
    }
  } else {
    for (const [word, value] of Object.entries(raw)) {
      const translation = value.t || value.translation || '';
      if (translation) {
        dict.set(word.toLowerCase(), translation);
      }
    }
  }
  
  console.log(`  Loaded ${filename}: ${dict.size} entries`);
  return dict;
}

function createBridgeDictionary(sourceToEn, enToTarget, outputFile, maxEntries = 50000) {
  console.log(`\nCreating ${outputFile}...`);
  
  const result = {};
  let count = 0;
  let matched = 0;
  
  for (const [sourceWord, englishTranslation] of sourceToEn) {
    if (count >= maxEntries) break;
    count++;
    
    // Normalize the English translation for lookup
    // Often translations have multiple words or extra info
    const englishWords = englishTranslation
      .toLowerCase()
      .split(/[,;\/\s]+/)
      .filter(w => w.length > 1 && !/^(a|an|the|to|of|in|on|at|for)$/i.test(w));
    
    // Try to find a match in en-to-target
    for (const enWord of englishWords) {
      const targetTranslation = enToTarget.get(enWord);
      if (targetTranslation) {
        result[sourceWord] = {
          t: targetTranslation,
          p: '', // We lose POS info in bridging
        };
        matched++;
        break;
      }
    }
  }
  
  console.log(`  Processed ${count} entries, found ${matched} bridges`);
  
  // Save
  const outputPath = path.join(DICT_DIR, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(result), 'utf8');
  
  const fileSize = fs.statSync(outputPath).size;
  console.log(`  Saved: ${outputPath}`);
  console.log(`  Size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`  Entries: ${Object.keys(result).length}`);
  
  // Show samples
  console.log('\n  Sample entries:');
  let sampleCount = 0;
  for (const [word, data] of Object.entries(result)) {
    if (sampleCount >= 5) break;
    console.log(`    ${word} → ${data.t}`);
    sampleCount++;
  }
  
  return Object.keys(result).length;
}

async function main() {
  console.log('===============================================');
  console.log('Creating Bridge Dictionaries');
  console.log('===============================================\n');
  
  console.log('Loading source dictionaries...');
  
  // Load all needed dictionaries
  const ruEn = loadDictionary('ru-en.json');
  const enKo = loadDictionary('en-ko.json');
  const koEn = loadDictionary('ko-en.json');
  const enRu = loadDictionary('en-ru.json');
  
  // Create ru-ko (Russian → English → Korean)
  if (ruEn.size > 0 && enKo.size > 0) {
    createBridgeDictionary(ruEn, enKo, 'ru-ko.json');
  } else {
    console.log('\nSkipping ru-ko: missing source dictionaries');
  }
  
  // Create ko-ru (Korean → English → Russian)
  if (koEn.size > 0 && enRu.size > 0) {
    createBridgeDictionary(koEn, enRu, 'ko-ru.json');
  } else {
    console.log('\nSkipping ko-ru: missing source dictionaries');
  }
  
  console.log('\n===============================================');
  console.log('Done!');
  console.log('===============================================');
}

main().catch(console.error);

