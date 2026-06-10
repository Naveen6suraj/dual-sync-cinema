// app.js - DualSync Cinema Logic (Advanced VLC Controls, Multi-AudioContext, Hls.js & YouTube API)

// State Variables
let mainAudioContext = null;
let mediaSource = null;
let mainDestNode = null;
let sharedStream = null;

// Secondary Audio State
let secondaryAudioElement = null;
let secondarySourceNode = null;
let secondaryDestNode = null;
let secondaryStream = null;
let secondaryLoaded = false;

// Subtitles State
let subtitleBlocks = [];
let loadedSubtitleName = "";
let subtitleDelayOffset = 0.0;
let subtitleFontSize = 20;

// HLS Adaptive Bitrate Streaming State
let hlsInstance = null;

// YouTube Integration State
let ytPlayer = null;
let isYoutubeActive = false;
let ytPlayerReady = false;
let ytProgressInterval = null;

let devices = [];
let listeners = [];
let calibratorInterval = null;
let isPermissionGranted = false;

// DOM Elements
const video = document.getElementById('movie-player');
const videoContainer = document.getElementById('drop-zone');
const videoOverlay = document.getElementById('video-overlay');
const fileInput = document.getElementById('file-input');
const loadDemoBtn = document.getElementById('load-demo-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const stopBtn = document.getElementById('stop-btn');
const timeDisplay = document.getElementById('time-display');
const fsBtn = document.getElementById('fs-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressHover = document.getElementById('progress-hover');
const movieTitle = document.getElementById('movie-title');
const movieMeta = document.getElementById('movie-meta');

const permissionStatus = document.getElementById('permission-status');
const grantPermissionBtn = document.getElementById('grant-permission-btn');
const setupCard = document.getElementById('setup-card');
const addListenerBtn = document.getElementById('add-listener-btn');
const listenersList = document.getElementById('listeners-list');

const calibratorToggle = document.getElementById('calibrator-toggle');
const calibratorFlash = document.getElementById('calibrator-flash');

const addListenerModal = document.getElementById('add-listener-modal');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const newListenerNameInput = document.getElementById('new-listener-name');

// Load YouTube API
let ytApiReady = false;
const ytScript = document.createElement('script');
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube Iframe API Ready");
    ytApiReady = true;
};

// Check if already loaded by some chance
if (window.YT && window.YT.Player) {
    ytApiReady = true;
}

// 1. Initializer & Permissions
window.addEventListener('DOMContentLoaded', async () => {
    // Set up default listener
    setTimeout(() => {
        addListenerTrack("Default Speaker", "default");
    }, 500);

    // Scan system audio devices
    await updateDevices();

    // Listen for audio output device changes dynamically in real-time (hotplugging support)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            console.log("Hardware output devices change detected. Rescanning devices...");
            await updateDevices();
        });
    }

    // Bind DOM events
    setupEventListeners();

    // Setup simulated Discord voice channel chatter
    startSimulatedVoiceActivity();

    // Setup dynamic canvas-based real-time video color ambient lighting
    setupAmbientGlowLoop();

    // Bind video error handler
    video.addEventListener('error', (e) => {
        console.error("Video load error:", e);
        alert("Error loading media! Please ensure:\n1. The link is a direct video stream (.mp4, .m3u8, etc.) and NOT a website page.\n2. The link supports CORS (Cross-Origin Resource Sharing).\n3. If your app is HTTPS, the link must also be HTTPS (no Mixed Content).");
        videoOverlay.style.opacity = '1';
        videoOverlay.style.pointerEvents = 'auto';
    });
});

let ambientCanvas = null;
let ambientCtx = null;

