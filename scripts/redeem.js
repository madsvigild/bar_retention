document.addEventListener('DOMContentLoaded', async function() {
    const redeemForm = document.getElementById('redeem-form');
    const barLogo = document.querySelector('.bar-logo');
    const gameLogo = document.querySelector('.game-logo');
    const topBar = document.querySelector('.top-bar');
    const bottomBar = document.querySelector('.bottom-bar');
    const redeemTitle = document.querySelector('#redeem-screen h2');
    
    // Get the bar ID from URL parameters or session
    const urlParams = new URLSearchParams(window.location.search);
    let barId = urlParams.get('barId');
    
    // If no barId in URL, try to get it from the session
    if (!barId) {
        const sessionData = localStorage.getItem('session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                barId = session.barId;
            } catch (e) {
                console.error("Error parsing session data:", e);
            }
        }
    }
    
    // Default to "default" if still no barId
    barId = barId || 'default';
    console.log(`Bar ID: ${barId}`);
    
    // Load bar configuration
    await loadBarConfig(barId);
    
    // Form submission handler
    redeemForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        // Show confirmation alert with custom message if available
        const message = window.barConfig?.texts?.redeemConfirmation || "Tak! Præmien er klar i baren.";
        alert(message);

        // Optionally redirect back to the main page with the barId parameter
        window.location.href = `index.html?barId=${barId}`;
    });
    
    // Load bar configuration
    async function loadBarConfig(barId) {
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
            
            const barConfig = await response.json();
            console.log("Bar configuration loaded successfully:", barConfig);
            
            // Save to window for access in other functions
            window.barConfig = barConfig;
            
            // Apply configuration to UI
            applyBarConfig(barConfig);
            
        } catch (error) {
            console.error("Error loading bar configuration:", error);
            
            // Set default configuration
            window.barConfig = {
                name: "Bar Quiz Game",
                theme: {
                    primaryColor: "#27ae60",
                    secondaryColor: "#f39c12",
                    fontFamily: "Poppins, sans-serif",
                    headerBgColor: "#2ecc71",
                    footerBgColor: "#2ecc71"
                },
                assets: {
                    barLogo: "Pictures/Indsæt logo.png"
                },
                texts: {
                    redeemTitle: "Indløs din præmie",
                    redeemConfirmation: "Tak! Præmien er klar i baren."
                }
            };
            
            applyBarConfig(window.barConfig);
        }
    }
    
    // Apply bar configuration to UI
    function applyBarConfig(barConfig) {
        // Set document title
        document.title = barConfig.name ? `${barConfig.name} - Indløs` : "Indløs præmie";
        
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
            barLogo.alt = barConfig.name || "Bar Logo";
        }
        
        // Set custom texts
        if (barConfig.texts && redeemTitle) {
            redeemTitle.textContent = barConfig.texts.redeemTitle || "Indløs din præmie";
        }
        
        // Get voucher details from session if available
        try {
            const sessionData = localStorage.getItem('session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const voucherElement = document.getElementById('voucher-display');
                if (voucherElement && session.prizeLevel) {
                    const prizeName = barConfig.game?.prizes?.[session.prizeLevel] || "øl";
                    voucherElement.textContent = `${prizeName}`;
                }
            }
        } catch (e) {
            console.error("Error displaying voucher details:", e);
        }
    }
});