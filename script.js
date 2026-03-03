document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const videoUrlInput = document.getElementById('videoUrl');
    const resultContainer = document.getElementById('resultContainer');
    const errorContainer = document.getElementById('errorContainer');
    const videoTitleStr = document.getElementById('videoTitle');
    const downloadLink = document.getElementById('downloadLink');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const tabs = document.querySelectorAll('.platform-tabs li');

    // Handle Input Changes to show/hide Clear Button
    videoUrlInput.addEventListener('input', () => {
        if (videoUrlInput.value.trim() !== '') {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    });

    // Handle Clear Button click
    clearBtn.addEventListener('click', () => {
        videoUrlInput.value = '';
        clearBtn.style.display = 'none';
        videoUrlInput.focus();
    });

    // Attach click listeners for tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked
            tab.classList.add('active');

            // Change placeholder based on platform
            const platform = tab.getAttribute('data-platform');
            if (platform === 'youtube') videoUrlInput.placeholder = "Paste YouTube link here...";
            if (platform === 'tiktok') videoUrlInput.placeholder = "Paste TikTok link here...";
            if (platform === 'facebook') videoUrlInput.placeholder = "Paste Facebook link here...";
        });
    });

    // Paste button functionality
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                videoUrlInput.value = text;

                if (text.trim() !== '') {
                    clearBtn.style.display = 'block';
                }
            } catch (err) {
                console.error('Failed to read clipboard contents: ', err);
                showError("Cannot access clipboard. Please grant permission or paste manually.");
            }
        });
    }

    downloadBtn.addEventListener('click', processDownload);

    // Support hitting Enter in the input field
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processDownload();
        }
    });

    async function processDownload() {
        const url = videoUrlInput.value.trim();

        if (!url) {
            showError("Please enter a valid video URL.");
            return;
        }

        // Reset UI State
        hideError();
        resultContainer.classList.add('hidden');
        setLoadingState(true);

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            // Attempt to parse JSON response
            let data;
            try {
                data = await response.json();
            } catch (err) {
                throw new Error("Invalid response from server. Is the backend running?");
            }

            if (!response.ok) {
                // Display specific error string returned by server or fallback message
                throw new Error(data.error || 'Failed to fetch video information.');
            }

            // Success: Update UI with result
            videoTitleStr.textContent = data.title || "Unknown Title";
            downloadLink.href = data.download_url;

            // Depending on cross-origin settings of the resource, the 'download' attribute 
            // might not work, but we keep it just in case. The helper-text in HTML informs the user.
            downloadLink.setAttribute('download', 'video.mp4');

            // Show result block
            resultContainer.classList.remove('hidden');

        } catch (error) {
            console.error("Download Request Error:", error);
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            downloadBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            downloadBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }
});
