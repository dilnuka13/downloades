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

        // අපි දැන් සම්පූර්ණ අඩවියම එකම තැනක (Railway) Run කරන නිසා කෙළින්ම එතනම API එක ගන්නවා.
        const API_BASE_URL = window.location.origin;

        try {
            const response = await fetch(`${API_BASE_URL}/api/download`, {
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

            const sourceBadge = document.getElementById('sourceBadge');
            const sourceIcon = document.getElementById('sourceIcon');
            const sourceText = document.getElementById('sourceText');

            if (data.source) {
                let iconClass = 'fa-solid fa-link';
                let sourceName = data.source;
                let sourceColor = '#ffffff';

                if (data.source.toLowerCase().includes('youtube')) {
                    iconClass = 'fa-brands fa-youtube';
                    sourceName = 'YouTube';
                    sourceColor = '#ff0000';
                } else if (data.source.toLowerCase().includes('tiktok')) {
                    iconClass = 'fa-brands fa-tiktok';
                    sourceName = 'TikTok';
                    sourceColor = '#ffffff';
                } else if (data.source.toLowerCase().includes('facebook')) {
                    iconClass = 'fa-brands fa-facebook';
                    sourceName = 'Facebook';
                    sourceColor = '#1877f2';
                } else if (data.source.toLowerCase().includes('instagram')) {
                    iconClass = 'fa-brands fa-instagram';
                    sourceName = 'Instagram';
                    sourceColor = '#e1306c';
                }

                sourceIcon.className = iconClass;
                sourceIcon.style.color = sourceColor;
                sourceText.textContent = sourceName;
                sourceBadge.classList.remove('hidden');
            } else {
                sourceBadge.classList.add('hidden');
            }

            const videoThumbnail = document.getElementById('videoThumbnail');
            if (data.thumbnail) {
                videoThumbnail.src = data.thumbnail;
                videoThumbnail.classList.remove('hidden');
            } else {
                videoThumbnail.classList.add('hidden');
            }

            const formatSelect = document.getElementById('formatSelect');
            const mediaTypeSelect = document.getElementById('mediaTypeSelect');
            formatSelect.innerHTML = ''; // clear old options

            if (data.formats && data.formats.length > 0) {

                // Show/hide based on content availability
                const hasVideo = data.formats.some(f => f.category === 'Video');
                const hasAudio = data.formats.some(f => f.category === 'Audio');

                mediaTypeSelect.innerHTML = '';
                if (hasVideo) {
                    const opt = document.createElement('option');
                    opt.value = 'Video';
                    opt.textContent = 'Video';
                    mediaTypeSelect.appendChild(opt);
                }
                if (hasAudio) {
                    const opt = document.createElement('option');
                    opt.value = 'Audio';
                    opt.textContent = 'Audio';
                    mediaTypeSelect.appendChild(opt);
                }

                // Trigger population on category change
                mediaTypeSelect.onchange = () => populateFormats(mediaTypeSelect.value);

                function populateFormats(category) {
                    formatSelect.innerHTML = '';
                    const filteredFormats = data.formats.filter(f => f.category === category);

                    filteredFormats.forEach((fmt) => {
                        const option = document.createElement('option');
                        // Track original index
                        const origIndex = data.formats.indexOf(fmt);
                        option.value = origIndex;

                        const displaySize = fmt.size !== 'N/A' ? ` | ${fmt.size}` : '';
                        const displayBitrate = fmt.bitrate !== 'N/A' ? ` | ${fmt.bitrate}` : '';

                        // Example: "MP4 - 1080p - With Audio | 50.0 MB | 1500kbps"
                        let label = `${fmt.ext.toUpperCase()}`;
                        if (category === 'Video') {
                            label += ` - ${fmt.resolution} - ${fmt.mute_status}`;
                        } else {
                            label += ` - ${fmt.mute_status}`;
                        }
                        label += `${displaySize}${displayBitrate}`;

                        option.textContent = label;
                        formatSelect.appendChild(option);
                    });

                    if (filteredFormats.length > 0) {
                        updateLinkUI(filteredFormats[0], data.title);
                    }
                }

                // Initial populate
                if (mediaTypeSelect.options.length > 0) {
                    populateFormats(mediaTypeSelect.value);
                }

                // Add event listener to update link on change
                formatSelect.onchange = (e) => {
                    const selectedFmt = data.formats[e.target.value];
                    updateLinkUI(selectedFmt, data.title);
                };

            } else if (data.download_url) {
                // Fallback (rare) if API changes
                const option = document.createElement('option');
                option.textContent = 'Default Best Format';
                formatSelect.appendChild(option);
                updateLinkUI({ url: data.download_url, ext: 'mp4' }, data.title);
            }

            function updateLinkUI(fmt, title) {
                // Generate proxy URL to enforce the download filename
                const proxyUrl = `${API_BASE_URL}/api/proxy?url=${encodeURIComponent(fmt.url)}&title=${encodeURIComponent(title)}`;
                downloadLink.href = proxyUrl;
                downloadLink.setAttribute('download', `${title}.${fmt.ext}`);
            }

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
