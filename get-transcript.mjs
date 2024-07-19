import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Function to extract YouTube ID from URL
function extractYoutubeId(url) {
  const urlParts = url.split('v=');
  return urlParts.length > 1 ? urlParts[1].split('&')[0] : null;
}

// Function to extract Playlist ID from URL
function extractPlaylistId(url) {
  const urlParts = url.split('list=');
  return urlParts.length > 1 ? urlParts[1].split('&')[0] : null;
}

// Function to fetch video IDs from a playlist
async function fetchVideoIdsFromPlaylist(playlistId) {
  const videoIds = [];
  let nextPageToken = '';
  const API_KEY = process.env.YOUTUBE_API_KEY;  // Ensure your API key is stored in an environment variable

  do {
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}&pageToken=${nextPageToken}`;
    console.log(`Fetching videos from playlist: ${apiUrl}`);
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.items) {
      data.items.forEach(item => {
        videoIds.push(item.contentDetails.videoId);
      });
    }

    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);

  return videoIds;
}

// Function to convert offset to timestamp format "XmYs"
function convertOffsetToTimestamp(offset) {
  const minutes = Math.floor(offset / 60);
  const seconds = Math.floor(offset % 60);
  return `${minutes}m${seconds}s`;
}

// Function to fetch and save transcript
async function fetchAndSaveTranscript(youtubeId) {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const folderPath = path.join(__dirname, 'transcripts');
    const textFilePath = path.join(folderPath, `${youtubeId}.txt`);
    const jsonFilePath = path.join(folderPath, `${youtubeId}.json`);

    // Check if the transcript already exists
    if (fs.existsSync(textFilePath) && fs.existsSync(jsonFilePath)) {
      console.log(`Transcript for ${youtubeId} already exists. Skipping...`);
      return;
    }

    const transcript = await YoutubeTranscript.fetchTranscript(url);
    const transcriptText = transcript.map(entry => `${convertOffsetToTimestamp(entry.offset)}: ${entry.text}`).join('\n');

    // Ensure the transcripts folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Save the transcript to a text file
    fs.writeFileSync(textFilePath, transcriptText, 'utf8');
    console.log(`Transcript saved to ${textFilePath}`);

    // Save the transcript to a JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(transcript, null, 2), 'utf8');
    console.log(`Transcript JSON saved to ${jsonFilePath}`);
  } catch (error) {
    if (error.name === 'YoutubeTranscriptDisabledError') {
      console.warn(`Transcript is disabled for video ${youtubeId}. Skipping...`);
    } else {
      console.error(`Error fetching transcript for ${youtubeId}:`, error);
    }
  }
}

// Main function to process URLs
async function processUrls(urls) {
  for (const url of urls) {
    const playlistId = extractPlaylistId(url);
    if (playlistId) {
      console.log(`Processing playlist: ${playlistId}`);
      try {
        const videoIds = await fetchVideoIdsFromPlaylist(playlistId);
        console.log(`Found ${videoIds.length} videos in playlist`);
        for (const videoId of videoIds) {
          await fetchAndSaveTranscript(videoId);
        }
      } catch (error) {
        console.error(`Error processing playlist ${playlistId}:`, error);
      }
    } else {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        await fetchAndSaveTranscript(videoId);
      } else {
        console.error('Invalid URL:', url);
      }
    }
  }
}

// Load URLs from fetch-urls.json
function loadUrls() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const urlsFilePath = path.join(__dirname, 'fetch-urls.json');
  if (!fs.existsSync(urlsFilePath)) {
    throw new Error('URLs file not found');
  }
  const urlsContent = fs.readFileSync(urlsFilePath, 'utf8');
  const urlsJson = JSON.parse(urlsContent);
  return urlsJson.urls;
}

// Process all URLs
const urls = loadUrls();
processUrls(urls);
