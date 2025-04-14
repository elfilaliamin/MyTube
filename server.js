const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Enable CORS to allow requests from any origin
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(express.json());

// Define the path to the CSV file
const filePath = path.join(__dirname, 'data.csv');

// Check if the file exists, if not create it
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '"id","title","video","thumbnail","deletedate","saved"\n'); // Add CSV header
}

// Define the route to handle the POST request for adding video data
app.post('/proxy', async (req, res) => {
  const { videoUrl } = req.body;

  try {
    // Fetch the HTML content of the YouTube video page
    const { data } = await axios.get(videoUrl);
    const $ = cheerio.load(data);

    // Extract the video title from the page's title
    const title = $('title').text().replace(' - YouTube', '');

    // Extract the video ID from the URL (after the 'v=' parameter)
    const videoId = videoUrl.split('v=')[1];

    // Construct the video thumbnail URL
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Prepare data to be written to CSV
    const csvData = `"${videoId}","${title}","${videoUrl}","${thumbnailUrl}",""\n`;

    // Append the data to the CSV file
    fs.appendFileSync(filePath, csvData);

    // Respond with a success message
    res.json({ message: 'Video added successfully!' });

  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ message: 'Failed to add video', error: error.message });
  }
});

// Define the route to fetch the CSV data
app.get('/get-csv-data', (req, res) => {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'CSV file not found' });
  }

  const csvData = fs.readFileSync(filePath, 'utf-8');
  
  // Split the CSV data into rows and columns, and convert it to JSON format
  const rows = csvData.split('\n');
  const result = rows.map(row => {
    if (row.trim() === '') return null;

    const columns = row.split(',');

    if (columns.length < 5) return null;

    return {
      id: columns[0].replace(/"/g, ''),
      title: columns[1].replace(/"/g, ''),
      video: columns[2].replace(/"/g, ''),
      thumnails: columns[3].replace(/"/g, ''),
      deletedate: columns[4].replace(/"/g, ''),
      saved: (columns[5] || '').replace(/"/g, '')
    };
  }).filter(row => row !== null);

  // Remove the header row (if present)
  result.shift();

  // Send the CSV data as JSON
  res.json(result);
});

// Define the route to handle the POST request for deleting a video
app.post('/delete-video', (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ message: 'Missing videoId in request' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'CSV file not found' });
  }

  const csvData = fs.readFileSync(filePath, 'utf-8');
  const rows = csvData.split('\n');

  let updatedCsv = '';
  let videoFound = false;

  // Safe date format: "YYYY-MM-DD HH:mm:ss"
  const currentDate = new Date().toISOString().replace('T', ' ').split('.')[0];

  rows.forEach(row => {
    if (row.trim() === '') return;

    let columns = row.split(',');

    // Skip malformed rows
    if (columns.length < 5) {
      updatedCsv += row + '\n';
      return;
    }

    const currentId = columns[0].replace(/"/g, '');

    if (currentId === videoId) {
      columns[4] = `"${currentDate}"`;
      videoFound = true;
    }

    updatedCsv += columns.join(',') + '\n';
  });

  if (!videoFound) {
    return res.status(404).json({ message: 'Video not found' });
  }

  fs.writeFileSync(filePath, updatedCsv.trim());
  res.json({ message: 'Video marked as deleted' });
});

// Define the route to handle the POST request for saving a video
app.post('/save-video', (req, res) => {
  const { videoId } = req.body;

  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'CSV file not found' });

  const csvData = fs.readFileSync(filePath, 'utf-8');
  const rows = csvData.split('\n');
  let updatedCsv = '';
  let videoFound = false;

  rows.forEach(row => {
    if (row.trim() === '') return;
    let columns = row.split(',');
    if (columns.length < 6) columns.push('""'); // Add "saved" column if missing

    if (columns[0].replace(/"/g, '') === videoId) {
      columns[5] = `"saved"`; // Set saved status
      videoFound = true;
    }

    updatedCsv += columns.join(',') + '\n';
  });

  if (!videoFound) return res.status(404).json({ message: 'Video not found' });

  fs.writeFileSync(filePath, updatedCsv.trim());
  res.json({ message: 'Video marked as saved' });
});

// Define the route to handle the POST request for removing the saved status of a video
app.post('/remove-saved-video', (req, res) => {
  const { videoId } = req.body;

  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'CSV file not found' });

  const csvData = fs.readFileSync(filePath, 'utf-8');
  const rows = csvData.split('\n');
  let updatedCsv = '';
  let videoFound = false;

  rows.forEach(row => {
    if (row.trim() === '') return;
    let columns = row.split(',');
    if (columns.length < 6) columns.push('""');

    if (columns[0].replace(/"/g, '') === videoId) {
      columns[5] = `""`; // Clear saved status
      videoFound = true;
    }

    updatedCsv += columns.join(',') + '\n';
  });

  if (!videoFound) return res.status(404).json({ message: 'Video not found' });

  fs.writeFileSync(filePath, updatedCsv.trim());
  res.json({ message: 'Saved status removed' });
});

// Start the server and listen on port 3000
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
