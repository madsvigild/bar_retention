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
    const barId = urlParams.get('bar') || 'default';
    console.log(`Bar ID from URL: ${barId}`);

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

    // Fetch quiz data based on barId
    async function loadQuizData() {
        try {
            console.log(`Loading quiz data for bar: ${barId}`);
            let response = await fetch(`./data/quiz_${barId}.json`);
            
            // If specific bar quiz not found, fall back to default
            if (!response.ok) {
                console.log(`Quiz for ${barId} not found, loading default quiz`);
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

        // Update session
        if (!session.usedQuestionIds.includes(question.id)) {
            session.usedQuestionIds.push(question.id);
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

        const remaining = 3600000 - (Date.now() - parseInt(lastPlay, 10));
        if (remaining > 0) {
            // Show cooldown button
            startButton.classList.add('hidden');
            cooldownButton.classList.remove('hidden');
            updateCooldown(remaining);
        } else {
            // Show normal start button
            startButton.classList.remove('hidden');
            cooldownButton.classList.add('hidden');
        }
    }

    // Function to update cooldown timer
    function updateCooldown(remaining) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        cooldownButton.textContent = `Spil igen om ${minutes}:${seconds.toString().padStart(2, '0')}`;

        countdownInterval = setInterval(() => {
            const newRemaining = remaining - 1000;
            if (newRemaining <= 0) {
                clearInterval(countdownInterval);
                cooldownButton.classList.add('hidden');
                startButton.classList.remove('hidden');
                cooldownButton.textContent = "Spil igen om 60:00"; // Reset text
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
        
        // Show win or lose screen based on score
        if (session.score >= 3) {
            console.log("Win condition met!");
            
            // Update win screen with prize info
            const voucherElement = document.querySelector('#win-screen .voucher');
            if (voucherElement) {
                voucherElement.textContent = `1 gratis ${prizeLevel} øl`;
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

    // Calculate prize level
    function calculatePrizeLevel() {
        if (session.score >= questions.length) return "guld";
        if (session.score >= Math.ceil(questions.length / 2)) return "sølv";
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

    // Initialize app by loading quiz data and showing cooldown
    await loadQuizData();
    showCooldown();
});