import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from a .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
});

const forceSummary = process.env.FORCE_SUMMARY === 'true';

// Function to generate a summary using OpenAI API
async function generateSummary(transcript, title, url) {
  const prompt = `
  This is a series of Live Coding with DJ Adams. He is live coding an hour, talking mainly about SAP CAP and interacting with viewers who are watching the stream on YouTube. He also talks about what's going on in the SAP Ecosystem and sometimes about his private life.
  I have the transcript of this session and I want a short summary of about 200 words explaining what's going on.
  The answer should be in markdown with headers for each paragraph.

  Under the main header link the video with the title of the video.
    Here is the link to the video: [${url}]

 Start with sentence about the main topic in this session and what you can learn. Underneath this sentence bullet points with the main technical topics that are discussed. The bullets point have a subheader with bold "Main Topics Covered:". Header: "Main Topic".

  Also, create and include links with markdown to the timestamps of the video in the bulletpoints. The timestamps are in front of the lines in the transcript like:
  1m58s: good morning good afternoon good evening
  2m0s: welcome to another episode of hands on
  2m2s: Dev with me DJ
  You can then link to the video with the timestamp like this: [2m0s](${url}&t=2m0s)

  How to summarize it:
  - 
  - A paragraph about what is talked about in SAP CAP, OData, or anything coding related. This could be a bit longer than the other paragraphs. Header "Content"
  - A sentence about what he shared in his private life. Header: "DJ's private life"
  - Information about what the viewers provided in the chat. Header: "Chat"

  Here is the transcript for the session with the title: "${title}". :

  ${transcript}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 1,
    top_p: 1,
    max_tokens: 16383,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  return response.choices[0].message.content;
}

// Function to process each transcript file
async function processTranscript(filePath) {
  const youtubeId = path.basename(filePath, '.txt');  // Extract only the base name without extension
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const summaryFolderPath = path.join(__dirname, 'summary');
  const summaryFilePath = path.join(summaryFolderPath, `${youtubeId}.md`);

  // Check if the summary already exists and skip if it does (unless forced)
  if (fs.existsSync(summaryFilePath) && !forceSummary) {
    console.log(`Summary for ${youtubeId} already exists. Skipping...`);
    return;
  }

  // Read the transcript
  const transcript = fs.readFileSync(filePath, 'utf8');
  // Fetch video details from the metadata.json file
  const metadataFilePath = path.join(__dirname, 'metadata.json');
  const metadataArray = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
  const videoDetails = metadataArray.find(video => video.youtubeId === youtubeId);

  if (!videoDetails) {
    console.error(`Metadata not found for ${youtubeId}. Skipping...`);
    return;
  }

  const title = videoDetails.title;
  const url = videoDetails.url;

  // Generate the summary
  try {
    const summary = await generateSummary(transcript, title, url);

    // Ensure the summary folder exists
    if (!fs.existsSync(summaryFolderPath)) {
      fs.mkdirSync(summaryFolderPath);
    }

    // Save the summary to a text file
    fs.writeFileSync(summaryFilePath, summary, 'utf8');
    console.log(`Summary saved to ${summaryFilePath}`);
  } catch (error) {
    console.error(`Error generating summary for ${youtubeId}:`, error);
  }
}

// Main function to process all transcripts
async function processAllTranscripts() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const transcriptFolderPath = path.join(__dirname, 'transcripts');

  fs.readdir(transcriptFolderPath, async (err, files) => {
    if (err) {
      console.error('Error reading transcript folder:', err);
      return;
    }

    for (const file of files) {
      if (path.extname(file) === '.txt') {  // Process only .txt files
        const filePath = path.join(transcriptFolderPath, file);
        await processTranscript(filePath);
      }
    }
  });
}

// Run the main function
processAllTranscripts();