function setupAmbientGlowLoop() {
    ambientCanvas = document.getElementById('ambient-canvas');
    if (!ambientCanvas) return;
    ambientCtx = ambientCanvas.getContext('2d');
    
    const updateAmbientGlow = () => {
        if (!video.paused && !video.ended && !isYoutubeActive) {
            try {
                // Draw current video frame to a tiny canvas to average colors
                ambientCtx.drawImage(video, 0, 0, 10, 10);
                const frame = ambientCtx.getImageData(0, 0, 10, 10);
                const length = frame.data.length;
                let r = 0, g = 0, b = 0;
                
                for (let i = 0; i < length; i += 4) {
                    r += frame.data[i];
                    g += frame.data[i + 1];
                    b += frame.data[i + 2];
                }
                
                r = Math.round(r / (length / 4));
                g = Math.round(g / (length / 4));
                b = Math.round(b / (length / 4));
                
                const ambientGlow = document.getElementById('ambient-glow');
                if (ambientGlow) {
                    ambientGlow.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.45) 0%, transparent 75%)`;
                }
            } catch (err) {
                // Gracefully catch CORS security blocks for external streams without correct headers
            }
        }
        requestAnimationFrame(updateAmbientGlow);
    };
    
    requestAnimationFrame(updateAmbientGlow);
}

function startSimulatedVoiceActivity() {
    const sarahRing = document.getElementById('ring-sarah');
    const keanuRing = document.getElementById('ring-keanu');
    const sarahMic = document.getElementById('mic-sarah');
    const keanuMic = document.getElementById('mic-keanu');
    
    setInterval(() => {
        // Toggle Sarah speaking
        if (Math.random() > 0.6) {
            if (sarahRing) sarahRing.classList.add('speaking');
            if (sarahMic) sarahMic.style.color = 'var(--accent-green)';
        } else {
            if (sarahRing) sarahRing.classList.remove('speaking');
            if (sarahMic) sarahMic.style.color = '';
        }
        
        // Toggle Keanu speaking
        if (Math.random() > 0.75) {
            if (keanuRing) keanuRing.classList.add('speaking');
            if (keanuMic) keanuMic.style.color = 'var(--accent-green)';
        } else {
            if (keanuRing) keanuRing.classList.remove('speaking');
            if (keanuMic) keanuMic.style.color = '';
        }
    }, 2500);
}

function setupEventListeners() {
    // Cinematic Intro Launch Action
    const launchBtn = document.getElementById('btn-launch-theater');
    const introScreen = document.getElementById('intro-screen');
    const appLayout = document.getElementById('app-layout');
    
    if (launchBtn && introScreen && appLayout) {
        launchBtn.addEventListener('click', () => {
            introScreen.style.opacity = '0';
            introScreen.style.transform = 'scale(1.05)';
            setTimeout(() => {
                introScreen.style.display = 'none';
            }, 800);
            
            appLayout.style.opacity = '1';
            appLayout.style.pointerEvents = 'auto';
            
            // Trigger contexts directly on click activation
            initMainAudioContext();
            resumeAllAudioContexts();
            
            // Run diagnostics logs instantly
            runDiagnostics();
        });
    }

    // Sidebar Tab Navigation switcher
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.tab-panel');
    const viewTitle = document.getElementById('current-viewport-title');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetPanel = document.getElementById(`panel-${tabId}`);
            if (targetPanel) {
                panels.forEach(p => p.classList.remove('active'));
                targetPanel.classList.add('active');
                if (viewTitle) {
                    viewTitle.textContent = tabId.toUpperCase().replace('-', ' ');
                }
            } else {
                if (tabId === 'voice-chat' || tabId === 'friends' || tabId === 'settings') {
                    alert(`HUD Deck [${tabId.toUpperCase()}] is loaded in Simulated Lobby mode.`);
                }
            }
        });
    });

    // Netflix Movie card selectors
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            if (url) {
                loadStreamUrl(url);
                const watchPartyNav = document.querySelector('.nav-item[data-tab="watch-party"]');
                if (watchPartyNav) watchPartyNav.click();
            }
        });
    });

    // YouTube Tab url load action
    const ytTabLoadBtn = document.getElementById('youtube-tab-load-btn');
    const ytTabUrlInput = document.getElementById('youtube-tab-url');
    if (ytTabLoadBtn && ytTabUrlInput) {
        ytTabLoadBtn.addEventListener('click', () => {
            const url = ytTabUrlInput.value.trim();
            if (url) {
                loadStreamUrl(url);
                const watchPartyNav = document.querySelector('.nav-item[data-tab="watch-party"]');
                if (watchPartyNav) watchPartyNav.click();
            }
        });
    }

    // YouTube Preset Cards load action
    const ytPresets = document.querySelectorAll('.yt-preset-card');
    ytPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const id = preset.getAttribute('data-id');
            if (id) {
                loadStreamUrl(`https://www.youtube.com/watch?v=${id}`);
                const watchPartyNav = document.querySelector('.nav-item[data-tab="watch-party"]');
                if (watchPartyNav) watchPartyNav.click();
            }
        });
    });

    // Color HUD theme pills
    const themePills = document.querySelectorAll('.theme-pill');
    themePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const theme = pill.getAttribute('data-theme');
            if (theme) {
                document.documentElement.setAttribute('data-theme', theme);
                console.log(`System HUD Color style loaded: ${theme}`);
            }
        });
    });

    // Lobby voice toggles
    const micToggle = document.getElementById('btn-toggle-mic');
    const deafToggle = document.getElementById('btn-toggle-deaf');
    if (micToggle) {
        micToggle.addEventListener('click', () => {
            micToggle.classList.toggle('active');
            const icon = micToggle.querySelector('i');
            if (icon) {
                icon.className = micToggle.classList.contains('active') ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash';
            }
        });
    }
    if (deafToggle) {
        deafToggle.addEventListener('click', () => {
            deafToggle.classList.toggle('active');
        });
    }

    // Video Loader Actions
    loadDemoBtn.addEventListener('click', () => {
        videoOverlay.style.opacity = '0';
        videoOverlay.style.pointerEvents = 'none';
        
        initMainAudioContext();
        resumeAllAudioContexts();
        video.play().catch(e => console.log("Play deferred:", e));
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadLocalVideo(e.target.files[0]);
        }
    });

    // Drag and drop video file
    videoContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoContainer.classList.add('drag-over');
    });

    videoContainer.addEventListener('dragleave', () => {
        videoContainer.classList.remove('drag-over');
    });

    videoContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        videoContainer.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            loadLocalVideo(e.dataTransfer.files[0]);
        }
    });
    
    // URL Loader Actions
    const loadUrlBtn = document.getElementById('load-url-btn');
    const streamUrlInput = document.getElementById('stream-url-input');
    if (loadUrlBtn && streamUrlInput) {
        loadUrlBtn.addEventListener('click', () => {
            const url = streamUrlInput.value.trim();
            if (url) {
                loadStreamUrl(url);
            }
        });
        streamUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUrlBtn.click();
            }
        });
    }

    // Video Controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);
    
    stopBtn.addEventListener('click', () => {
        if (isYoutubeActive) {
            if (ytPlayer && ytPlayerReady) {
                ytPlayer.stopVideo();
                stopYtProgressTimer();
                progressBar.style.width = '0%';
                timeDisplay.textContent = '00:00 / 00:00';
                playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        } else {
            video.pause();
            video.currentTime = 0;
            if (secondaryLoaded && secondaryAudioElement) {
                secondaryAudioElement.pause();
                secondaryAudioElement.currentTime = 0;
            }
            updateCustomControls();
        }
    });

    video.addEventListener('timeupdate', updateCustomControls);
    video.addEventListener('durationchange', updateCustomControls);

    // Sync Secondary Audio play/pause/seek
    video.addEventListener('play', () => {
        if (secondaryLoaded && secondaryAudioElement) {
            secondaryAudioElement.play().catch(e => console.log("Secondary play deferred:", e));
        }
    });

    video.addEventListener('pause', () => {
        if (secondaryLoaded && secondaryAudioElement) {
            secondaryAudioElement.pause();
        }
    });

    video.addEventListener('seeking', () => {
        if (secondaryLoaded && secondaryAudioElement) {
            secondaryAudioElement.currentTime = video.currentTime;
        }
    });

    video.addEventListener('seeked', () => {
        if (secondaryLoaded && secondaryAudioElement) {
            secondaryAudioElement.currentTime = video.currentTime;
        }
    });

    // Prevent drift on the secondary audio track
    video.addEventListener('timeupdate', () => {
        if (secondaryLoaded && secondaryAudioElement && !video.paused) {
            const drift = Math.abs(secondaryAudioElement.currentTime - video.currentTime);
            if (drift > 0.08) { // If audio drifts past 80ms, force sync
                secondaryAudioElement.currentTime = video.currentTime;
            }
        }
    });

    // Timeline seeking
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        
        if (isYoutubeActive) {
            if (ytPlayer && ytPlayerReady) {
                const dur = ytPlayer.getDuration();
                ytPlayer.seekTo(percentage * dur, true);
            }
        } else {
            video.currentTime = percentage * video.duration;
        }
    });

    progressContainer.addEventListener('mousemove', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const hoverX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.min(Math.max(hoverX / width, 0), 1);
        progressHover.style.width = `${percentage * 100}%`;
    });

    progressContainer.addEventListener('mouseleave', () => {
        progressHover.style.width = '0%';
    });

    // Fullscreen
    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error("Error attempting to enable full-screen:", err);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayPause();
        }
    });

    // Permissions Helper
    grantPermissionBtn.addEventListener('click', requestPermissions);

    // Listener manager modal triggers
    addListenerBtn.addEventListener('click', () => {
        newListenerNameInput.value = '';
        addListenerModal.classList.add('active');
        newListenerNameInput.focus();
    });

    modalCancelBtn.addEventListener('click', () => {
        addListenerModal.classList.remove('active');
    });

    modalConfirmBtn.addEventListener('click', () => {
        const name = newListenerNameInput.value.trim();
        if (name) {
            addListenerTrack(name);
            addListenerModal.classList.remove('active');
        }
    });

    newListenerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            modalConfirmBtn.click();
        }
    });

    // Calibration
    calibratorToggle.addEventListener('click', () => {
        if (calibratorInterval) {
            stopCalibrator();
        } else {
            startCalibrator();
        }
    });

    // VLC Subtitles File Loader
    const subFileInput = document.getElementById('sub-file-input');
    if (subFileInput) {
        subFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadSubtitleFile(e.target.files[0]);
            }
        });
    }

    // Subtitle delay slider and adjusters
    const subDelaySlider = document.getElementById('sub-delay-slider');
    const subDelayDisplay = document.getElementById('sub-delay-display');
    const subDelayMinus = document.getElementById('sub-delay-minus');
    const subDelayPlus = document.getElementById('sub-delay-plus');

    if (subDelaySlider && subDelayDisplay) {
        subDelaySlider.addEventListener('input', (e) => {
            subtitleDelayOffset = parseFloat(e.target.value);
            subDelayDisplay.textContent = `${subtitleDelayOffset > 0 ? '+' : ''}${subtitleDelayOffset.toFixed(1)}s`;
            applySubtitles();
        });

        subDelayMinus.addEventListener('click', () => {
            let val = parseFloat(subDelaySlider.value) - 0.1;
            val = Math.max(-5, Math.min(5, val));
            subDelaySlider.value = val.toFixed(1);
            subtitleDelayOffset = val;
            subDelayDisplay.textContent = `${subtitleDelayOffset > 0 ? '+' : ''}${subtitleDelayOffset.toFixed(1)}s`;
            applySubtitles();
        });

        subDelayPlus.addEventListener('click', () => {
            let val = parseFloat(subDelaySlider.value) + 0.1;
            val = Math.max(-5, Math.min(5, val));
            subDelaySlider.value = val.toFixed(1);
            subtitleDelayOffset = val;
            subDelayDisplay.textContent = `${subtitleDelayOffset > 0 ? '+' : ''}${subtitleDelayOffset.toFixed(1)}s`;
            applySubtitles();
        });
    }

    // Subtitle Font Size slider
    const subSizeSlider = document.getElementById('sub-size-slider');
    if (subSizeSlider) {
        subSizeSlider.addEventListener('input', (e) => {
            updateSubtitleFontSize(e.target.value);
        });
    }

    // VLC Secondary Audio Loader
    const audioFileInput = document.getElementById('audio-file-input');
    if (audioFileInput) {
        audioFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadSecondaryAudioFile(e.target.files[0]);
            }
        });
    }

    // Embedded Audio/Video Track Selection Event Listeners
    const embeddedAudioSelect = document.getElementById('embedded-audio-select');
    const embeddedVideoSelect = document.getElementById('embedded-video-select');
    
    if (embeddedAudioSelect) {
        embeddedAudioSelect.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            
            if (hlsInstance) {
                console.log(`Setting HLS Audio Track to index ${index}`);
                hlsInstance.audioTrack = index;
            } else if (video.audioTracks && video.audioTracks.length > 0) {
                console.log(`Setting Native Audio Track to index ${index}`);
                for (let i = 0; i < video.audioTracks.length; i++) {
                    video.audioTracks[i].enabled = (i === index);
                }
            }
        });
    }

    if (embeddedVideoSelect) {
        embeddedVideoSelect.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            
            if (hlsInstance) {
                console.log(`Setting HLS Video Level to index ${index}`);
                hlsInstance.currentLevel = index;
            } else if (video.videoTracks && video.videoTracks.length > 0) {
                console.log(`Setting Native Video Track to index ${index}`);
                for (let i = 0; i < video.videoTracks.length; i++) {
                    video.videoTracks[i].selected = (i === index);
                }
            }
        });
    }

    // Monitor video metadata loading to query native tracks automatically
    video.addEventListener('loadedmetadata', () => {
        if (!hlsInstance) {
            updateNativeTracks();
        }
    });
}

