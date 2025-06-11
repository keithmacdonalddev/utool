/**
 * uTool Login - Main JavaScript
 * Your Life's Command Center
 *
 * This file contains all the interactive functionality for the uTool login experience,
 * including neural network animations, voice commands, biometric authentication,
 * and dynamic theming based on time of day.
 */

// ===============================================
// Global uTool Namespace
// ===============================================
window.uTool = {
  // State variables
  currentStep: 0,
  soundEnabled: true,
  hapticEnabled: true,
  selectedDomain: 'work',
  mouseX: 0,
  mouseY: 0,
  neuralNodes: [],
  neuralConnections: [],
  audioContext: null,

  // ===============================================
  // Initialization
  // ===============================================
  init() {
    console.log('uTool Login System Initializing...');

    // Initialize audio context
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    } // Initialize all systems
    this.initializeNeuralNetwork();
    this.initializeCustomCursor();
    this.initializeTimeGreeting();
    this.initializeMotivationStats();
    this.initializeVoiceCommand();
    this.initializeKeyboardNavigation();
    this.setupTouchGestures();
    this.setupEventListeners();

    // Hide loading overlay
    this.hideLoadingOverlay();

    console.log('uTool Login System Ready');
  },

  // ===============================================
  // Loading Overlay Management
  // ===============================================
  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      setTimeout(() => {
        overlay.classList.add('hidden');
      }, 1000);
    }
  },

  // ===============================================
  // Neural Network Background
  // ===============================================
  initializeNeuralNetwork() {
    const canvas = document.getElementById('neuralCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Node class for neural network visualization
    class Node {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        this.pulsePhase = Math.random() * Math.PI * 2;
      }

      update() {
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        this.pulsePhase += 0.05;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse repulsion for interactivity
        const dx = this.x - uTool.mouseX;
        const dy = this.y - uTool.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const force = (150 - distance) / 150;
          this.x += (dx / distance) * force * 3;
          this.y += (dy / distance) * force * 3;
        }
      }

      draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(
          this.x,
          this.y,
          this.radius * (1 + pulse * 0.5),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(91, 103, 202, ${0.6 + pulse * 0.4})`;
        ctx.fill();
      }
    }

    // Connection class for neural network connections
    class Connection {
      constructor(node1, node2) {
        this.node1 = node1;
        this.node2 = node2;
        this.strength = Math.random() * 0.5 + 0.5;
      }

      draw() {
        const dx = this.node2.x - this.node1.x;
        const dy = this.node2.y - this.node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 200) {
          const opacity = (1 - distance / 200) * this.strength * 0.3;
          ctx.beginPath();
          ctx.moveTo(this.node1.x, this.node1.y);
          ctx.lineTo(this.node2.x, this.node2.y);
          ctx.strokeStyle = `rgba(91, 103, 202, ${opacity})`;
          ctx.lineWidth = this.strength;
          ctx.stroke();
        }
      }
    }

    // Initialize nodes
    for (let i = 0; i < 50; i++) {
      this.neuralNodes.push(new Node());
    }

    // Create connections between nodes
    for (let i = 0; i < this.neuralNodes.length; i++) {
      for (let j = i + 1; j < this.neuralNodes.length; j++) {
        if (Math.random() < 0.1) {
          this.neuralConnections.push(
            new Connection(this.neuralNodes[i], this.neuralNodes[j])
          );
        }
      }
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw connections
      this.neuralConnections.forEach((connection) => {
        connection.draw();
      });

      // Update and draw nodes
      this.neuralNodes.forEach((node) => {
        node.update();
        node.draw();
      });

      requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  },

  /// ...existing code...
  // ===============================================
  // Custom Cursor System
  // ===============================================
  initializeCustomCursor() {
    const cursor = document.getElementById('cursor');
    const cursorFollower = document.getElementById('cursorFollower');

    if (!cursor || !cursorFollower) return;

    // Track mouse movement for custom cursor
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      // Update cursor position immediately
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';

      // Update follower with delay for smooth effect
      setTimeout(() => {
        cursorFollower.style.left = e.clientX + 'px';
        cursorFollower.style.top = e.clientY + 'px';
      }, 100);
    });

    // Add hover effects to interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a, .auth-method, input, .domain-indicator, .access-pill, .suggestion-chip, .stat-card'
    );

    interactiveElements.forEach((element) => {
      element.addEventListener('mouseenter', () => {
        cursor.classList.add('expand');
        if (this.hapticEnabled) this.simulateHaptic(5);
      });

      element.addEventListener('mouseleave', () => {
        cursor.classList.remove('expand');
      });
    });
  },

  // ===============================================
  // Time-based Dynamic Theming
  // ===============================================
  initializeTimeGreeting() {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Update time display
      const currentTimeEl = document.getElementById('currentTime');
      if (currentTimeEl) currentTimeEl.textContent = timeString;

      let greeting, tip, theme;

      // Determine greeting and theme based on time of day
      if (hour >= 5 && hour < 12) {
        greeting = 'Good morning, achiever';
        tip =
          'Your cognitive performance peaks in the morning. Perfect for complex problem-solving.';
        theme = 'morning';
      } else if (hour >= 12 && hour < 17) {
        greeting = 'Good afternoon, champion';
        tip =
          "You're most productive at this time. Perfect for deep work sessions.";
        theme = 'focus';
      } else if (hour >= 17 && hour < 21) {
        greeting = 'Good evening, innovator';
        tip = "Time to review today's progress and plan tomorrow's victories.";
        theme = 'evening';
      } else {
        greeting = 'Welcome back, night owl';
        tip =
          'Late night productivity can be powerful. Stay focused on your goals.';
        theme = 'night';
      }

      // Apply dynamic theme colors
      document.documentElement.style.setProperty(
        '--primary',
        `var(--${theme}-primary)`
      );
      document.documentElement.style.setProperty(
        '--secondary',
        `var(--${theme}-secondary)`
      );
      document.documentElement.style.setProperty(
        '--accent',
        `var(--${theme}-accent)`
      );
      document.documentElement.style.setProperty(
        '--glow',
        `var(--${theme}-glow)`
      );

      // Update UI text
      const greetingEl = document.getElementById('greetingMessage');
      const tipEl = document.getElementById('productivityTip');
      if (greetingEl) greetingEl.textContent = greeting;
      if (tipEl) tipEl.textContent = tip;
    }; // Initial update and set interval for updates
    updateGreeting();
    setInterval(updateGreeting, 60000); // Update every minute
  },

  // ===============================================
  // Motivation & Streaks System
  // ===============================================
  /**
   * Initializes the motivation and streaks stats system.
   * This creates dynamic, contextual stats that motivate users
   * and provide meaningful engagement metrics rather than generic productivity numbers.
   *
   * The system includes:
   * - Login streak calculation based on consecutive days
   * - Weekly goals tracking with progress visualization
   * - Personal best streak recording and display
   * - Time-based motivational messages that adapt throughout the day
   */
  initializeMotivationStats() {
    // Calculate current login streak
    const calculateLoginStreak = () => {
      // Get stored login dates from localStorage
      const loginDates = JSON.parse(
        localStorage.getItem('uToolLoginDates') || '[]'
      );
      const today = new Date().toDateString();

      // Add today's login if not already recorded
      if (!loginDates.includes(today)) {
        loginDates.push(today);
        localStorage.setItem('uToolLoginDates', JSON.stringify(loginDates));
      }

      // Calculate consecutive streak from most recent dates
      let streak = 0;
      const sortedDates = loginDates.sort((a, b) => new Date(b) - new Date(a));

      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i]);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);

        if (currentDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      return Math.max(streak, 1); // Minimum streak of 1 for today
    };

    // Calculate weekly goals progress
    const calculateWeeklyGoals = () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const currentWeekLogins = JSON.parse(
        localStorage.getItem('uToolLoginDates') || '[]'
      ).filter((dateStr) => {
        const loginDate = new Date(dateStr);
        return loginDate >= weekStart;
      }).length;

      return `${Math.min(currentWeekLogins, 5)}/5`;
    };

    // Get personal best streak
    const getPersonalBest = () => {
      const savedBest = localStorage.getItem('uToolPersonalBestStreak');
      const currentStreak = calculateLoginStreak();
      const personalBest = Math.max(parseInt(savedBest) || 0, currentStreak);

      // Update personal best if current streak is higher
      if (currentStreak > (parseInt(savedBest) || 0)) {
        localStorage.setItem(
          'uToolPersonalBestStreak',
          currentStreak.toString()
        );
      }

      return personalBest;
    };

    // Generate time-based motivational messages
    const getMotivationalMessage = () => {
      const hour = new Date().getHours();
      const motivationSets = {
        morning: {
          messages: [
            'Rise & Grind!',
            'Morning Power!',
            'Start Strong!',
            'Own Today!',
          ],
          contexts: [
            'Morning Energy',
            'Dawn Warrior',
            'Early Bird',
            'AM Champion',
          ],
        },
        afternoon: {
          messages: [
            'Stay Focused!',
            'Push Forward!',
            'Keep Going!',
            'Midday Surge!',
          ],
          contexts: ['Noon Power', 'Peak Time', 'Focus Mode', 'PM Drive'],
        },
        evening: {
          messages: [
            'Finish Strong!',
            'Evening Push!',
            'Almost There!',
            'End on High!',
          ],
          contexts: ['Evening Flow', 'Sunset Drive', 'Night Shift', 'PM Power'],
        },
        night: {
          messages: [
            'Night Owl!',
            'Late Hustle!',
            'Midnight Grind!',
            'Dark Hours!',
          ],
          contexts: [
            'Night Mode',
            'After Hours',
            'Midnight Oil',
            'Night Shift',
          ],
        },
      };

      let timeSet;
      if (hour >= 5 && hour < 12) timeSet = motivationSets.morning;
      else if (hour >= 12 && hour < 17) timeSet = motivationSets.afternoon;
      else if (hour >= 17 && hour < 21) timeSet = motivationSets.evening;
      else timeSet = motivationSets.night;

      const messageIndex = Math.floor(Math.random() * timeSet.messages.length);
      return {
        message: timeSet.messages[messageIndex],
        context: timeSet.contexts[messageIndex],
      };
    };

    // Update all stat displays
    const updateStatsDisplay = () => {
      const streak = calculateLoginStreak();
      const weeklyGoals = calculateWeeklyGoals();
      const personalBest = getPersonalBest();
      const motivation = getMotivationalMessage();

      // Update DOM elements with calculated values
      const streakEl = document.getElementById('loginStreak');
      const goalsEl = document.getElementById('weeklyGoals');
      const bestEl = document.getElementById('personalBest');
      const messageEl = document.getElementById('motivationMessage');
      const timeEl = document.getElementById('motivationTime');

      if (streakEl) streakEl.textContent = streak;
      if (goalsEl) goalsEl.textContent = weeklyGoals;
      if (bestEl) bestEl.textContent = personalBest;
      if (messageEl) messageEl.textContent = motivation.message;
      if (timeEl) timeEl.textContent = motivation.context;

      // Add special effects for achievements
      if (streak >= 7) {
        streakEl?.classList.add('achievement-glow');
      }
      if (weeklyGoals === '5/5') {
        goalsEl?.classList.add('achievement-glow');
      }
    };

    // Initial update and refresh motivation message every 5 minutes
    updateStatsDisplay();
    setInterval(() => {
      const motivation = getMotivationalMessage();
      const messageEl = document.getElementById('motivationMessage');
      const timeEl = document.getElementById('motivationTime');
      if (messageEl) messageEl.textContent = motivation.message;
      if (timeEl) timeEl.textContent = motivation.context;
    }, 300000); // Update every 5 minutes
  },

  // ===============================================
  // Voice Command System
  // ===============================================
  initializeVoiceCommand() {
    const voiceButton = document.getElementById('voiceCommand');
    if (!voiceButton) return;

    let recognition;

    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      // Handle voice recognition results
      recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        this.processVoiceCommand(command);
      };

      // Handle recognition end
      recognition.onend = () => {
        voiceButton.classList.remove('listening');
      };
    }

    // Voice button click handler
    voiceButton.addEventListener('click', () => {
      if (recognition) {
        voiceButton.classList.add('listening');
        recognition.start();
        if (this.soundEnabled) this.playSound(880, 100);
      }
    });
  },

  // Process voice commands
  processVoiceCommand(command) {
    if (command.includes('login') || command.includes('sign in')) {
      this.selectAuthMethod('smart');
    } else if (
      command.includes('biometric') ||
      command.includes('fingerprint')
    ) {
      this.selectAuthMethod('biometric');
    } else if (command.includes('focus') || command.includes('work')) {
      this.quickAccess('focusMode');
    }
    this.showMessage(`Command: "${command}"`);
  },

  // ===============================================
  // Keyboard Navigation
  // ===============================================
  initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Enhanced tab navigation with visual feedback
      if (e.key === 'Tab') {
        const focused = document.activeElement;
        if (focused) {
          focused.style.outline = '2px solid var(--primary)';
          focused.style.outlineOffset = '4px';
        }
      }

      // Escape to go back
      if (e.key === 'Escape' && this.currentStep > 0) {
        this.navigateToStep(0);
      }

      // Enter to submit on auth methods
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('auth-method')) {
          activeElement.click();
        }
      }
    });
  },

  // ===============================================
  // Touch Gesture Support
  // ===============================================
  setupTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;

    // Track touch start position
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    // Show gesture trail on touch move
    document.addEventListener('touchmove', (e) => {
      const trail = document.getElementById('gestureTrail');
      if (trail) {
        trail.style.left = e.touches[0].clientX + 'px';
        trail.style.top = e.touches[0].clientY + 'px';
        trail.classList.add('active');

        setTimeout(() => {
          trail.classList.remove('active');
        }, 800);
      }
    });

    // Handle swipe gestures
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // Detect horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next step
          if (this.currentStep < 2) this.navigateToStep(this.currentStep + 1);
        } else {
          // Swipe right - previous step
          if (this.currentStep > 0) this.navigateToStep(this.currentStep - 1);
        }
      }
    });
  },

  // ===============================================
  // Sound Effects System
  // ===============================================
  playSound(frequency, duration = 100) {
    if (!this.soundEnabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Connect audio nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Set frequency and gain
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration / 1000
    );

    // Play sound
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  },

  // ===============================================
  // Haptic Feedback
  // ===============================================
  simulateHaptic(intensity = 10) {
    if (!this.hapticEnabled) return;

    // Use Vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate(intensity);
    }
  },

  // ===============================================
  // Event Listeners Setup
  // ===============================================
  setupEventListeners() {
    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.classList.toggle('active', this.soundEnabled);
        if (this.soundEnabled) this.playSound(523.25, 100);
      });
    }

    // Haptic toggle
    const hapticToggle = document.getElementById('hapticToggle');
    if (hapticToggle) {
      hapticToggle.addEventListener('click', () => {
        this.hapticEnabled = !this.hapticEnabled;
        hapticToggle.classList.toggle('active', this.hapticEnabled);
        if (this.hapticEnabled) this.simulateHaptic(20);
      });
    }

    // High contrast toggle
    const contrastToggle = document.getElementById('contrastToggle');
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        contrastToggle.classList.toggle('active');
        this.playSound(440, 100);
      });
    }

    // Domain indicators
    document.querySelectorAll('.domain-indicator').forEach((indicator) => {
      indicator.addEventListener('click', () => {
        // Update active state
        document
          .querySelectorAll('.domain-indicator')
          .forEach((d) => d.classList.remove('active'));
        indicator.classList.add('active');
        this.selectedDomain = indicator.dataset.domain;

        // Play feedback
        this.playSound(659.25, 100);
        this.simulateHaptic(10);

        // Update theme based on domain
        const domainThemes = {
          work: 'focus',
          education: 'morning',
          personal: 'evening',
          social: 'night',
        };

        const theme = domainThemes[this.selectedDomain];
        document.documentElement.style.setProperty(
          '--primary',
          `var(--${theme}-primary)`
        );
        document.documentElement.style.setProperty(
          '--secondary',
          `var(--${theme}-secondary)`
        );
        document.documentElement.style.setProperty(
          '--accent',
          `var(--${theme}-accent)`
        );
        document.documentElement.style.setProperty(
          '--glow',
          `var(--${theme}-glow)`
        );
      });
    });

    // Smart form submission
    const smartForm = document.getElementById('smartForm');
    if (smartForm) {
      smartForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const input = document.getElementById('smartInput').value;

        // Show loading animation
        const loadingDna = document.getElementById('loadingDna');
        if (loadingDna) loadingDna.classList.add('active');
        this.playSound(440, 200);

        // Simulate AI processing
        setTimeout(() => {
          if (input.includes('@utool.ai') || input === 'demo') {
            this.showSuccess();
          } else {
            // Show AI suggestion
            this.showMessage('AI: Did you mean work@utool.ai?');
            if (loadingDna) loadingDna.classList.remove('active');
          }
        }, 2000);
      });
    }

    // Throttled mouse move for performance
    document.addEventListener(
      'mousemove',
      this.throttle((e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      }, 16)
    );
  },

  // ===============================================
  // Authentication Methods
  // ===============================================
  selectAuthMethod(method) {
    this.playSound(587.33, 100);
    this.simulateHaptic(15);

    // Add tilt animation to command center
    const card = document.getElementById('commandCenter');
    if (card) {
      card.classList.add('tilted');
      setTimeout(() => {
        card.classList.remove('tilted');
      }, 300);
    }

    // Navigate to appropriate step
    switch (method) {
      case 'smart':
        this.navigateToStep(1);
        break;
      case 'biometric':
        this.navigateToStep(2);
        break;
      case 'passkey':
        this.showMessage('Passkey authentication coming soon!');
        break;
      case 'pattern':
        this.showMessage('Pattern unlock coming soon!');
        break;
    }
  },

  // ===============================================
  // Quick Access Actions
  // ===============================================
  quickAccess(action) {
    this.playSound(700, 100);
    this.simulateHaptic(10);

    switch (action) {
      case 'lastProject':
        this.showMessage('Loading your last project...');
        break;
      case 'dailyReview':
        this.showMessage('Preparing your daily review...');
        break;
      case 'focusMode':
        this.showMessage('Entering focus mode...');
        document.body.style.filter = 'saturate(0.8)';
        setTimeout(() => {
          document.body.style.filter = '';
        }, 3000);
        break;
    }
  },
  // ===============================================
  // Navigation System
  // ===============================================
  navigateToStep(step) {
    // Play different sound for going back vs forward
    const currentStep = this.currentStep;
    if (step < currentStep) {
      // Going back - lower pitch sound
      this.playSound(523.25, 100); // C note
      this.simulateHaptic(5); // Gentler haptic
    } else {
      // Going forward - higher pitch sound
      this.playSound(659.25, 100); // E note
      this.simulateHaptic(10);
    }

    // Hide all steps
    document.querySelectorAll('.form-step').forEach((s) => {
      s.classList.remove('active');
    });

    // Hide all back buttons first
    document.getElementById('backButtonStep1').style.display = 'none';
    document.getElementById('backButtonStep2').style.display = 'none';

    // Show target step after delay
    setTimeout(() => {
      const targetStep = document.getElementById(`step${step}`);
      if (targetStep) {
        targetStep.classList.add('active');
        this.currentStep = step;

        // Show appropriate back button for steps 1 and 2
        if (step === 1) {
          document.getElementById('backButtonStep1').style.display = 'flex';
          const smartInput = document.getElementById('smartInput');
          if (smartInput) smartInput.focus();
        } else if (step === 2) {
          document.getElementById('backButtonStep2').style.display = 'flex';
        }
      }
    }, 100);
  },

  // ===============================================
  // Utility Functions
  // ===============================================
  fillSuggestion(value) {
    const smartInput = document.getElementById('smartInput');
    if (smartInput) {
      smartInput.value = value;
      this.playSound(523.25, 50);
      this.simulateHaptic(5);
    }
  },

  simulateBiometric() {
    const scanner = document.querySelector('.biometric-scanner');
    if (scanner) {
      scanner.style.filter = 'hue-rotate(120deg)';
    }

    this.playSound(880, 1000);
    this.simulateHaptic(30);

    setTimeout(() => {
      this.showSuccess();
    }, 2000);
  },

  showSuccess() {
    const loadingDna = document.getElementById('loadingDna');
    if (loadingDna) loadingDna.classList.remove('active');

    const activeStep = document.querySelector('.form-step.active');
    if (activeStep) activeStep.style.display = 'none';

    const successPortal = document.getElementById('successPortal');
    if (successPortal) successPortal.classList.add('active');

    // Success sound sequence
    this.playSound(523.25, 100);
    setTimeout(() => this.playSound(659.25, 100), 100);
    setTimeout(() => this.playSound(783.99, 200), 200);

    this.simulateHaptic(50);

    // Show success message
    setTimeout(() => {
      this.showMessage('Welcome to your productivity command center!');
    }, 2000);
  },

  showMessage(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            padding: 16px 32px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s var(--transition-bounce);
            z-index: 2000;
        `;

    document.body.appendChild(toast);

    // Animate toast in
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    // Remove toast after delay
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Performance optimization helper
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Update glow effect on mouse move
  updateGlow(event, element) {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    element.style.setProperty('--mouse-x', `${x}%`);
    element.style.setProperty('--mouse-y', `${y}%`);
  },
};

// ===============================================
// Initialize on DOM Ready
// ===============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => uTool.init());
} else {
  // DOM is already loaded
  uTool.init();
}

// Make updateGlow globally available for inline event handlers
window.updateGlow = uTool.updateGlow;
