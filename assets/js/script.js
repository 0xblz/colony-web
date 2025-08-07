// Status cycling animation
document.addEventListener('DOMContentLoaded', function() {
    // Target the existing elements in the HTML
    const statusElement = document.querySelector('.status');
    const iconElement = document.querySelector('.status-container i');
    const loadingBarElement = document.querySelector('.loading-bar');
    
    // Return early if elements not found
    if (!statusElement || !iconElement || !loadingBarElement) {
        console.log('Status elements not found');
        return;
    }
    
    // Add transition styling to the status container for smooth fade
    const statusContainer = statusElement.closest('.status-container');
    if (statusContainer) {
        statusContainer.style.transition = 'opacity 0.5s ease-in-out';
    }
    
    // Setup loading bar styling
    loadingBarElement.style.cssText = `
        position: relative;
        width: 100%;
        max-width: 420px;
        height: 1px;
        background-color: rgba(255, 255, 255, 0.1);
        overflow: hidden;
    `;
    
    // Create the progress bar inside
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0%;
        background-color: var(--primary-color);
        transition: width 0.5s ease-in-out;
    `;
    loadingBarElement.appendChild(progressBar);
    
    // Define the states with custom durations (in milliseconds) and colors
    const states = [
        { text: 'Start', icon: 'fa-solid fa-play', duration: 0, color: 'var(--primary-color)', clickable: true },
        { text: 'Starting...', icon: 'fa-solid fa-spinner fa-spin', duration: 3000, color: 'white' },
        { text: 'Waiting for device...', icon: 'fa-solid fa-hourglass-start', duration: 1000, color: 'var(--primary-color)' },
        { text: 'Connecting device...', icon: 'fa-solid fa-circle-nodes', duration: 4000, color: 'var(--primary-color)' },
        { text: 'Device connected', icon: 'fa-solid fa-check', duration: 1000, color: 'var(--tertiary-color)' },
        { text: 'Verification...', icon: 'fa-solid fa-eye', duration: 5000, color: 'var(--secondary-color)' },
        { text: 'Denied, not verified.', icon: 'fa-solid fa-lock', duration: 6000, color: 'var(--quaternary-color)' }
    ];
    
    // Success state for when human verification passes
    const successState = { text: 'You passed, but there is nothing here.', icon: 'fa-solid fa-star', duration: 6000, color: 'var(--tertiary-color)' };
    
    let currentStateIndex = 0;
    let timeoutId;
    let humanVerified = false;
    
    // Create audio elements
    const startupAudio = new Audio('assets/audio/startup.mp3');
    const errorAudio = new Audio('assets/audio/error.mp3');
    const successAudio = new Audio('assets/audio/success.mp3');
    const glitchAudio = new Audio('assets/audio/glitch.mp3');
    const welcomeAudio = new Audio('assets/audio/welcome.mp3');
    const clickAudio = new Audio('assets/audio/click.mp3');
    
    // Set audio properties
    startupAudio.volume = 0.5;
    errorAudio.volume = 0.3;
    successAudio.volume = 0.3;
    glitchAudio.volume = 0.4;
    welcomeAudio.volume = 0.4;
    clickAudio.volume = 0.2;
    
    // Preload audio files and add iOS-specific handling
    startupAudio.preload = 'auto';
    errorAudio.preload = 'auto';
    successAudio.preload = 'auto';
    glitchAudio.preload = 'auto';
    welcomeAudio.preload = 'auto';
    clickAudio.preload = 'auto';
    
    // Load audio files
    startupAudio.load();
    errorAudio.load();
    successAudio.load();
    glitchAudio.load();
    welcomeAudio.load();
    clickAudio.load();
    
    // Demo mode toggle listener
    const demoToggle = document.getElementById('demo-toggle');
    const demoLabel = document.querySelector('.demo-label');
    if (demoToggle && demoLabel) {
        demoToggle.addEventListener('change', function() {
            humanVerified = this.checked;
            // Show/hide demo label
            demoLabel.style.display = this.checked ? 'block' : 'none';
            // Use setTimeout to trigger the opacity transition
            if (this.checked) {
                setTimeout(() => {
                    demoLabel.style.opacity = '1';
                }, 10);
            } else {
                demoLabel.style.opacity = '0';
            }
        });
    }
    
    // Detect iOS devices
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    
    // Function to unlock a specific audio file on iOS
    function unlockAudio(audio) {
        if (!isIOS()) return Promise.resolve(); // Only run on iOS
        
        return new Promise((resolve) => {
            // Store original volume
            const originalVolume = audio.volume;
            
            // Set volume to 0 for silent unlock
            audio.volume = 0;
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    // Restore original volume after unlock
                    audio.volume = originalVolume;
                    resolve();
                }).catch(() => {
                    // Restore volume even if unlock fails
                    audio.volume = originalVolume;
                    resolve();
                });
            } else {
                audio.volume = originalVolume;
                resolve();
            }
        });
    }
    
    // Click handler for the Start state
    function handleStartClick() {
        // Play startup sound
        startupAudio.currentTime = 0;
        startupAudio.play().catch(error => {
            console.log('Startup audio could not be played:', error);
        });
        
        // Remove click listener
        statusElement.removeEventListener('click', handleStartClick);
        statusContainer.style.cursor = 'default';
        
        // Hide the demo mode div with a smooth transition
        const demoModeDiv = document.querySelector('.demo-mode');
        if (demoModeDiv) {
            demoModeDiv.classList.add('hiding');
            setTimeout(() => {
                demoModeDiv.style.display = 'none';
            }, 300); // Match the transition duration
        }
        
        // Continue to next state
        currentStateIndex++;
        updateStatus();
    }
    
    // Function to create the aura scan swipe effect
    function createAuraScanEffect() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        
        // Create the green scanning line
        const scanLine = document.createElement('div');
        scanLine.style.cssText = `
            position: absolute;
            top: -10px;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                var(--secondary-color) 20%, 
                var(--secondary-color) 50%, 
                var(--secondary-color) 80%, 
                transparent 100%
            );
            box-shadow: 
                0 0 10px var(--secondary-color),
                0 0 20px var(--secondary-color),
                0 0 40px var(--secondary-color);
            animation: scanUpDown 4s ease-in-out;
        `;
        
        // Add CSS animation keyframes
        if (!document.querySelector('#aura-scan-styles')) {
            const style = document.createElement('style');
            style.id = 'aura-scan-styles';
            style.textContent = `
                @keyframes scanUpDown {
                    0% {
                        top: -10px;
                        opacity: 0;
                    }
                    5% {
                        opacity: 1;
                    }
                    45% {
                        opacity: 1;
                        top: 100vh;
                    }
                    50% {
                        opacity: 1;
                        top: 100vh;
                    }
                    95% {
                        opacity: 1;
                        top: -10px;
                    }
                    100% {
                        top: -10px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        overlay.appendChild(scanLine);
        document.body.appendChild(overlay);
        
        // Remove the overlay after animation completes
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 4000);
    }
    
    // Function to update status with fade effect
    function updateStatus() {
        // Fade out
        if (statusContainer) {
            statusContainer.style.opacity = '0';
        }
        
        setTimeout(() => {
            // Update content - check if this is the final state and human is verified
            let currentState;
            if (currentStateIndex === states.length - 1 && humanVerified) {
                currentState = successState;
            } else {
                currentState = states[currentStateIndex];
            }
            iconElement.className = currentState.icon;
            statusElement.textContent = currentState.text;
            
            // Apply color to both icon and text
            iconElement.style.color = currentState.color;
            statusElement.style.color = currentState.color;
            
            // Update loading bar progress and color (but not for Start state)
            if (!currentState.clickable) {
                const progressPercentage = ((currentStateIndex) / (states.length - 1)) * 100;
                progressBar.style.width = `${progressPercentage}%`;
                progressBar.style.backgroundColor = currentState.color;
            }
            
            // Handle clickable states (Start button)
            if (currentState.clickable) {
                statusContainer.style.cursor = 'pointer';
                statusElement.addEventListener('click', handleStartClick);
                // Don't show progress bar for Start state
                progressBar.style.width = '0%';
            } else {
                // Play success sound for device connected
                if (currentState.text === 'Device connected') {
                    if (isIOS()) {
                        unlockAudio(successAudio).then(() => {
                            successAudio.currentTime = 0;
                            successAudio.play().catch(error => {
                                console.log('Success audio could not be played:', error);
                            });
                        });
                    } else {
                        successAudio.currentTime = 0;
                        successAudio.play().catch(error => {
                            console.log('Success audio could not be played:', error);
                        });
                    }
                }
                
                // Trigger aura scan effect if this is the aura scan state
                if (currentState.text === 'Verification...') {
                    createAuraScanEffect();
                    if (isIOS()) {
                        unlockAudio(glitchAudio).then(() => {
                            glitchAudio.currentTime = 0;
                            glitchAudio.play().catch(error => {
                                console.log('Glitch audio could not be played:', error);
                            });
                        });
                    } else {
                        glitchAudio.currentTime = 0;
                        glitchAudio.play().catch(error => {
                            console.log('Glitch audio could not be played:', error);
                        });
                    }
                }
                
                // Play appropriate sound for final state
                if (currentState.text === 'Denied, not verified.') {
                    if (isIOS()) {
                        unlockAudio(errorAudio).then(() => {
                            errorAudio.currentTime = 0;
                            errorAudio.play().catch(error => {
                                console.log('Error audio could not be played:', error);
                            });
                        });
                    } else {
                        errorAudio.currentTime = 0;
                        errorAudio.play().catch(error => {
                            console.log('Error audio could not be played:', error);
                        });
                    }
                }
                
                // Play welcome sound for human verification success
                if (currentState.text === 'You passed, but there is nothing here.') {
                    if (isIOS()) {
                        unlockAudio(welcomeAudio).then(() => {
                            welcomeAudio.currentTime = 0;
                            welcomeAudio.play().catch(error => {
                                console.log('Welcome audio could not be played:', error);
                            });
                        });
                    } else {
                        welcomeAudio.currentTime = 0;
                        welcomeAudio.play().catch(error => {
                            console.log('Welcome audio could not be played:', error);
                        });
                    }
                }
                
                // Schedule next state change using current state's duration
                scheduleNextUpdate(currentState.duration);
                
                // Move to next state
                currentStateIndex++;
            }
            
            // Fade in
            if (statusContainer) {
                statusContainer.style.opacity = '1';
            }
        }, 250); // Half of transition time for smooth effect
    }
    
    // Function to schedule the next update with custom timing
    function scheduleNextUpdate(duration) {
        
        // Clear any existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Only schedule next update if there are more states
        if (currentStateIndex + 1 < states.length) {
            timeoutId = setTimeout(updateStatus, duration);
        }
    }
    
    // Global click handler for click sound on clickable elements only
    document.addEventListener('click', function(event) {
        const element = event.target;
        
        // Check if the element is clickable
        const isClickable = (
            // Standard clickable elements
            element.tagName === 'BUTTON' ||
            element.tagName === 'A' ||
            element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            // Elements with click handlers or specific roles
            element.onclick ||
            element.getAttribute('role') === 'button' ||
            element.getAttribute('role') === 'link' ||
            // Elements with pointer cursor (commonly clickable)
            window.getComputedStyle(element).cursor === 'pointer' ||
            // Elements that are part of our interactive components
            element.closest('.status-container') ||
            element.closest('.toggle') ||
            element.closest('label')
        );
        
        // Only play sound if element is clickable
        if (isClickable) {
            // Handle iOS audio unlock for click sound
            if (isIOS()) {
                unlockAudio(clickAudio).then(() => {
                    clickAudio.currentTime = 0;
                    clickAudio.play().catch(error => {
                        console.log('Click audio could not be played:', error);
                    });
                });
            } else {
                // Reset the audio to start from beginning
                clickAudio.currentTime = 0;
                
                // Play the click sound
                clickAudio.play().catch(error => {
                    console.log('Click audio could not be played:', error);
                });
            }
        }
    });
    
    // Initialize with first state
    updateStatus();
});