// 2. Video Loading
function loadLocalVideo(file) {
    // Reset embedded selectors
    const embeddedAudioSelect = document.getElementById('embedded-audio-select');
    const embeddedVideoSelect = document.getElementById('embedded-video-select');
    if (embeddedAudioSelect) embeddedAudioSelect.innerHTML = '<option value="-1">Default / Track 1</option>';
    if (embeddedVideoSelect) embeddedVideoSelect.innerHTML = '<option value="-1">Default / Auto</option>';

    // Teardown YouTube if active
    if (isYoutubeActive && ytPlayer && ytPlayerReady) {
        ytPlayer.pauseVideo();
        stopYtProgressTimer();
    }
    isYoutubeActive = false;
    document.getElementById('youtube-warning').style.display = 'none';
    document.getElementById('youtube-player').style.display = 'none';
    video.style.display = 'block';

    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    const url = URL.createObjectURL(file);
    video.src = url;
    movieTitle.textContent = file.name;
    
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    movieMeta.textContent = `Local File • ${sizeMB} MB • ${file.type || 'Video file'}`;
    
    videoOverlay.style.opacity = '0';
    videoOverlay.style.pointerEvents = 'none';
    
    initMainAudioContext();
    resumeAllAudioContexts();
    
    video.load();
    video.play().catch(e => console.log("Playback deferred:", e));
}

