import fs from 'fs';
import path from 'path';

const enJsonPath = 'v:/Money/frontend/src/locales/en.json';
const enData = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

function getNestedKeys(obj, prefix = '') {
    let keys = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            keys = keys.concat(getNestedKeys(obj[k], prefix + k + '.'));
        } else {
            keys.push(prefix + k);
        }
    }
    return keys;
}

const existingKeys = new Set(getNestedKeys(enData));

function scanDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(scanDir(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const srcFiles = scanDir('v:/Money/frontend/src');

const regex = /t\(['"]([\w.]+)['"]\)/g;
const missingKeys = new Set();
const fileMapping = {};

srcFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        if (!existingKeys.has(key)) {
            missingKeys.add(key);
            if (!fileMapping[key]) fileMapping[key] = [];
            fileMapping[key].push(path.basename(file));
        }
    }
});

console.log('Missing Keys:');
missingKeys.forEach(k => {
    console.log(`- ${k} (used in: ${[...new Set(fileMapping[k])].join(', ')})`);
});
