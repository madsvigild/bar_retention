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

    let countdownInterval;
    let questions = [];
    let session = {};
    let questionCount = 5; // Maximum questions per game

    console.log("Starting app initialization...");

    // Add this function at the top of your file, before any other functions

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

    // Fetch and cache questions
    async function loadQuestions() {
        try {
            console.log("Loading questions...");
            const response = await fetch('./questions.json'); // Add ./ prefix
            questions = await response.json();
            console.log("Questions loaded:", questions.length);
        } catch (error) {
            console.error("Error loading questions:", error);
        }
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

    // Initialize session
    function initializeSession() {
        const scanCountToday = parseInt(localStorage.getItem('scanCountToday') || '0');
        
        session = {
            sessionId: generateUUID(), // Change here
            barId: "12345",
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
    // Render the next question
    function nextQuestion() {
        console.log("Loading next question...");
        
        // Check if we've reached the maximum questions
        if (session.questionsAnswered >= questionCount) {
            console.log("Max questions reached, ending game");
            endGame();
            return;
        }
        
        const availableQuestions = questions.filter(q => !session.usedQuestionIds.includes(q.id));
        if (availableQuestions.length === 0) {
            console.log("No more available questions, ending game");
            endGame();
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions[randomIndex];
        console.log("Selected question:", question);

        // Update session
        session.usedQuestionIds.push(question.id);
        session.questionsAnswered++;
        localStorage.setItem('session', JSON.stringify(session));

        // Render question and choices
        const questionText = document.querySelector('#game-screen h2');
        questionText.textContent = question.question;
        answerButtons.forEach((button, index) => {
            // Reset button styling completely to default state
            button.style.backgroundColor = '#2196F3'; // Reset to default blue
            button.style.transform = 'none'; // Reset any transform/scale effect
            button.classList.remove('clicked'); // Remove any clicked class if exists
            button.blur(); // Remove focus state
            
            // Force DOM reflow to ensure animations reset
            void button.offsetWidth;
            
            // Set new content and data
            button.textContent = question.choices[index];
            button.dataset.correct = (index === question.correct).toString();
        });

        // Update progress bar
        quizProgress.value = session.questionsAnswered;
        quizProgress.max = questionCount;
    }

    // Handle answer selection
    function setupAnswerButtons() {
        answerButtons.forEach(button => {
            button.addEventListener('click', function () {
                const isCorrect = this.dataset.correct === "true";
                if (isCorrect) {
                    session.score++;
                    alert("Korrekt!");
                } else {
                    alert("Forkert!");
                }
                
                localStorage.setItem('session', JSON.stringify(session));
                
                if (session.questionsAnswered >= questionCount) {
                    endGame();
                } else {
                    // Small delay before next question
                    setTimeout(() => {
                        nextQuestion();
                    }, 800);
                }
            });
        });
    }

    // End the game
    function endGame() {
        console.log("Ending game with score:", session.score);
        const prizeLevel = calculatePrizeLevel();
        const voucherCode = generateUUID(); // Change here
        
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
        if (session.score >= 5) return "guld";
        if (session.score >= 3) return "sølv";
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
    startButton.addEventListener('click', async function () {
    console.log("Start button clicked on mobile!");
    try {
        initializeSession();
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
        await nextQuestion(); // Add await here
        console.log("Game screen should be visible now");
    } catch (error) {
        console.error("Error in start button handler:", error);
        alert("Der opstod en fejl: " + error.message); // Show error in alert for mobile debugging
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

    // Setup functions
    setupAnswerButtons();
    
    // Load questions and initialize cooldown state on page load
    await loadQuestions();
    showCooldown();
});