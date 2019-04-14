const fs = require('fs-extra');
let folderName = 'dist';

fs.removeSync(folderName); 
!fs.existsSync(folderName) && fs.mkdirSync(folderName);

const files = [
  'background_script.js',
  'manifest.json',
  'LICENSE',
  'browserAction',
  'detectedAction',
  'icons',
  'options',
  'utils',
];
for (const file of files) {
  fs.copySync(file, folderName + '/' + file)
}