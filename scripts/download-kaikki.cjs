/**
 * Download dictionaries from kaikki.org
 * 
 * Kaikki.org provides Wiktionary data in JSON Lines format
 * 
 * Usage: node scripts/download-kaikki.cjs [size]
 * size: small (10K), medium (50K), large (100K), full (all)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');
const CACHE_DIR = path.join(__dirname, '..', '.dictionary-cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// kaikki.org raw data URLs
const SOURCES = {
  'ru': 'https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl',
  'en': 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl',
  'ko': 'https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl',
};

const SIZE_LIMITS = {
  'small': 10000,
  'medium': 50000,
  'large': 100000,
  'full': Infinity,
};

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`To: ${destPath}`);
    
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
          if (totalSize) {
            const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
            const mb = (downloadedSize / 1024 / 1024).toFixed(1);
            process.stdout.write(`\rProgress: ${percent}% (${mb} MB)`);
          } else {
            const mb = (downloadedSize / 1024 / 1024).toFixed(1);
            process.stdout.write(`\rDownloaded: ${mb} MB`);
          }
        });
        
        res.on('end', () => {
          file.end();
          console.log('\nDownload complete!');
          resolve(destPath);
        });
        
        res.on('error', reject);
      }).on('error', reject);
    };
    
    makeRequest(url);
  });
}

async function processRussianToEnglish(filePath, outputPath, maxEntries) {
  console.log(`Processing Russian → English (max ${maxEntries} entries)...`);
  
  const entries = new Map();
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  let lineCount = 0;
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    
    // Stop if we have enough
    if (entries.size >= maxEntries) break;
    
    try {
      const entry = JSON.parse(line);
      lineCount++;
      
      if (lineCount % 10000 === 0) {
        process.stdout.write(`\rProcessed ${lineCount} entries, found ${entries.size} translations...`);
      }
      
      // Extract word
      const word = entry.word;
      if (!word || word.length < 2 || word.length > 30) continue;
      
      // Skip if contains numbers or punctuation (except hyphen)
      if (/[0-9.,;:!?()[\]{}]/.test(word)) continue;
      
      // Normalize for lookup
      const wordLower = word.toLowerCase();
      
      // Already have this word
      if (entries.has(wordLower)) continue;
      
      // Look for English translation in senses
      if (entry.senses) {
        for (const sense of entry.senses) {
          if (sense.glosses && sense.glosses.length > 0) {
            // Get first short gloss
            let gloss = sense.glosses.find(g => g && g.length < 60);
            if (gloss) {
              // Clean up the gloss
              gloss = gloss.replace(/\s*\([^)]*\)/g, '').trim(); // Remove parentheticals
              gloss = gloss.split(/[,;]/)[0].trim(); // Get first meaning
              
              if (gloss && gloss.length > 0 && gloss.length < 40) {
                entries.set(wordLower, {
                  word: wordLower,
                  translation: gloss,
                  pos: entry.pos || '',
                });
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  rl.close();
  fileStream.close();
  
  console.log(`\nTotal: ${lineCount} entries processed, ${entries.size} with translations`);
  
  // Convert to compact object format for smaller file size
  const compactDict = {};
  for (const [word, data] of entries) {
    compactDict[word] = {
      t: data.translation,
      p: data.pos,
    };
  }
  
  // Save without pretty printing to reduce size
  fs.writeFileSync(outputPath, JSON.stringify(compactDict), 'utf8');
  
  const fileSize = fs.statSync(outputPath).size;
  console.log(`Saved to: ${outputPath}`);
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
  
  // Show sample
  console.log('\nSample entries:');
  let count = 0;
  for (const [word, data] of entries) {
    if (count >= 10) break;
    console.log(`  ${word} → ${data.translation} (${data.pos})`);
    count++;
  }
  
  return entries.size;
}

async function main() {
  const args = process.argv.slice(2);
  const sizeArg = args[0] || 'medium';
  const maxEntries = SIZE_LIMITS[sizeArg] || SIZE_LIMITS['medium'];
  
  console.log('Kaikki.org Dictionary Downloader');
  console.log('=================================');
  console.log(`Size: ${sizeArg} (max ${maxEntries} entries)\n`);
  
  // Download Russian Wiktionary
  const cacheFile = path.join(CACHE_DIR, 'kaikki-russian.jsonl');
  
  if (!fs.existsSync(cacheFile)) {
    console.log('Downloading Russian Wiktionary data (this may take a while)...');
    console.log('File is approximately 90 MB\n');
    
    try {
      await downloadFile(SOURCES['ru'], cacheFile);
    } catch (error) {
      console.error(`\nDownload failed: ${error.message}`);
      return;
    }
  } else {
    console.log('Using cached data...\n');
  }
  
  // Process to ru-en
  const outputPath = path.join(OUTPUT_DIR, 'ru-en.json');
  await processRussianToEnglish(cacheFile, outputPath, maxEntries);
  
  console.log('\nDone!');
}

main().catch(console.error);