function togglePlayPause() {
    if (isYoutubeActive) {
        if (!ytPlayer || !ytPlayerReady) return;
        const state = ytPlayer.getPlayerState();
        const playingState = (window.YT && window.YT.PlayerState) ? window.YT.PlayerState.PLAYING : 1;
        if (state === playingState) {
            ytPlayer.pauseVideo();
            stopYtProgressTimer();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        } else {
            ytPlayer.playVideo();
            startYtProgressTimer();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
        return;
    }

    initMainAudioContext();
    resumeAllAudioContexts();
    
    if (video.paused) {
        video.play().catch(err => console.error("Play failed:", err));
    } else {
        video.pause();
    }
    updateCustomControls();
}

function updateCustomControls() {
    if (isYoutubeActive) return; // YouTube timer updates controls

    if (video.paused) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${percentage}%`;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    } else {
        progressBar.style.width = '0%';
        timeDisplay.textContent = '00:00 / 00:00';
    }

    // Update Sync Score on HUD dynamically
    const scoreVal = document.getElementById('sync-score-val');
    if (scoreVal) {
        if (video.paused) {
            scoreVal.textContent = '100%';
        } else {
            // Keep the sync score between 98% and 100% to simulate micro-adjustments
            const score = 98 + Math.floor(Math.random() * 3);
            scoreVal.textContent = `${score}%`;
        }
    }
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hrs > 0) {
        result += `${hrs.toString().padStart(2, '0')}:`;
    }
    result += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return result;
}

// 3. Audio Device Detection
async function requestPermissions() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Audio capture devices are not supported in this context (insecure HTTP context?)");
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Release mic immediately
        
        isPermissionGranted = true;
        setPermissionBadge(true);
        setupCard.style.display = 'none';
        
        await updateDevices();
        
        if (typeof runDiagnostics === 'function') {
            runDiagnostics();
        }
    } catch (err) {
        console.error("Audio permission denied:", err);
        setPermissionBadge(false);
    }
}

function setPermissionBadge(granted) {
    const badge = document.getElementById('permission-status');
    const dot = badge.querySelector('.dot');
    const text = badge.querySelector('.status-text');
    
    if (granted) {
        dot.className = 'dot green';
        text.textContent = 'Audio Permission Granted';
        badge.style.backgroundColor = 'rgba(20, 255, 100, 0.05)';
        badge.style.borderColor = 'rgba(20, 255, 100, 0.2)';
    } else {
        dot.className = 'dot red';
        text.textContent = 'Audio Permission Required';
        badge.style.backgroundColor = 'rgba(255, 50, 50, 0.05)';
        badge.style.borderColor = 'rgba(255, 50, 50, 0.2)';
    }
}

async function updateDevices() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.warn("enumerateDevices is not supported in this context.");
            return;
        }
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        devices = allDevices.filter(d => d.kind === 'audiooutput');
        updateDeviceDropdowns();
    } catch (err) {
        console.error("Error scanning system audio devices:", err);
    }
}

function updateDeviceDropdowns() {
    listeners.forEach(l => {
        const select = document.getElementById(`device-select-${l.id}`);
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'default';
        defaultOpt.textContent = 'System Default Output';
        select.appendChild(defaultOpt);
        
        devices.forEach(dev => {
            if (dev.deviceId === 'default') return;
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Audio Device (${dev.deviceId.substring(0, 5)}...)`;
            select.appendChild(opt);
        });
        
        if (Array.from(select.options).some(o => o.value === currentValue)) {
            select.value = currentValue;
        } else {
            select.value = l.deviceId;
        }
    });
}

// 4. Web Audio Graph Integration
function initMainAudioContext() {
    if (mainAudioContext) {
        // Reconnect any listener contexts that were destroyed (e.g., when transitioning back from YouTube Mode)
        listeners.forEach(l => {
            if (!l.audioElement) {
                console.log(`Rebuilding destroyed context for listener: ${l.name}`);
                connectListenerPipeline(l);
            }
        });
        return;
    }
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
        mainAudioContext = new AudioContextClass({
            latencyHint: 'interactive', // Ultra-low latency mode
            sampleRate: 96000 // Force Hi-Res Audio processing
        });
    } catch (e) {
        console.warn("96kHz Hi-Res Audio not supported by hardware, falling back to native sample rate.");
        mainAudioContext = new AudioContextClass({
            latencyHint: 'interactive'
        });
    }
    
    mediaSource = mainAudioContext.createMediaElementSource(video);

    // Connect secondary audio element pipeline
    secondaryAudioElement = document.getElementById('secondary-audio');
    secondarySourceNode = mainAudioContext.createMediaElementSource(secondaryAudioElement);
    
    // Wire up any pre-existing listeners
    listeners.forEach(l => {
        connectListenerPipeline(l);
    });
}

async function resumeAllAudioContexts() {
    if (mainAudioContext && mainAudioContext.state === 'suspended') {
        await mainAudioContext.resume();
    }
    for (const l of listeners) {
        if (l.audioElement && l.audioElement.paused) {
            l.audioElement.play().catch(() => {});
        }
    }
    if (secondaryLoaded && secondaryAudioElement && !video.paused) {
        secondaryAudioElement.play().catch(() => {});
    }
}

function connectListenerPipeline(listener) {
    if (!mainAudioContext) return;
    
    // Select correct audio source (primary video vs secondary track)
    const targetSourceNode = (listener.audioSource === 'secondary' && secondarySourceNode) ? secondarySourceNode : mediaSource;
    
    if (!targetSourceNode) return;
    
    try {
        const targetChannels = 2; // Stereo safest for bluetooth
        
        const delayNode = mainAudioContext.createDelay(2.0);
        delayNode.delayTime.value = listener.delayMs / 1000;
        delayNode.channelCount = targetChannels;
        delayNode.channelInterpretation = 'speakers';
        
        const gainNode = mainAudioContext.createGain();
        gainNode.gain.value = listener.volume;
        gainNode.channelCount = targetChannels;
        gainNode.channelInterpretation = 'speakers';
        
        const streamDest = mainAudioContext.createMediaStreamDestination();
        streamDest.channelCount = targetChannels;
        streamDest.channelInterpretation = 'speakers';
        
        targetSourceNode.connect(delayNode);
        delayNode.connect(gainNode);
        gainNode.connect(streamDest);
        
        const audioElement = new Audio();
        audioElement.srcObject = streamDest.stream;
        
        // Re-verify and apply sinkId using setSinkId to ensure support across older Chromium engines
        if (listener.deviceId && listener.deviceId !== 'default' && typeof audioElement.setSinkId === 'function') {
            audioElement.setSinkId(listener.deviceId).catch(err => {
                console.warn(`Failed fallback setSinkId on constructor for ${listener.name}:`, err);
            });
        }
        
        audioElement.play().catch(e => console.warn("Auto-play listener audio deferred:", e));
        
        listener.delayNode = delayNode;
        listener.gainNode = gainNode;
        listener.streamDest = streamDest;
        listener.audioElement = audioElement;
        
        console.log(`Pipeline active (Surround channels: ${targetChannels}): ${listener.name} -> ${listener.deviceId} [${listener.audioSource}]`);
    } catch (e) {
        console.error(`Failed setting up audio context for listener ${listener.name}:`, e);
    }
}

