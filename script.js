function showaddvideo() {
  document.getElementById("overlay").style.visibility = 'visible';
  document.getElementById("addvideo-popup").style.visibility = 'visible';
}

function hideaddvideo() {
  document.getElementById("overlay").style.visibility = 'hidden';
  document.getElementById("addvideo-popup").style.visibility = 'hidden';
}

// Function to send the YouTube video URL to the backend and add it to data.csv
async function addVideo() {
  var videoUrl = document.getElementById("video-url").value;

  // Check if the video URL is already in the video list
  const videoExists = videoList.some(video => video.video === videoUrl);
  if (videoExists) {
      alert('This video is already added!');
      return;
  }

  try {
      // Prepare the data to be sent in the POST request
      const data = { videoUrl: videoUrl };

      // Make the POST request to the server
      const response = await fetch('http://localhost:3000/proxy', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      });

      // Check if the response was successful
      if (response.ok) {
          const result = await response.json();
          console.log(result.message); // Success message
          updatelist();  // Update the video list after adding a new one
      } else {
          const error = await response.json();
          console.error('Error adding video:', error.message);
      }
  } catch (error) {
      console.error('Error adding video:', error);
  }
}

// Define a variable to store the list of objects
let videoList = [];

// Function to fetch CSV data from the server and store it in the variable
function fetchCSVData() {
  return fetch('http://localhost:3000/get-csv-data')
      .then(response => response.json())  // Parse the JSON response
      .then(data => {
          videoList = data;  // Store the fetched data in the variable
          console.log('Video List:', videoList);  // Display the list in the console
      })
      .catch(error => {
          console.error('Error fetching CSV data:', error);
      });
}

// Create Videos List with Correct Aspect Ratio for Thumbnails
function updatelist() {
  fetchCSVData().then(() => {
      let content = "";

      // Filter to include videos where deletedate is empty
      const filteredVideoList = videoList.filter(video => video.deletedate === "");

      // Iterate over the filtered list
      for (let i = 0; i < filteredVideoList.length; i++) {
          let video = `
          <div class="video">
              <img src="${filteredVideoList[i].thumnails}" alt="Video Thumbnail" class="video-thumbnail">
              <p>${filteredVideoList[i].title} </p>
              <div class="buttons">
                  <button id="watch-btn" onclick="watch('${filteredVideoList[i].id}')">Watch</button>
                  <button id="delete-btn" onclick="deleteVideo('${filteredVideoList[i].id}')">Remove</button>
              </div>
          </div>`;
          content = content + video;
      }

      document.getElementById("content").innerHTML = content;

      // Add event listeners for the buttons
      document.querySelectorAll('#delete-btn').forEach(button => {
          button.addEventListener('click', function() {
              const videoId = button.getAttribute('data-id');
              deleteVideo(videoId);
          });
      });
  }).catch(error => {
      console.error('Error updating the video list:', error);
  });
}

// Call the function to display the video list
updatelist();


async function deleteVideo(videoId) {
  try {
    const response = await fetch('http://localhost:3000/delete-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(result.message);
      updatelist(); // Refresh list after deletion
    } else {
      const error = await response.json();
      console.error('Error deleting video:', error.message);
    }
  } catch (error) {
    console.error('Error deleting video:', error);
  }
}

function watch(videoId) {
  document.getElementById("video-player").style.visibility = 'visible';
  const videoElement = document.getElementById("current-video");
  if (videoElement) {
    videoElement.src = `https://www.youtube.com/embed/${videoId}`;
  } else {
    console.error('Element with id="current-video" not found.');
  }
}