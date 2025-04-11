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
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;  // Corrected URL format

    // Prepare data to be written to CSV
    const csvData = `"${videoId}","${title}","${videoUrl}","${thumbnailUrl}",""\n`;

    // Define the path to the data.csv file
    const filePath = path.join(__dirname, 'data.csv');

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
  const filePath = path.join(__dirname, 'data.csv');
  
  // Check if the CSV file exists
  if (fs.existsSync(filePath)) {
    const csvData = fs.readFileSync(filePath, 'utf-8');
    
    // Split the CSV data into rows and columns, and convert it to JSON format
    const rows = csvData.split('\n');
    const result = rows.map(row => {
      // Ignore empty rows and handle potential issues with missing columns
      if (row.trim() === '') return null;

      const columns = row.split(',');

      // Ensure we have the correct number of columns, if not return null
      if (columns.length < 5) return null;

      return {
        id: columns[0].replace(/"/g, ''),
        title: columns[1].replace(/"/g, ''),
        video: columns[2].replace(/"/g, ''),
        thumnails: columns[3].replace(/"/g, ''),
        deletedate: columns[4].replace(/"/g, ''),
      };
    }).filter(row => row !== null);  // Filter out any null values

    // Remove the header row (if present)
    result.shift();

    // Send the CSV data as JSON
    res.json(result);
  } else {
    res.status(404).json({ message: 'CSV file not found' });
  }
});

// Define the route to handle the POST request for deleting a video
app.post('/delete-video', (req, res) => {
  const { videoId } = req.body;

  const filePath = path.join(__dirname, 'data.csv');

  if (fs.existsSync(filePath)) {
    const csvData = fs.readFileSync(filePath, 'utf-8');
    
    const rows = csvData.split('\n');
    let updatedCsv = '';

    let videoFound = false;
    const currentDate = new Date().toLocaleString();  // Get current date and time

    rows.forEach(row => {
      if (row.trim() === '') return;
      
      const columns = row.split(',');

      // If the video ID matches, update the deletedate column
      if (columns[0].replace(/"/g, '') === videoId) {
        columns[4] = `"${currentDate}"`;  // Update deletedate with the current date
        videoFound = true;
      }

      updatedCsv += columns.join(',') + '\n';
    });

    if (!videoFound) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Write the updated data back to the CSV file
    fs.writeFileSync(filePath, updatedCsv.trim());

    // Respond with a success message
    res.json({ message: 'Video marked as deleted' });
  } else {
    res.status(404).json({ message: 'CSV file not found' });
  }
});

// Define the route to handle the POST request for deleting a video
app.post('/delete-video', (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ message: 'Missing videoId in request' });
  }

  const filePath = path.join(__dirname, 'data.csv');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'CSV file not found' });
  }

  const csvData = fs.readFileSync(filePath, 'utf-8');
  const rows = csvData.split('\n');

  let updatedCsv = '';
  let videoFound = false;
  const currentDate = new Date().toLocaleString();

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


// Start the server and listen on port 3000
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
