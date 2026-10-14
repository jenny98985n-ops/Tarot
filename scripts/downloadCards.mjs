import fs from 'fs';
import path from 'path';
import https from 'https';

const CARDS_DIR = path.resolve('public/cards');
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

const BASE_URL = 'https://raw.githubusercontent.com/mixvlad/TarotCards/main/tarot/rider-waite/720px/';

const mappings = [
  // Major Arcana (22)
  { src: '00_Fool.jpg', dest: 'major_00.jpg' },
  { src: '01_Magician.jpg', dest: 'major_01.jpg' },
  { src: '02_High_Priestess.jpg', dest: 'major_02.jpg' },
  { src: '03_Empress.jpg', dest: 'major_03.jpg' },
  { src: '04_Emperor.jpg', dest: 'major_04.jpg' },
  { src: '05_Hierophant.jpg', dest: 'major_05.jpg' },
  { src: '06_Lovers.jpg', dest: 'major_06.jpg' },
  { src: '07_Chariot.jpg', dest: 'major_07.jpg' },
  { src: '08_Strength.jpg', dest: 'major_08.jpg' },
  { src: '09_Hermit.jpg', dest: 'major_09.jpg' },
  { src: '10_Wheel_of_Fortune.jpg', dest: 'major_10.jpg' },
  { src: '11_Justice.jpg', dest: 'major_11.jpg' },
  { src: '12_Hanged_Man.jpg', dest: 'major_12.jpg' },
  { src: '13_Death.jpg', dest: 'major_13.jpg' },
  { src: '14_Temperance.jpg', dest: 'major_14.jpg' },
  { src: '15_Devil.jpg', dest: 'major_15.jpg' },
  { src: '16_Tower.jpg', dest: 'major_16.jpg' },
  { src: '17_Star.jpg', dest: 'major_17.jpg' },
  { src: '18_Moon.jpg', dest: 'major_18.jpg' },
  { src: '19_Sun.jpg', dest: 'major_19.jpg' },
  { src: '20_Judgement.jpg', dest: 'major_20.jpg' },
  { src: '21_World.jpg', dest: 'major_21.jpg' },
];

// Suits: Cups, Pentacles, Swords, Wands
const suits = [
  { prefix: 'Cups', targetPrefix: 'cups' },
  { prefix: 'Pents', targetPrefix: 'pentacles' },
  { prefix: 'Swords', targetPrefix: 'swords' },
  { prefix: 'Wands', targetPrefix: 'wands' },
];

for (const suit of suits) {
  for (let i = 1; i <= 14; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    mappings.push({
      src: `${suit.prefix}${numStr}.jpg`,
      dest: `${suit.targetPrefix}_${numStr}.jpg`,
    });
  }
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    // If file already exists and size > 1000 bytes, skip
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve();
    }
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log(`Starting download of ${mappings.length} Rider-Waite cards...`);
  let count = 0;
  for (const item of mappings) {
    const url = `${BASE_URL}${item.src}`;
    const dest = path.join(CARDS_DIR, item.dest);
    try {
      await download(url, dest);
      count++;
      if (count % 10 === 0 || count === mappings.length) {
        console.log(`Progress: ${count} / ${mappings.length} downloaded`);
      }
    } catch (err) {
      console.error(`Error downloading ${item.src}:`, err.message);
    }
  }
  console.log('Finished downloading all Rider-Waite card faces into /public/cards!');
}

run();
