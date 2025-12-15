/**
 * Dictionary Downloader
 * 
 * Downloads and processes Wiktionary data from kaikki.org
 * Converts to our simple dictionary format
 * 
 * Usage: node scripts/download-dictionaries.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

// Dictionary sources from kaikki.org
// These are JSON Lines files with Wiktionary data
const SOURCES = {
  // Russian words with English translations
  'ru-en': {
    url: 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.json',
    description: 'Russian → English (from Russian Wiktionary)',
  },
  // English words with Russian translations  
  'en-ru': {
    url: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.json',
    description: 'English → Russian (from English Wiktionary)',
    targetLang: 'Russian',
  },
  // Korean words with English translations
  'ko-en': {
    url: 'https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.json',
    description: 'Korean → English (from Korean Wiktionary)',
  },
  // English words with Korean translations
  'en-ko': {
    url: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.json',
    description: 'English → Korean (from English Wiktionary)',
    targetLang: 'Korean',
  },
};

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');
const CACHE_DIR = path.join(__dirname, '..', '.dictionary-cache');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Download a file with progress
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Downloading: ${url}`);
    console.log(`To: ${destPath}`);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Process a JSONL file line by line
 */
async function processJsonLines(filePath, processor) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  let lineCount = 0;
  for await (const line of rl) {
    if (line.trim()) {
      try {
        const entry = JSON.parse(line);
        processor(entry);
        lineCount++;
        if (lineCount % 10000 === 0) {
          process.stdout.write(`\rProcessed ${lineCount} entries...`);
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  }
  console.log(`\rProcessed ${lineCount} entries total.`);
}

/**
 * Extract translations from a Wiktionary entry
 * The structure varies but typically has:
 * - word: the headword
 * - pos: part of speech
 * - senses: array of meanings
 * - senses[].glosses: definitions
 * - translations: array of translations to other languages
 */
function extractTranslation(entry, targetLang = null) {
  const word = entry.word;
  const pos = entry.pos || '';
  
  // If we're looking for translations to a specific language
  if (targetLang && entry.translations) {
    for (const trans of entry.translations) {
      if (trans.lang && trans.lang.toLowerCase().includes(targetLang.toLowerCase())) {
        if (trans.word) {
          return { word, translation: trans.word, pos };
        }
      }
    }
    return null; // No translation to target language
  }
  
  // Otherwise, use the first gloss as the "translation" (for monolingual dicts)
  if (entry.senses && entry.senses.length > 0) {
    for (const sense of entry.senses) {
      if (sense.glosses && sense.glosses.length > 0) {
        // Get first gloss that's reasonably short
        const gloss = sense.glosses.find(g => g.length < 100) || sense.glosses[0];
        if (gloss) {
          return { word, translation: gloss, pos };
        }
      }
    }
  }
  
  return null;
}

/**
 * Process a dictionary and save to output
 */
async function processDictionary(key, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${key}`);
  console.log(`${config.description}`);
  console.log('='.repeat(60));
  
  // Cache file path
  const cacheFile = path.join(CACHE_DIR, path.basename(config.url));
  
  // Download if not cached
  if (!fs.existsSync(cacheFile)) {
    console.log('Downloading dictionary data (this may take a while)...');
    try {
      await downloadFile(config.url, cacheFile);
    } catch (error) {
      console.error(`Failed to download: ${error.message}`);
      return;
    }
  } else {
    console.log('Using cached data...');
  }
  
  // Process entries
  const dictionary = new Map();
  
  await processJsonLines(cacheFile, (entry) => {
    const result = extractTranslation(entry, config.targetLang);
    if (result && result.word && result.translation) {
      const normalizedWord = result.word.toLowerCase();
      // Only keep first translation for each word
      if (!dictionary.has(normalizedWord)) {
        dictionary.set(normalizedWord, {
          word: result.word,
          translation: result.translation,
          pos: result.pos,
        });
      }
    }
  });
  
  console.log(`Found ${dictionary.size} unique words with translations.`);
  
  // Convert to array and save
  const outputFile = path.join(OUTPUT_DIR, `${key}.json`);
  const outputData = Array.from(dictionary.values());
  
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`Saved to: ${outputFile}`);
  console.log(`File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Main function
 */
async function main() {
  console.log('Dictionary Downloader for WordShift');
  console.log('====================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Available dictionaries:');
    for (const [key, config] of Object.entries(SOURCES)) {
      console.log(`  ${key}: ${config.description}`);
    }
    console.log('\nUsage:');
    console.log('  node scripts/download-dictionaries.js <key>   - Download specific dictionary');
    console.log('  node scripts/download-dictionaries.js all     - Download all dictionaries');
    console.log('\nExample:');
    console.log('  node scripts/download-dictionaries.js ru-en');
    return;
  }
  
  if (args[0] === 'all') {
    for (const key of Object.keys(SOURCES)) {
      await processDictionary(key, SOURCES[key]);
    }
  } else {
    const key = args[0];
    if (!SOURCES[key]) {
      console.error(`Unknown dictionary: ${key}`);
      console.log('Available:', Object.keys(SOURCES).join(', '));
      return;
    }
    await processDictionary(key, SOURCES[key]);
  }
  
  console.log('\nDone!');
}

main().catch(console.error);