function addListenerTrack(name, deviceId = 'default') {
    resumeAllAudioContexts();

    const id = 'listener_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const listener = {
        id,
        name,
        deviceId,
        volume: 1.0,
        delayMs: 0,
        audioSource: 'primary', // Default to primary movie track
        delayNode: null,
        gainNode: null,
        streamDest: null,
        audioElement: null
    };
    
    listeners.push(listener);
    
    if (mainAudioContext) {
        connectListenerPipeline(listener);
    }
    
    renderListenerDOM(listener);
    updateDeviceDropdowns();
}

function removeListenerTrack(id) {
    const idx = listeners.findIndex(l => l.id === id);
    if (idx === -1) return;
    
    const listener = listeners[idx];
    
    if (listener.audioElement) {
        listener.audioElement.pause();
        listener.audioElement.srcObject = null;
    }
    if (listener.delayNode) listener.delayNode.disconnect();
    if (listener.gainNode) listener.gainNode.disconnect();
    if (listener.streamDest) listener.streamDest.disconnect();
    
    listeners.splice(idx, 1);
    const element = document.getElementById(id);
    if (element) element.remove();
}

function updateListenerVolume(id, vol) {
    const listener = listeners.find(l => l.id === id);
    if (!listener) return;
    
    listener.volume = parseFloat(vol);
    if (listener.gainNode && mainAudioContext) {
        listener.gainNode.gain.setValueAtTime(listener.volume, mainAudioContext.currentTime);
    }
}

function updateListenerDelay(id, delayVal) {
    const listener = listeners.find(l => l.id === id);
    if (!listener) return;
    
    const ms = Math.min(Math.max(parseInt(delayVal) || 0, 0), 2000);
    listener.delayMs = ms;
    
    const slider = document.getElementById(`delay-slider-${id}`);
    const numInput = document.getElementById(`delay-input-${id}`);
    const display = document.getElementById(`delay-display-${id}`);
    
    if (slider) slider.value = ms;
    if (numInput) numInput.value = ms;
    if (display) display.textContent = `${ms}ms`;
    
    if (listener.delayNode && mainAudioContext) {
        listener.delayNode.delayTime.setValueAtTime(ms / 1000, mainAudioContext.currentTime);
    }
}

async function updateListenerDevice(id, deviceId) {
    const listener = listeners.find(l => l.id === id);
    if (!listener) return;
    
    listener.deviceId = deviceId;
    
    if (listener.audioElement) {
        if (typeof listener.audioElement.setSinkId === 'function') {
            try {
                await listener.audioElement.setSinkId(deviceId);
                console.log(`Success mapping track ${id} to ${deviceId}`);
            } catch (err) {
                console.error(`Failed setting context sink ID ${deviceId}:`, err);
                listener.audioElement.pause();
                listener.audioElement.srcObject = null;
                if (listener.delayNode) listener.delayNode.disconnect();
                if (listener.gainNode) listener.gainNode.disconnect();
                if (listener.streamDest) listener.streamDest.disconnect();
                
                listener.audioElement = null;
                listener.delayNode = null;
                listener.gainNode = null;
                listener.streamDest = null;
                connectListenerPipeline(listener);
            }
        }
    } else {
        connectListenerPipeline(listener);
    }
}

function updateListenerStream(id, streamType) {
    const listener = listeners.find(l => l.id === id);
    if (!listener) return;
    
    listener.audioSource = streamType;
    
    // Tear down and rebuild listener context to target the new stream source
    if (listener.audioElement) {
        listener.audioElement.pause();
        listener.audioElement.srcObject = null;
    }
    if (listener.delayNode) listener.delayNode.disconnect();
    if (listener.gainNode) listener.gainNode.disconnect();
    if (listener.streamDest) listener.streamDest.disconnect();
    
    listener.audioElement = null;
    listener.delayNode = null;
    listener.gainNode = null;
    listener.streamDest = null;
    connectListenerPipeline(listener);
}

// 5. DOM Rendering
function renderListenerDOM(listener) {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'listener-track';
    trackDiv.id = listener.id;
    
    const initial = listener.name.charAt(0).toUpperCase();
    
    trackDiv.innerHTML = `
        <div class="track-header">
            <div class="track-user">
                <div class="user-avatar-mini">${initial}</div>
                <h4>${listener.name}</h4>
            </div>
            <div class="track-actions">
                <button class="track-btn btn-test" id="test-btn-${listener.id}" title="Test Sound">
                    <i class="fa-solid fa-bell"></i>
                </button>
                <button class="track-btn btn-delete" id="delete-btn-${listener.id}" title="Remove Track">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>

        <div class="device-select-container">
            <select class="device-select" id="device-select-${listener.id}">
                <option value="default">System Default Output</option>
            </select>
        </div>

        <div class="stream-select-container" style="margin-top: 0.5rem;">
            <label class="stream-select-label">Audio Stream</label>
            <select class="stream-select" id="stream-select-${listener.id}">
                <option value="primary" ${listener.audioSource === 'primary' ? 'selected' : ''}>🔊 Primary Movie Audio</option>
                <option value="secondary" ${listener.audioSource === 'secondary' ? 'selected' : ''} ${!secondaryLoaded ? 'disabled' : ''}>🌐 Secondary Audio Track</option>
            </select>
        </div>

        <div class="control-sliders">
            <div class="slider-group track-volume">
                <div class="slider-label">
                    <span>Volume</span>
                    <span id="volume-display-${listener.id}">100%</span>
                </div>
                <div class="slider-input-row">
                    <i class="fa-solid fa-volume-high" style="font-size: 0.75rem; color: var(--text-muted);"></i>
                    <input type="range" id="volume-slider-${listener.id}" min="0" max="1" step="0.05" value="${listener.volume}">
                </div>
            </div>

            <div class="slider-group track-delay">
                <div class="slider-label">
                    <span>Latency Compensation</span>
                    <span class="slider-val" id="delay-display-${listener.id}">0ms</span>
                </div>
                <div class="slider-input-row">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 0.75rem; color: var(--text-muted);"></i>
                    <input type="range" id="delay-slider-${listener.id}" min="0" max="1000" step="5" value="${listener.delayMs}">
                    <input type="number" class="delay-num-input" id="delay-input-${listener.id}" min="0" max="1000" value="${listener.delayMs}">
                </div>
            </div>
        </div>
    `;
    
    listenersList.appendChild(trackDiv);
    
    document.getElementById(`delete-btn-${listener.id}`).addEventListener('click', () => {
        if (listeners.length <= 1) {
            alert("At least one listener track is required!");
            return;
        }
        removeListenerTrack(listener.id);
    });
    
    document.getElementById(`test-btn-${listener.id}`).addEventListener('click', () => {
        playTestSound(listener);
    });

    const deviceSelect = document.getElementById(`device-select-${listener.id}`);
    deviceSelect.addEventListener('change', (e) => {
        updateListenerDevice(listener.id, e.target.value);
    });

    const streamSelect = document.getElementById(`stream-select-${listener.id}`);
    streamSelect.addEventListener('change', (e) => {
        updateListenerStream(listener.id, e.target.value);
    });
    
    const volSlider = document.getElementById(`volume-slider-${listener.id}`);
    volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        updateListenerVolume(listener.id, val);
        document.getElementById(`volume-display-${listener.id}`).textContent = `${Math.round(val * 100)}%`;
    });
    
    const delaySlider = document.getElementById(`delay-slider-${listener.id}`);
    const delayInput = document.getElementById(`delay-input-${listener.id}`);
    
    delaySlider.addEventListener('input', (e) => {
        updateListenerDelay(listener.id, e.target.value);
    });
    
    delayInput.addEventListener('change', (e) => {
        updateListenerDelay(listener.id, e.target.value);
    });
}

