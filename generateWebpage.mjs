import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import showdown from 'showdown';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const summariesFolderPath = path.join(__dirname, 'summary');
const metadataFilePath = path.join(__dirname, 'metadata.json');
const outputFilePath = path.join(__dirname, 'index.html');

const converter = new showdown.Converter();

function loadMetadata() {
  if (!fs.existsSync(metadataFilePath)) {
    throw new Error('Metadata file not found');
  }
  return JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
}

function loadSummaries() {
  const summaries = [];
  fs.readdirSync(summariesFolderPath).forEach(file => {
    if (path.extname(file) === '.md') {  // Process only .md files
      const youtubeId = path.basename(file, '.md');
      const summaryContent = fs.readFileSync(path.join(summariesFolderPath, file), 'utf8');
      const htmlContent = converter.makeHtml(summaryContent);
      summaries.push({ youtubeId, htmlContent });
    }
  });
  return summaries;
}

function generateHTML(metadata, summaries) {
  const sortedSummaries = summaries.sort((a, b) => {
    const titleA = metadata.find(m => m.youtubeId === a.youtubeId)?.title || '';
    const titleB = metadata.find(m => m.youtubeId === b.youtubeId)?.title || '';
    const partA = parseInt(titleA.match(/part (\d+)/i)?.[1] || '0');
    const partB = parseInt(titleB.match(/part (\d+)/i)?.[1] || '0');
    return partA - partB;
  });

  const sidebarLinks = sortedSummaries.map((summary, index) => {
    const title = metadata.find(m => m.youtubeId === summary.youtubeId)?.title || 'Unknown Title';
    return `<li><a href="#summary-${index}">${title}</a></li>`;
  }).join('\n');

  const summarySections = sortedSummaries.map((summary, index) => {
    const title = metadata.find(m => m.youtubeId === summary.youtubeId)?.title || 'Unknown Title';
    return `<section id="summary-${index}">
      <h2>${title}</h2>
      ${summary.htmlContent}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Summaries</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <button id="toggleSidebar">☰</button>
  <aside>
    <h1>Summaries</h1>
    <ul>
      ${sidebarLinks}
    </ul>
  </aside>
  <main>
    ${summarySections}
  </main>
  <script>
    // Toggle sidebar for mobile view
    const sidebar = document.querySelector('aside');
    const toggleButton = document.getElementById('toggleSidebar');
    
    toggleButton.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  </script>
</body>
</html>`;
}

async function generateWebpage() {
  const metadata = loadMetadata();
  const summaries = loadSummaries();
  const htmlContent = generateHTML(metadata, summaries);

  fs.writeFileSync(outputFilePath, htmlContent, 'utf8');
  console.log(`Webpage generated at ${outputFilePath}`);
}

generateWebpage().catch(error => {
  console.error('Error generating webpage:', error);
});
