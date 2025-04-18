function showaddvideo() {
  document.getElementById("overlay").style.visibility = 'visible';
  document.getElementById("addvideo-popup").style.visibility = 'visible';
}

function hideaddvideo() {
  document.getElementById("overlay").style.visibility = 'hidden';
  document.getElementById("addvideo-popup").style.visibility = 'hidden';
}

// Function to extract video ID and normalize to standard URL
function extractVideoId(url) {
  try {
    let videoId = '';

    if (url.includes('youtube.com')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v');
    } else if (url.includes('youtu.be')) {
      const urlObj = new URL(url);
      videoId = urlObj.pathname.split('/')[1];
    }

    if (videoId) {
      videoId = videoId.split('&')[0];
    }

    return videoId;
  } catch (error) {
    console.error('Invalid YouTube URL:', url);
    return null;
  }
}

// Function to send the YouTube video URL to the backend and add it to data.csv
async function addVideo() {
  document.getElementById("overlay").style.visibility = 'hidden';
  document.getElementById("addvideo-popup").style.visibility = 'hidden';
  var inputUrl = document.getElementById("video-url").value;
  document.getElementById("video-url").value = "";
  const videoId = extractVideoId(inputUrl);

  if (!videoId) {
    alert("Invalid YouTube URL!");
    return;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const videoExists = videoList.some(video => video.video === videoUrl);
  if (videoExists) {
    alert('This video is already added!');
    return;
  }

  try {
    const data = { videoUrl: videoUrl };

    const response = await fetch('http://localhost:3000/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(result.message);
      updatelist(false); // No shuffle
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
    .then(response => response.json())
    .then(data => {
      videoList = data;
      console.log('Video List:', videoList);
    })
    .catch(error => {
      console.error('Error fetching CSV data:', error);
    });
}

// Shuffle an array function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Create Videos List with Correct Aspect Ratio for Thumbnails and Random Order
function updatelist(shouldShuffle = false) {
  fetchCSVData().then(() => {
    let content = "";

    const filteredVideoList = videoList.filter(video => video.deletedate === "");

    if (shouldShuffle) {
      shuffleArray(filteredVideoList);
    }

    for (let i = 0; i < filteredVideoList.length; i++) {
      let originalTitle = filteredVideoList[i].title;
      let shortTitle = originalTitle.length > 65 ? originalTitle.slice(0, 47) + '...' : originalTitle;

      let video = `
      <div class="video">
        <img src="${filteredVideoList[i].thumnails}" alt="Video Thumbnail" class="video-thumbnail">
        <p title="${originalTitle}">${shortTitle}</p>
        <div class="buttons">
          <button id="watch-btn" onclick="watch('${filteredVideoList[i].id}')">
            <span class="material-icons">slideshow</span>
          </button>
          <button id="save-btn" type="button" onclick="save('${filteredVideoList[i].id}')">
            <span class="material-icons">bookmark</span>
          </button>
          <button id="delete-btn" onclick="deleteVideo('${filteredVideoList[i].id}')">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>`;
      content += video;
    }

    document.getElementById("content").innerHTML = content;

    document.querySelectorAll('#delete-btn').forEach(button => {
      button.addEventListener('click', function () {
        const videoId = button.getAttribute('data-id');
        deleteVideo(videoId);
      });
    });
  }).catch(error => {
    console.error('Error updating the video list:', error);
  });
}

// Call the function to display the video list
updatelist(true);

// Delete video function
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
      updatelist(false); // No shuffle
    } else {
      const error = await response.json();
      console.error('Error deleting video:', error.message);
    }
  } catch (error) {
    console.error('Error deleting video:', error);
  }
}

// Watch video function
function watch(videoId) {
  document.getElementById("return-btn").style.visibility = 'visible';
  document.getElementById("content").style.visibility = 'hidden';
  document.getElementById("video-player").style.visibility = 'visible';
  const videoElement = document.getElementById("current-video");
  if (videoElement) {
    videoElement.src = `https://www.youtube.com/embed/${videoId}`;
  } else {
    console.error('Element with id="current-video" not found.');
  }
}

// Save video function
async function save(videoId) {
  try {
    const response = await fetch('http://localhost:3000/save-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });

    const result = await response.json();
    console.log(result.message);
    updatelist(false); // No shuffle
  } catch (error) {
    console.error('Error saving video:', error);
  }
}

// Remove saved video function
async function removeSaved(videoId) {
  try {
    const response = await fetch('http://localhost:3000/remove-saved-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });

    const result = await response.json();
    console.log(result.message);
    updatelist(false); // No shuffle
  } catch (error) {
    console.error('Error removing saved status:', error);
  }
}

// Show saved videos function
function showSaved() {
  fetchCSVData().then(() => {
    document.getElementById("return-btn").style.visibility = 'hidden';
    document.getElementById("content").style.visibility = 'visible';
    document.getElementById("video-player").style.visibility = 'hidden';
    
    let content = "";

    // Filter videos that are saved and deleted
    const savedAndDeletedVideos = videoList.filter(
      video => video.saved === 'saved'
    );

    for (let i = 0; i < savedAndDeletedVideos.length; i++) {
      let originalTitle = savedAndDeletedVideos[i].title;
      let shortTitle = originalTitle.length > 65 ? originalTitle.slice(0, 47) + '...' : originalTitle;

      let video = `
      <div class="video">
        <img src="${savedAndDeletedVideos[i].thumnails}" alt="Video Thumbnail" class="video-thumbnail">
        <p title="${originalTitle}">${shortTitle}</p>
        <p class="deleted-note">[Deleted from server]</p>
        <div class="buttons">
          <button id="watch-btn" onclick="watch('${savedAndDeletedVideos[i].id}')">
            <span class="material-icons">slideshow</span>
          </button>
          <button id="remove-saved-btn" onclick="removeSaved('${savedAndDeletedVideos[i].id}')">
            <span class="material-icons">bookmark_remove</span>
          </button>
        </div>
      </div>`;
      content += video;
    }

    document.getElementById("content").innerHTML = content;
  });
}

function VideoReturn(){
  document.getElementById("return-btn").style.visibility = 'hidden';
  document.getElementById("content").style.visibility = 'visible';
  document.getElementById("video-player").style.visibility = 'hidden';
}