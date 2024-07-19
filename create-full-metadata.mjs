import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const summariesFolderPath = path.join(__dirname, 'summary');
const metadataFilePath = path.join(__dirname, 'metadata.json');
const outputFilePath = path.join(__dirname, 'metadata_full.json');
const ui5DataPath = path.join(__dirname, 'ui5', 'webapp', 'data', 'metadata_full.json');

function loadMetadata() {
  if (!fs.existsSync(metadataFilePath)) {
    throw new Error('Metadata file not found');
  }
  return JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
}

function loadSummaries() {
  const summaries = {};
  fs.readdirSync(summariesFolderPath).forEach(file => {
    if (path.extname(file) === '.md') {
      const youtubeId = path.basename(file, '.md');
      const summaryContent = fs.readFileSync(path.join(summariesFolderPath, file), 'utf8');
      summaries[youtubeId] = summaryContent;
    }
  });
  return summaries;
}

function combineMetadataAndSummaries(metadata, summaries) {
  return metadata.map(video => {
    return {
      ...video,
      summary: summaries[video.youtubeId] || ''
    };
  });
}

async function combineAndSaveMetadata() {
  const metadata = loadMetadata();
  const summaries = loadSummaries();
  const combinedMetadata = combineMetadataAndSummaries(metadata, summaries);

  fs.writeFileSync(outputFilePath, JSON.stringify(combinedMetadata, null, 2), 'utf8');
  console.log(`Combined metadata saved to ${outputFilePath}`);

  if (!fs.existsSync(path.dirname(ui5DataPath))) {
    fs.mkdirSync(path.dirname(ui5DataPath), { recursive: true });
  }
  fs.copyFileSync(outputFilePath, ui5DataPath);
  console.log(`Combined metadata copied to ${ui5DataPath}`);
}

combineAndSaveMetadata().catch(error => {
  console.error('Error combining metadata and summaries:', error);
});