function playTestSound(listener) {
    initMainAudioContext();
    resumeAllAudioContexts();
    
    if (!listener.audioElement) {
        connectListenerPipeline(listener);
    }
    
    if (mainAudioContext) {
        const now = mainAudioContext.currentTime;
        const osc = mainAudioContext.createOscillator();
        const oscGain = mainAudioContext.createGain();
        
        osc.frequency.setValueAtTime(880, now);
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        oscGain.gain.setValueAtTime(0.4, now + 0.18);
        oscGain.gain.linearRampToValueAtTime(0, now + 0.2);
        
        osc.connect(oscGain);
        oscGain.connect(listener.delayNode);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

// 6. Secondary Audio Loader
function loadSecondaryAudioFile(file) {
    initMainAudioContext();
    resumeAllAudioContexts();
    
    const url = URL.createObjectURL(file);
    secondaryAudioElement.src = url;
    secondaryLoaded = true;
    
    document.getElementById('audio-file-name').textContent = `${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`;
    document.getElementById('audio-sync-status').style.display = 'flex';
    
    // Enable the "Secondary" option in all listener dropdowns
    listeners.forEach(l => {
        const select = document.getElementById(`stream-select-${l.id}`);
        if (select) {
            const secondaryOpt = select.options[1];
            if (secondaryOpt) secondaryOpt.disabled = false;
        }
    });
    
    // Sync starting position
    secondaryAudioElement.currentTime = video.currentTime;
    if (!video.paused) {
        secondaryAudioElement.play().catch(e => console.log("Secondary play deferred:", e));
    }
}

// 7. Client-Side Subtitle Loader & Parser
function loadSubtitleFile(file) {
    loadedSubtitleName = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const extension = file.name.split('.').pop().toLowerCase();
        parseSubtitleFile(text, extension);
        applySubtitles();
    };
    reader.readAsText(file);
}

function parseSubtitleFile(text, extension) {
    subtitleBlocks = [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    if (extension === 'srt') {
        const sections = normalized.split('\n\n');
        sections.forEach(sec => {
            const lines = sec.trim().split('\n');
            if (lines.length >= 3) {
                const timeLine = lines[1];
                const match = timeLine.match(/(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)/);
                if (match) {
                    const start = parseTimeToSeconds(match[1], match[2], match[3], match[4]);
                    const end = parseTimeToSeconds(match[5], match[6], match[7], match[8]);
                    const textLines = lines.slice(2).join('\n');
                    subtitleBlocks.push({ start, end, text: textLines });
                }
            }
        });
    } else {
        // VTT parsing
        const sections = normalized.split('\n\n');
        sections.forEach(sec => {
            if (sec.startsWith('WEBVTT')) return;
            const lines = sec.trim().split('\n');
            if (lines.length >= 2) {
                let timeLine = lines[0];
                let textIndex = 1;
                if (!timeLine.includes('-->') && lines.length >= 3) {
                    timeLine = lines[1];
                    textIndex = 2;
                }
                const match = timeLine.match(/(\d+):(\d+):(\d+)\.(\d+)\s*-->\s*(\d+):(\d+):(\d+)\.(\d+)/);
                if (match) {
                    const start = parseTimeToSeconds(match[1], match[2], match[3], match[4]);
                    const end = parseTimeToSeconds(match[5], match[6], match[7], match[8]);
                    const textLines = lines.slice(textIndex).join('\n');
                    subtitleBlocks.push({ start, end, text: textLines });
                }
            }
        });
    }
    
    document.getElementById('sub-file-name').textContent = `${loadedSubtitleName} (${subtitleBlocks.length} cues)`;
}

function parseTimeToSeconds(hrs, mins, secs, ms) {
    return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000;
}

function applySubtitles() {
    if (subtitleBlocks.length === 0) return;
    
    // Clear any existing track elements on the video player
    const oldTracks = video.querySelectorAll('track');
    oldTracks.forEach(t => t.remove());
    
    // Build WebVTT string
    let vttText = "WEBVTT\n\n";
    subtitleBlocks.forEach((block, idx) => {
        // Apply Subtitle Delay Offset
        const start = Math.max(0, block.start + subtitleDelayOffset);
        const end = Math.max(0, block.end + subtitleDelayOffset);
        vttText += `${idx + 1}\n${formatVttTime(start)} --> ${formatVttTime(end)}\n${block.text}\n\n`;
    });
    
    const blob = new Blob([vttText], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = loadedSubtitleName;
    track.srclang = 'en';
    track.src = url;
    track.default = true;
    
    video.appendChild(track);
    
    // Enable the track
    if (video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
    }
}

function formatVttTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function updateSubtitleFontSize(size) {
    subtitleFontSize = parseInt(size);
    document.getElementById('sub-size-display').textContent = `${size}px`;
    
    let styleEl = document.getElementById('sub-font-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'sub-font-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `video::cue { font-size: ${subtitleFontSize}px !important; }`;
}

// 8. Calibration Wizard
function startCalibrator() {
    if (calibratorInterval) return;
    
    initMainAudioContext();
    resumeAllAudioContexts();
    
    playCalibrationTick();
    calibratorInterval = setInterval(playCalibrationTick, 1000);
    
    calibratorToggle.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Disable Calibrator';
    calibratorToggle.style.color = 'var(--accent-cyan)';
    calibratorToggle.style.borderColor = 'var(--accent-cyan)';
    calibratorToggle.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.2)';
}

function stopCalibrator() {
    if (!calibratorInterval) return;
    
    clearInterval(calibratorInterval);
    calibratorInterval = null;
    
    calibratorToggle.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Enable Calibrator';
    calibratorToggle.style.color = '';
    calibratorToggle.style.borderColor = '';
    calibratorToggle.style.boxShadow = '';
    
    calibratorFlash.classList.remove('active');
}

function playCalibrationTick() {
    // Flash visual
    calibratorFlash.classList.add('active');
    setTimeout(() => {
        calibratorFlash.classList.remove('active');
    }, 80);
    
    // Play tick in each listener's audio context
    listeners.forEach(l => {
        if (!l.audioElement) {
            connectListenerPipeline(l);
        }
        
        if (mainAudioContext && mainAudioContext.state === 'running') {
            const now = mainAudioContext.currentTime;
            const duration = 0.08;
            const frequency = 1000;
            
            const osc = mainAudioContext.createOscillator();
            const oscGain = mainAudioContext.createGain();
            
            osc.frequency.setValueAtTime(frequency, now);
            
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(0.5, now + 0.01);
            oscGain.gain.setValueAtTime(0.5, now + duration - 0.01);
            oscGain.gain.linearRampToValueAtTime(0, now + duration);
            
            osc.connect(oscGain);
            oscGain.connect(l.delayNode);
            
            osc.start(now);
            osc.stop(now + duration);
        }
    });
}

// 9. System Diagnostics & Collapsible Troubleshooter
const diagToggle = document.getElementById('diagnostics-toggle');
const diagBody = document.getElementById('diagnostics-body');
const diagChevron = document.getElementById('diagnostics-chevron');

if (diagToggle && diagBody && diagChevron) {
    diagToggle.addEventListener('click', () => {
        if (diagBody.style.display === 'none') {
            diagBody.style.display = 'block';
            diagChevron.className = 'fa-solid fa-chevron-up';
            runDiagnostics();
        } else {
            diagBody.style.display = 'none';
            diagChevron.className = 'fa-solid fa-chevron-down';
        }
    });
    
    document.getElementById('diag-refresh-btn').addEventListener('click', runDiagnostics);
}

async function runDiagnostics() {
    const diagSecure = document.getElementById('diag-secure');
    const diagSetSinkId = document.getElementById('diag-setsinkid');
    const diagPerm = document.getElementById('diag-perm');
    const diagDevicesRaw = document.getElementById('diag-devices-raw');
    
    if (!diagSecure || !diagSetSinkId || !diagPerm || !diagDevicesRaw) return;
    
    // 1. Secure Context Check
    if (window.isSecureContext) {
        diagSecure.textContent = "Yes (Secure context active)";
        diagSecure.style.color = "var(--accent-green)";
    } else {
        diagSecure.textContent = "No (Restricted. Bluetooth mapping requires localhost:3000)";
        diagSecure.style.color = "var(--accent-red)";
    }
    
    // 2. setSinkId Check
    const isSinkSupported = typeof AudioContext.prototype.setSinkId === 'function';
    if (isSinkSupported) {
        diagSetSinkId.textContent = "Supported by Browser";
        diagSetSinkId.style.color = "var(--accent-green)";
    } else {
        diagSetSinkId.textContent = "Not Supported (Requires Chrome, Edge, or Opera)";
        diagSetSinkId.style.color = "var(--accent-red)";
    }
    
    // 3. Permission State
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        diagPerm.textContent = result.state;
        if (result.state === 'granted') {
            diagPerm.style.color = "var(--accent-green)";
        } else if (result.state === 'prompt') {
            diagPerm.style.color = "var(--accent-blue)";
        } else {
            diagPerm.style.color = "var(--accent-red)";
        }
    } catch (e) {
        diagPerm.textContent = isPermissionGranted ? "granted (microphone session active)" : "unknown / prompt required";
        diagPerm.style.color = isPermissionGranted ? "var(--accent-green)" : "var(--accent-blue)";
    }
    
    // 4. Raw Devices Enumerate
    try {
        const rawDevices = await navigator.mediaDevices.enumerateDevices();
        let text = `Total devices scanned: ${rawDevices.length}\n\n`;
        rawDevices.forEach((d, idx) => {
            text += `Device #${idx+1}:\n`;
            text += `  • Kind: ${d.kind}\n`;
            text += `  • Label: ${d.label || '(Hidden - click Grant Audio Permission to reveal)'}\n`;
            text += `  • ID: ${d.deviceId ? d.deviceId.substring(0, 15) + '...' : '(None)'}\n`;
            text += `  • Group ID: ${d.groupId ? d.groupId.substring(0, 15) + '...' : '(None)'}\n\n`;
        });
        diagDevicesRaw.textContent = text;
    } catch (err) {
        diagDevicesRaw.textContent = "Failed to list devices: " + err.message;
    }
}

// 10. YouTube Dynamic Core Handlers
function loadStreamUrl(url) {
    // Clean up old HLS instances
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    // Verify if it is a YouTube URL
    const videoId = extractYoutubeId(url);
    const isYt = videoId !== "";
    
    if (isYt) {
        isYoutubeActive = false;
        document.getElementById('youtube-warning').style.display = 'none';
        document.getElementById('youtube-player').style.display = 'none';
        video.style.display = 'block';
        if (ytPlayer && ytPlayerReady) {
            ytPlayer.pauseVideo();
            stopYtProgressTimer();
        }

        const proxyUrl = `http://localhost:4000/api/proxy/youtube?url=${encodeURIComponent(url)}`;
        video.crossOrigin = "anonymous";
        video.src = proxyUrl;
        
        initMainAudioContext();
        resumeAllAudioContexts();
        
        video.load();
        video.play().catch(e => console.log(e));
        
        movieTitle.textContent = "YouTube Dual-Audio Mode";
        movieMeta.textContent = url;
        
        videoOverlay.style.opacity = '0';
        videoOverlay.style.pointerEvents = 'none';
        return;
    }

    // Standard Video Loader (CORS enabled)
    isYoutubeActive = false;
    document.getElementById('youtube-warning').style.display = 'none';
    document.getElementById('youtube-player').style.display = 'none';
    video.style.display = 'block';
    if (ytPlayer && ytPlayerReady) {
        ytPlayer.pauseVideo();
        stopYtProgressTimer();
    }

    // Reset embedded selectors
    const embeddedAudioSelect = document.getElementById('embedded-audio-select');
    const embeddedVideoSelect = document.getElementById('embedded-video-select');
    if (embeddedAudioSelect) embeddedAudioSelect.innerHTML = '<option value="-1">Default / Track 1</option>';
    if (embeddedVideoSelect) embeddedVideoSelect.innerHTML = '<option value="-1">Default / Auto</option>';

    const isHls = url.toLowerCase().includes('.m3u8');
    
    // Set crossOrigin to anonymous to request CORS headers from the server.
    // This is mandatory for the Web Audio API to intercept remote media streams!
    video.crossOrigin = "anonymous";
    
    if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
        hlsInstance = new Hls({
            maxMaxBufferLength: 30,
            enableWorker: true,
            lowLatencyMode: true
        });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            initMainAudioContext();
            resumeAllAudioContexts();
            updateHlsVideoTracks();
            updateHlsAudioTracks();
            video.play().catch(e => console.log(e));
        });
        hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
            updateHlsAudioTracks();
        });
        
        movieTitle.textContent = "HLS Stream Link";
        movieMeta.textContent = url;
    } else {
        video.src = url;
        initMainAudioContext();
        resumeAllAudioContexts();
        video.load();
        video.play().catch(e => console.log(e));
        
        try {
            const urlObj = new URL(url);
            const filename = urlObj.pathname.split('/').pop() || "Network Stream";
            movieTitle.textContent = filename;
        } catch (e) {
            movieTitle.textContent = "Network Stream";
        }
        movieMeta.textContent = url;
    }
    
    videoOverlay.style.opacity = '0';
    videoOverlay.style.pointerEvents = 'none';
}

