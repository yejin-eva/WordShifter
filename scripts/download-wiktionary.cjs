/**
 * Download dictionaries from Wiktionary-Dictionaries GitHub repo
 * 
 * This repo has pre-processed Wiktionary data in tab-separated format
 * https://github.com/Vuizur/Wiktionary-Dictionaries
 * 
 * Usage: node scripts/download-wiktionary.cjs <lang-pair>
 * Example: node scripts/download-wiktionary.cjs ru-en
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');

// Wiktionary-Dictionaries releases URL
const GITHUB_BASE = 'https://raw.githubusercontent.com/Vuizur/Wiktionary-Dictionaries/master';

// Map our language codes to their file names
const DICT_FILES = {
  'ru-en': {
    // Russian Wiktionary (Russian words with English meanings)
    url: `${GITHUB_BASE}/Russian Wiktionary/Russian-English_Wiktionary.txt`,
    separator: '\t',
  },
  'en-ru': {
    // English Wiktionary translations to Russian
    url: `${GITHUB_BASE}/English Wiktionary/English-Russian_Wiktionary.txt`,
    separator: '\t',
  },
  'ko-en': {
    url: `${GITHUB_BASE}/Korean Wiktionary/Korean-English_Wiktionary.txt`,
    separator: '\t',
  },
  'en-ko': {
    url: `${GITHUB_BASE}/English Wiktionary/English-Korean_Wiktionary.txt`,
    separator: '\t',
  },
};

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    
    const makeRequest = (requestUrl) => {
      const protocol = requestUrl.startsWith('https') ? https : require('http');
      
      protocol.get(requestUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          console.log(`Redirecting to: ${res.headers.location}`);
          makeRequest(res.headers.location);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        
        let data = '';
        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;
        
        res.on('data', chunk => {
          data += chunk;
          downloadedSize += chunk.length;
          if (totalSize) {
            process.stdout.write(`\rProgress: ${((downloadedSize/totalSize)*100).toFixed(1)}%`);
          }
        });
        
        res.on('end', () => {
          console.log('\nDownload complete!');
          resolve(data);
        });
        
        res.on('error', reject);
      }).on('error', reject);
    };
    
    makeRequest(url);
  });
}

function parseTabFile(content, separator = '\t') {
  const lines = content.split('\n');
  const entries = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(separator);
    if (parts.length >= 2) {
      const word = parts[0].trim();
      const translation = parts[1].trim();
      
      if (word && translation) {
        entries.push({
          word: word.toLowerCase(),
          translation: translation,
          pos: parts[2]?.trim() || '',
        });
      }
    }
  }
  
  return entries;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Available dictionaries:');
    for (const key of Object.keys(DICT_FILES)) {
      console.log(`  ${key}`);
    }
    console.log('\nUsage: node scripts/download-wiktionary.cjs <lang-pair>');
    console.log('Example: node scripts/download-wiktionary.cjs ru-en');
    console.log('\nOr download all: node scripts/download-wiktionary.cjs all');
    return;
  }
  
  const keys = args[0] === 'all' ? Object.keys(DICT_FILES) : [args[0]];
  
  for (const key of keys) {
    if (!DICT_FILES[key]) {
      console.log(`Unknown dictionary: ${key}`);
      continue;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${key}`);
    console.log('='.repeat(60));
    
    const config = DICT_FILES[key];
    
    try {
      const content = await downloadFile(config.url);
      const entries = parseTabFile(content, config.separator);
      
      console.log(`Parsed ${entries.length} entries`);
      
      if (entries.length > 0) {
        // Show sample
        console.log('\nSample entries:');
        entries.slice(0, 5).forEach(e => {
          console.log(`  ${e.word} → ${e.translation}`);
        });
        
        // Deduplicate by word
        const uniqueEntries = new Map();
        for (const entry of entries) {
          if (!uniqueEntries.has(entry.word)) {
            uniqueEntries.set(entry.word, entry);
          }
        }
        
        const outputEntries = Array.from(uniqueEntries.values());
        console.log(`\nUnique entries: ${outputEntries.length}`);
        
        // Save
        const outputFile = path.join(OUTPUT_DIR, `${key}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(outputEntries, null, 2));
        console.log(`Saved to: ${outputFile}`);
        console.log(`File size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);
      }
    } catch (error) {
      console.error(`Failed: ${error.message}`);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);

