document.addEventListener('DOMContentLoaded', async function () {
    const startButton = document.getElementById('start-button');
    const cooldownButton = document.getElementById('cooldown-button');
    const gameLogo = document.querySelector('.game-logo');
    const welcomeScreen = document.getElementById('welcome-screen');
    const gameScreen = document.getElementById('game-screen');
    const winScreen = document.getElementById('win-screen');
    const loseScreen = document.getElementById('lose-screen');
    const answerButtons = document.querySelectorAll('.answer-button');
    const retryButton = document.getElementById('retry-button');
    const quizProgress = document.getElementById('quiz-progress');
    const topBar = document.querySelector('.top-bar');
    const bottomBar = document.querySelector('.bottom-bar');
    const barLogo = document.querySelector('.bar-logo');

    // Get the bar ID from URL parameters (default to "default")
    const urlParams = new URLSearchParams(window.location.search);
    const barId = urlParams.get('barId') || 'default';
    console.log(`Bar ID from URL: ${barId}`);
    
    let barConfig = {};
    let countdownInterval;
    let questions = [];
    let session = {};
    let currentIndex = 0;

    console.log("Starting app initialization...");

    // Generate UUID function compatible with all browsers
    function generateUUID() {
        // Check if native crypto.randomUUID is available
        if (crypto && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        
        // Fallback implementation for browsers that don't support crypto.randomUUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Load bar configuration
    async function loadBarConfig() {
        try {
            console.log(`Loading configuration for bar: ${barId}`);
            let response = await fetch(`./data/bars/${barId}.json`);
            
            // If specific bar config not found, fall back to default
            if (!response.ok) {
                console.log(`Configuration for ${barId} not found, loading default configuration`);
                response = await fetch('./data/bars/default.json');
            }
            
            if (!response.ok) {
                throw new Error('Failed to load any bar configuration');
            }
            
            barConfig = await response.json();
            console.log("Bar configuration loaded successfully:", barConfig);
            
            // Apply configuration to UI
            applyBarConfig();
            
            // Now load the quiz data for this bar
            await loadQuizData();
        } catch (error) {
            console.error("Error loading bar configuration:", error);
            alert("Der opstod en fejl under indlæsning af konfigurationen: " + error.message);
            
            // Set default configuration
            barConfig = {
                name: "Bar Quiz Game",
                theme: {
                    primaryColor: "#27ae60",
                    secondaryColor: "#f39c12",
                    fontFamily: "Poppins, sans-serif",
                    headerBgColor: "#2ecc71",
                    footerBgColor: "#2ecc71"
                },
                game: {
                    quizFile: "quiz_default.json",
                    winThreshold: 3,
                    cooldownMinutes: 60,
                    prizes: {
                        gold: "special øl",
                        silver: "alm. øl",
                        bronze: "øl"
                    }
                },
                assets: {
                    barLogo: "Pictures/Indsæt logo.png"
                },
                texts: {
                    welcome: "Velkommen! Vind en gratis øl!",
                    subtitle: "Scan, spil og vind!",
                    winMessage: "Tillykke! Du har vundet!",
                    loseMessage: "Øv, prøv igen næste gang!"
                }
            };
            applyBarConfig();
            
            // Try to load quiz data anyway
            await loadQuizData();
        }
    }
    
    // Apply bar configuration to UI
    function applyBarConfig() {
        // Set document title
        document.title = barConfig.name;
        
        // Apply theme colors
        const root = document.documentElement;
        if (barConfig.theme) {
            root.style.setProperty('--primary-color', barConfig.theme.primaryColor || '#27ae60');
            root.style.setProperty('--secondary-color', barConfig.theme.secondaryColor || '#f39c12');
            
            // Set header and footer colors
            if (topBar) topBar.style.backgroundColor = barConfig.theme.headerBgColor || '#2ecc71';
            if (bottomBar) bottomBar.style.backgroundColor = barConfig.theme.footerBgColor || '#2ecc71';
            
            // Set font family if provided
            if (barConfig.theme.fontFamily) {
                root.style.setProperty('--font-family', barConfig.theme.fontFamily);
            }
        }
        
        // Set bar logo
        if (barLogo && barConfig.assets) {
            barLogo.src = barConfig.assets.barLogo || barConfig.assets.defaultBarLogo || "Pictures/Indsæt logo.png";
            barLogo.alt = barConfig.name;
        }
        
        // Set texts
        if (barConfig.texts) {
            // Welcome screen texts
            const welcomeTitle = document.querySelector('#welcome-screen h1');
            if (welcomeTitle) welcomeTitle.textContent = barConfig.texts.welcome || "Velkommen! Vind en gratis øl!";
            
            const welcomeSubtitle = document.querySelector('#welcome-screen .subheading');
            if (welcomeSubtitle) welcomeSubtitle.textContent = barConfig.texts.subtitle || "Scan, spil og vind!";
            
            // Win/lose screen texts
            const winTitle = document.querySelector('#win-screen h2');
            if (winTitle) winTitle.textContent = barConfig.texts.winMessage || "Tillykke! Du har vundet!";
            
            const loseTitle = document.querySelector('#lose-screen h2');
            if (loseTitle) loseTitle.textContent = barConfig.texts.loseMessage || "Øv, prøv igen næste gang!";
        }
    }

    // Fetch quiz data based on bar configuration
    async function loadQuizData() {
        try {
            const quizFile = barConfig.game?.quizFile || `quiz_${barId}.json`;
            console.log(`Loading quiz data from: ${quizFile}`);
            
            let response = await fetch(`./data/${quizFile}`);
            
            // If specific bar quiz not found, fall back to default
            if (!response.ok) {
                console.log(`Quiz ${quizFile} not found, loading default quiz`);
                response = await fetch('./data/quiz_default.json');
                
                // If even default fails, try the original questions.json as last resort
                if (!response.ok) {
                    console.log('Default quiz not found, trying original questions.json');
                    response = await fetch('./questions.json');
                }
            }
            
            if (!response.ok) {
                throw new Error('Failed to load any quiz data');
            }
            
            questions = await response.json();
            console.log("Quiz data loaded successfully:", questions.length);
            
            // Initialize quiz once data is loaded
            initQuiz();
        } catch (error) {
            console.error("Error loading quiz data:", error);
            alert("Der opstod en fejl under indlæsning af quizzen: " + error.message);
        }
    }

    // Initialize the quiz
    function initQuiz() {
        currentIndex = 0;
        
        // Initialize session with proper barId
        initializeSession();
        
        // Set progress bar max based on questions count
        if (quizProgress) {
            quizProgress.max = questions.length;
        }
        
        // Show the first question
        showQuestion(currentIndex);
        
        // Wire up any initial buttons that might be in the HTML
        setupAnswerButtons();
    }

    // Show question at specified index
    function showQuestion(index) {
        if (index >= questions.length) {
            console.log("No more questions, ending game");
            endGame();
            return;
        }

        const question = questions[index];
        console.log("Showing question:", question);

        // Update session - Use index instead of question.id to avoid confusion
        // since array indices start at 0 but question IDs might start at 1 or be non-sequential
        if (!session.usedQuestionIndices) {
            session.usedQuestionIndices = [];
        }
        
        if (!session.usedQuestionIndices.includes(index)) {
            session.usedQuestionIndices.push(index);
            session.questionsAnswered++;
            localStorage.setItem('session', JSON.stringify(session));
        }

        // Get game container
        const gameContainer = document.querySelector('.game-container');
        
        // Update question text
        const questionText = document.querySelector('#game-screen h2');
        questionText.textContent = question.question;
        
        // Remove existing buttons
        const oldButtons = document.querySelectorAll('.answer-button');
        oldButtons.forEach(button => button.remove());
        
        // Create fresh buttons for each answer
        question.choices.forEach((choice, choiceIndex) => {
            const button = document.createElement('button');
            button.className = 'answer-button';
            button.textContent = choice;
            button.dataset.correct = (choiceIndex === question.correct).toString();
            
            // Add the click event listener
            button.addEventListener('click', function() {
                handleAnswerSelection(this);
            });
            
            gameContainer.appendChild(button);
        });

        // Update progress bar
        if (quizProgress) {
            quizProgress.value = index + 1;
        }
    }
    
    // Handle answer selection
    function handleAnswerSelection(button) {
        // Disable all buttons to prevent multiple selections
        const buttons = document.querySelectorAll('.answer-button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
        });
        
        const isCorrect = button.dataset.correct === "true";
        
        // Show visual feedback for the selected button
        if (isCorrect) {
            button.classList.add('correct');
            session.score++;
        } else {
            button.classList.add('incorrect');
            
            // Also show which one was the correct answer
            buttons.forEach(btn => {
                if (btn.dataset.correct === "true") {
                    btn.classList.add('correct');
                }
            });
        }
        
        localStorage.setItem('session', JSON.stringify(session));
        
        // Proceed to next question after a delay
        setTimeout(() => {
            currentIndex++;
            if (currentIndex >= questions.length) {
                endGame();
            } else {
                showQuestion(currentIndex);
            }
        }, 1500); // 1.5 second delay to show the feedback
    }

    // Initialize session
    function initializeSession() {
        const scanCountToday = parseInt(localStorage.getItem('scanCountToday') || '0');
        
        session = {
            sessionId: generateUUID(),
            barId: barId,
            usedQuestionIds: [],
            usedQuestionIndices: [],
            score: 0,
            scanCountToday: scanCountToday + 1,
            startTime: Date.now(),
            questionsAnswered: 0
        };
        
        localStorage.setItem('scanCountToday', session.scanCountToday.toString());
        localStorage.setItem('session', JSON.stringify(session));
        console.log("Session initialized:", session);
    }

    // Set up initial answer buttons if present in HTML
    function setupAnswerButtons() {
        const initialButtons = document.querySelectorAll('.answer-button');
        initialButtons.forEach(button => {
            button.addEventListener('click', function() {
                handleAnswerSelection(this);
            });
        });
    }

    // Function to show cooldown or normal start button
    function showCooldown() {
        const lastPlay = localStorage.getItem('lastPlay');
        if (!lastPlay) {
            // No last play timestamp, show normal start button
            startButton.classList.remove('hidden');
            cooldownButton.classList.add('hidden');
            return;
        }
        
        // Get cooldown period from bar config or use default
        const cooldownMinutes = barConfig.game?.cooldownMinutes || 60;
        const cooldownMs = cooldownMinutes * 60 * 1000;

        const remaining = cooldownMs - (Date.now() - parseInt(lastPlay, 10));
        if (remaining > 0) {
            // Show cooldown button
            startButton.classList.add('hidden');
            cooldownButton.classList.remove('hidden');
            updateCooldown(remaining, cooldownMinutes);
        } else {
            // Show normal start button
            startButton.classList.remove('hidden');
            cooldownButton.classList.add('hidden');
        }
    }

    // Function to update cooldown timer
    function updateCooldown(remaining, cooldownMinutes) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        cooldownButton.textContent = `Spil igen om ${minutes}:${seconds.toString().padStart(2, '0')}`;

        countdownInterval = setInterval(() => {
            const newRemaining = remaining - 1000;
            if (newRemaining <= 0) {
                clearInterval(countdownInterval);
                cooldownButton.classList.add('hidden');
                startButton.classList.remove('hidden');
                cooldownButton.textContent = `Spil igen om ${cooldownMinutes}:00`; // Reset text with config cooldown
            } else {
                const newMinutes = Math.floor(newRemaining / 60000);
                const newSeconds = Math.floor((newRemaining % 60000) / 1000);
                cooldownButton.textContent = `Spil igen om ${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
                remaining -= 1000;
            }
        }, 1000);
    }

    // End the game
    function endGame() {
        console.log("Ending game with score:", session.score);
        const prizeLevel = calculatePrizeLevel();
        const voucherCode = generateUUID();
        
        // Store voucher in session
        session.voucherCode = voucherCode;
        session.prizeLevel = prizeLevel;
        localStorage.setItem('session', JSON.stringify(session));
        
        // Hide game screen
        gameScreen.classList.remove('active');
        gameScreen.classList.add('hidden');
        
        // Show logos and bars again
        barLogo.classList.remove('hidden');
        gameLogo.classList.remove('hidden');
        topBar.classList.remove('hidden');
        bottomBar.classList.remove('hidden');
        
        // Restore padding
        document.querySelector('.content-container').style.paddingTop = '160px';
        document.querySelector('.content-container').style.paddingBottom = '60px';
        
        // Update score display
        const scoreValueElement = document.querySelector('#win-screen .score-value');
        if (scoreValueElement) {
            scoreValueElement.textContent = session.score;
        }
        
        // Get win threshold from bar config or use default
        const winThreshold = barConfig.game?.winThreshold || 3;
        
        // Show win or lose screen based on score and configured threshold
        if (session.score >= winThreshold) {
            console.log("Win condition met!");
            
            // Update win screen with prize info based on bar config
            const voucherElement = document.querySelector('#win-screen .voucher');
            if (voucherElement) {
                // Get prize based on score level
                let prizeName = barConfig.game?.prizes?.[prizeLevel] || "øl";
                voucherElement.textContent = `${prizeName}`;
            }
            
            winScreen.classList.remove('hidden');
            winScreen.classList.add('active');
        } else {
            console.log("Loss condition met");
            loseScreen.classList.remove('hidden');
            loseScreen.classList.add('active');
        }
        
        // Set cooldown for next game
        localStorage.setItem('lastPlay', Date.now());
    }

    // Calculate prize level based on score percentage
    function calculatePrizeLevel() {
        const scorePercentage = (session.score / questions.length) * 100;
        
        if (scorePercentage >= 100) return "gold";
        if (scorePercentage >= 60) return "silver";
        return "bronze";
    }

    // Reset countdown logic (attached to the game logo)
    gameLogo.addEventListener('click', function () {
        localStorage.removeItem('lastPlay');
        clearInterval(countdownInterval);
        startButton.classList.remove('hidden');
        cooldownButton.classList.add('hidden');
        alert("Nedtælling nulstillet. Du kan spille igen!");
    });

    // Navigate to Game Screen
    startButton.addEventListener('click', function () {
        console.log("Start button clicked!");
        try {
            welcomeScreen.classList.add('hidden');
            
            // Hide logos and bars during gameplay for better focus
            barLogo.classList.add('hidden');
            gameLogo.classList.add('hidden');
            topBar.classList.add('hidden');
            bottomBar.classList.add('hidden');
            
            // Remove top and bottom padding from content container
            document.querySelector('.content-container').style.paddingTop = '10px';
            document.querySelector('.content-container').style.paddingBottom = '10px';
            
            gameScreen.classList.remove('hidden');
            gameScreen.classList.add('active');
            console.log("Game screen should be visible now");
        } catch (error) {
            console.error("Error in start button handler:", error);
            alert("Der opstod en fejl: " + error.message);
        }
    });

    // Retry button logic
    retryButton.addEventListener('click', function () {
        loseScreen.classList.remove('active');
        loseScreen.classList.add('hidden');
        
        // Show logos and bars again when returning to welcome screen
        barLogo.classList.remove('hidden');
        gameLogo.classList.remove('hidden');
        topBar.classList.remove('hidden');
        bottomBar.classList.remove('hidden');
        
        // Restore padding
        document.querySelector('.content-container').style.paddingTop = '160px';
        document.querySelector('.content-container').style.paddingBottom = '60px';
        
        welcomeScreen.classList.remove('hidden');
        showCooldown();
    });

    // Initialize app by loading bar config
    await loadBarConfig();
    showCooldown();
});