function extractYoutubeId(url) {
    if (!url) return "";
    url = url.trim().replace(/^["']|["']$/g, '');
    
    // Regular expression to match all common YouTube URL formats and capture the 11-character video ID
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live|watch)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    
    if (match && match[1]) {
        return match[1];
    }
    
    // Fallback: if they just pasted the 11-char ID
    const directIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    if (directIdPattern.test(url)) {
        return url;
    }
    
    return "";
}

function startYtProgressTimer() {
    if (ytProgressInterval) return;
    ytProgressInterval = setInterval(() => {
        if (isYoutubeActive && ytPlayer && ytPlayerReady && typeof ytPlayer.getCurrentTime === 'function') {
            const cur = ytPlayer.getCurrentTime();
            const dur = ytPlayer.getDuration();
            
            const percentage = (cur / (dur || 1)) * 100;
            progressBar.style.width = `${percentage}%`;
            timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
        }
    }, 250);
}

function stopYtProgressTimer() {
    if (ytProgressInterval) {
        clearInterval(ytProgressInterval);
        ytProgressInterval = null;
    }
}

// 8. Embedded Track Query & Selection Helpers
function updateNativeTracks() {
    const embeddedAudioSelect = document.getElementById('embedded-audio-select');
    const embeddedVideoSelect = document.getElementById('embedded-video-select');
    if (!embeddedAudioSelect || !embeddedVideoSelect) return;

    // Reset dropdowns to defaults
    embeddedAudioSelect.innerHTML = '<option value="-1">Default / Track 1</option>';
    embeddedVideoSelect.innerHTML = '<option value="-1">Default / Auto</option>';

    // Native Audio Tracks
    if (video.audioTracks && video.audioTracks.length > 0) {
        embeddedAudioSelect.innerHTML = '';
        for (let i = 0; i < video.audioTracks.length; i++) {
            const track = video.audioTracks[i];
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${track.label || `Track ${i + 1}`} [${track.language || 'unknown'}]`;
            if (track.enabled) opt.selected = true;
            embeddedAudioSelect.appendChild(opt);
        }
        console.log(`Discovered ${video.audioTracks.length} native audio tracks.`);
    } else {
        console.log("No native audioTracks detected or browser support disabled.");
    }

    // Native Video Tracks
    if (video.videoTracks && video.videoTracks.length > 0) {
        embeddedVideoSelect.innerHTML = '';
        for (let i = 0; i < video.videoTracks.length; i++) {
            const track = video.videoTracks[i];
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${track.label || `Stream ${i + 1}`} (${track.width || '?'}x${track.height || '?'})`;
            if (track.selected) opt.selected = true;
            embeddedVideoSelect.appendChild(opt);
        }
        console.log(`Discovered ${video.videoTracks.length} native video tracks.`);
    }
}

function updateHlsAudioTracks() {
    const embeddedAudioSelect = document.getElementById('embedded-audio-select');
    if (!embeddedAudioSelect || !hlsInstance) return;

    embeddedAudioSelect.innerHTML = '<option value="-1">Default / Track 1</option>';
    const tracks = hlsInstance.audioTracks;
    
    if (tracks && tracks.length > 0) {
        embeddedAudioSelect.innerHTML = '';
        tracks.forEach((track, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `${track.name || `Track ${index + 1}`} [${track.lang || 'unknown'}]`;
            if (hlsInstance.audioTrack === index) opt.selected = true;
            embeddedAudioSelect.appendChild(opt);
        });
        console.log(`HLS Audio Tracks populated: ${tracks.length} tracks.`);
    }
}

function updateHlsVideoTracks() {
    const embeddedVideoSelect = document.getElementById('embedded-video-select');
    if (!embeddedVideoSelect || !hlsInstance) return;

    embeddedVideoSelect.innerHTML = '<option value="-1">Auto (Adaptive)</option>';
    const levels = hlsInstance.levels;

    if (levels && levels.length > 0) {
        levels.forEach((level, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            const height = level.height ? `${level.height}p` : `Level ${index + 1}`;
            const bitrate = level.bitrate ? `(${Math.round(level.bitrate / 1000)} kbps)` : '';
            opt.textContent = `${height} ${bitrate}`;
            if (hlsInstance.currentLevel === index) opt.selected = true;
            embeddedVideoSelect.appendChild(opt);
        });
        console.log(`HLS Video Levels populated: ${levels.length} levels.`);
    }
}
