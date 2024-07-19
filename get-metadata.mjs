import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Replace 'YOUR_API_KEY' with your actual YouTube Data API key
const API_KEY = process.env.YOUTUBE_API_KEY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const metadataFilePath = path.join(__dirname, 'metadata.json');

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

// Function to fetch video details using YouTube Data API
async function fetchVideoDetails(youtubeId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${youtubeId}&key=${API_KEY}`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  if (data.items && data.items.length > 0) {
    return data.items[0];
  } else {
    throw new Error('Video not found');
  }
}

// Function to fetch video IDs from a playlist
async function fetchVideoIdsFromPlaylist(playlistId) {
  const videoIds = [];
  let nextPageToken = '';

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

// Function to update metadata.json file
async function updateMetadata(youtubeId) {
  const videoDetails = await fetchVideoDetails(youtubeId);
  const metadata = {
    youtubeId: videoDetails.id,
    url: `https://www.youtube.com/watch?v=${videoDetails.id}`,
    title: videoDetails.snippet.title,
    description: videoDetails.snippet.description,
    publishedAt: videoDetails.snippet.publishedAt,
    channelId: videoDetails.snippet.channelId,
    channelTitle: videoDetails.snippet.channelTitle,
    tags: videoDetails.snippet.tags,
    categoryId: videoDetails.snippet.categoryId,
    liveBroadcastContent: videoDetails.snippet.liveBroadcastContent,
    defaultLanguage: videoDetails.snippet.defaultLanguage,
    defaultAudioLanguage: videoDetails.snippet.defaultAudioLanguage,
    viewCount: videoDetails.statistics.viewCount,
    likeCount: videoDetails.statistics.likeCount,
    commentCount: videoDetails.statistics.commentCount,
    duration: videoDetails.contentDetails.duration,
    definition: videoDetails.contentDetails.definition,
    caption: videoDetails.contentDetails.caption,
    licensedContent: videoDetails.contentDetails.licensedContent,
    projection: videoDetails.contentDetails.projection,
    timestamp: new Date().toISOString()
  };

  let metadataArray = [];

  // Check if metadata file exists
  if (fs.existsSync(metadataFilePath)) {
    const metadataContent = fs.readFileSync(metadataFilePath, 'utf8');
    metadataArray = JSON.parse(metadataContent);
  }

  const existingMetadataIndex = metadataArray.findIndex(item => item.youtubeId === youtubeId);

  if (existingMetadataIndex >= 0) {
    metadataArray[existingMetadataIndex] = metadata;
    console.log(`Updated metadata for ${youtubeId}`);
  } else {
    metadataArray.push(metadata);
    console.log(`Added new metadata for ${youtubeId}`);
  }

  fs.writeFileSync(metadataFilePath, JSON.stringify(metadataArray, null, 2), 'utf8');
  console.log(`Metadata saved to ${metadataFilePath}`);
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
          await updateMetadata(videoId);
        }
      } catch (error) {
        console.error(`Error processing playlist ${playlistId}:`, error);
      }
    } else {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        await updateMetadata(videoId);
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

// Process all URLs
processUrls(urls);
