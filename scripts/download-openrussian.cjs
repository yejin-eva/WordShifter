/**
 * Download dictionary from OpenRussian.org
 * 
 * OpenRussian provides a comprehensive Russian dictionary
 * with English translations.
 * 
 * Usage: node scripts/download-openrussian.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dictionaries');

// OpenRussian.org provides data exports
// We'll try to fetch from their API or use a mirror

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchJSON(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data); // Return raw if not JSON
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadFromGitHub() {
  // Try to get a word list from a GitHub repo that has Russian words
  const sources = [
    // 10000 most common Russian words
    'https://raw.githubusercontent.com/hingston/russian/master/10000-russian-words.txt',
    // Frequency list with translations
    'https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/russian.txt',
  ];
  
  for (const url of sources) {
    console.log(`Trying: ${url}`);
    try {
      const response = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
          res.on('error', reject);
        }).on('error', reject);
      });
      
      console.log(`Success! Got ${response.length} bytes`);
      return { url, data: response };
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
  }
  
  return null;
}

async function main() {
  console.log('Downloading Russian word data...\n');
  
  const result = await downloadFromGitHub();
  
  if (!result) {
    console.log('\nCould not download from any source.');
    console.log('Please manually download a Russian word list.');
    return;
  }
  
  console.log(`\nProcessing data from: ${result.url}`);
  
  // Parse the word list - format varies by source
  const lines = result.data.split('\n').filter(l => l.trim());
  console.log(`Found ${lines.length} lines`);
  
  // Show sample
  console.log('\nSample lines:');
  lines.slice(0, 5).forEach(l => console.log(`  ${l}`));
  
  console.log('\nNote: This source may only have Russian words without translations.');
  console.log('For full translations, we need a bilingual dictionary.');
}

main().catch(console.error);

