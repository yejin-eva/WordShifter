/**
 * Download all dictionaries from kaikki.org
 * 
 * Supports: ru-en, en-ru, en-ko, ko-en, ru-ko, ko-ru
 * 
 * Usage: node scripts/download-all-dictionaries.cjs [size]
 * size: small (10K), medium (50K), large (100K)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');
const CACHE_DIR = path.join(__dirname, '..', '.dictionary-cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// kaikki.org raw data URLs - these are dictionaries OF a language (definitions in that language)
// For translations, we need to look at the "translations" field
const SOURCES = {
  'Russian': 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl',
  'English': 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl',
  'Korean': 'https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl',
};

const SIZE_LIMITS = {
  'small': 10000,
  'medium': 50000,
  'large': 100000,
  'xlarge': 200000,
  'full': 500000,
};

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 1000000) { // > 1MB means probably complete
        console.log(`Using cached: ${destPath}`);
        resolve(destPath);
        return;
      }
    }
    
    console.log(`Downloading: ${url}`);
    
    const file = fs.createWriteStream(destPath, { encoding: 'utf8' });
    
    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          makeRequest(res.headers.location);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        
        res.setEncoding('utf8');
        
        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;
        
        res.on('data', chunk => {
          file.write(chunk);
          downloadedSize += Buffer.byteLength(chunk, 'utf8');
          const mb = (downloadedSize / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r  Downloading: ${mb} MB`);
        });
        
        res.on('end', () => {
          file.end();
          console.log(' - Done!');
          resolve(destPath);
        });
        
        res.on('error', reject);
      }).on('error', reject);
    };
    
    makeRequest(url);
  });
}

async function processDictionary(sourceLang, targetLang, cacheFile, outputPath, maxEntries) {
  console.log(`\n  Processing ${sourceLang} → ${targetLang}...`);
  
  const entries = new Map();
  const fileStream = fs.createReadStream(cacheFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  let lineCount = 0;
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (entries.size >= maxEntries) break;
    
    try {
      const entry = JSON.parse(line);
      lineCount++;
      
      if (lineCount % 50000 === 0) {
        process.stdout.write(`\r  Processed ${lineCount} entries, found ${entries.size}...`);
      }
      
      const word = entry.word;
      if (!word || word.length < 2 || word.length > 30) continue;
      if (/[0-9.,;:!?()[\]{}]/.test(word)) continue;
      
      const wordLower = word.toLowerCase();
      if (entries.has(wordLower)) continue;
      
      // For source → target, we look at different fields depending on the direction
      // If source is the dictionary language (e.g. Russian Wiktionary for ru-en)
      // we look at glosses (which are in English for Russian Wiktionary)
      
      // If we need translations TO another language, we look at the translations array
      let translation = null;
      
      if (sourceLang === 'Russian' && targetLang === 'English') {
        // Russian Wiktionary has English glosses
        if (entry.senses) {
          for (const sense of entry.senses) {
            if (sense.glosses && sense.glosses.length > 0) {
              let gloss = sense.glosses.find(g => g && g.length < 60);
              if (gloss) {
                gloss = gloss.replace(/\s*\([^)]*\)/g, '').trim();
                gloss = gloss.split(/[,;]/)[0].trim();
                if (gloss && gloss.length > 0 && gloss.length < 40) {
                  translation = gloss;
                  break;
                }
              }
            }
          }
        }
      } else if (sourceLang === 'Korean' && targetLang === 'English') {
        // Korean Wiktionary has English glosses
        if (entry.senses) {
          for (const sense of entry.senses) {
            if (sense.glosses && sense.glosses.length > 0) {
              let gloss = sense.glosses.find(g => g && g.length < 60);
              if (gloss) {
                gloss = gloss.replace(/\s*\([^)]*\)/g, '').trim();
                gloss = gloss.split(/[,;]/)[0].trim();
                if (gloss && gloss.length > 0 && gloss.length < 40) {
                  translation = gloss;
                  break;
                }
              }
            }
          }
        }
      } else {
        // For en-ru, en-ko, etc., we need to look at the translations array
        if (entry.senses) {
          for (const sense of entry.senses) {
            if (sense.translations) {
              for (const trans of sense.translations) {
                if (trans.lang === targetLang || trans.code === getCodeForLang(targetLang)) {
                  if (trans.word && trans.word.length < 40) {
                    translation = trans.word;
                    break;
                  }
                }
              }
              if (translation) break;
            }
          }
        }
      }
      
      if (translation) {
        entries.set(wordLower, {
          t: translation,
          p: entry.pos || '',
        });
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  rl.close();
  fileStream.close();
  
  console.log(`\r  Found ${entries.size} translations                    `);
  
  // Save as compact object
  const compactDict = Object.fromEntries(entries);
  fs.writeFileSync(outputPath, JSON.stringify(compactDict), 'utf8');
  
  const fileSize = fs.statSync(outputPath).size;
  console.log(`  Saved: ${outputPath}`);
  console.log(`  Size: ${(fileSize / 1024).toFixed(1)} KB`);
  
  return entries.size;
}

function getCodeForLang(lang) {
  const codes = {
    'Russian': 'ru',
    'English': 'en',
    'Korean': 'ko',
  };
  return codes[lang] || lang.toLowerCase().substring(0, 2);
}

async function main() {
  const args = process.argv.slice(2);
  const sizeArg = args[0] || 'medium';
  const maxEntries = SIZE_LIMITS[sizeArg] || SIZE_LIMITS['medium'];
  
  console.log('===============================================');
  console.log('WordShift Dictionary Downloader');
  console.log('===============================================');
  console.log(`Size: ${sizeArg} (max ${maxEntries} entries per dictionary)\n`);
  
  // Download source files
  console.log('Step 1: Downloading source data...\n');
  
  const cacheFiles = {};
  for (const [lang, url] of Object.entries(SOURCES)) {
    const cacheFile = path.join(CACHE_DIR, `kaikki-${lang.toLowerCase()}.jsonl`);
    try {
      await downloadFile(url, cacheFile);
      cacheFiles[lang] = cacheFile;
    } catch (error) {
      console.error(`  Failed to download ${lang}: ${error.message}`);
    }
  }
  
  // Process dictionaries
  console.log('\nStep 2: Processing dictionaries...\n');
  
  const pairs = [
    { source: 'Russian', target: 'English', file: 'ru-en.json' },
    { source: 'Korean', target: 'English', file: 'ko-en.json' },
    // These need translations field
    { source: 'English', target: 'Russian', file: 'en-ru.json' },
    { source: 'English', target: 'Korean', file: 'en-ko.json' },
  ];
  
  for (const pair of pairs) {
    const cacheFile = cacheFiles[pair.source];
    if (!cacheFile) {
      console.log(`  Skipping ${pair.file}: source data not available`);
      continue;
    }
    
    const outputPath = path.join(OUTPUT_DIR, pair.file);
    try {
      await processDictionary(pair.source, pair.target, cacheFile, outputPath, maxEntries);
    } catch (error) {
      console.error(`  Failed ${pair.file}: ${error.message}`);
    }
  }
  
  console.log('\n===============================================');
  console.log('Done! Dictionary files are in public/dictionaries/');
  console.log('===============================================');
}

main().catch(console.error);

