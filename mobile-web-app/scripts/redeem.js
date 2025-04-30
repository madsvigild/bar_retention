document.addEventListener('DOMContentLoaded', function() {
    const redeemForm = document.getElementById('redeem-form');

    redeemForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        // Show confirmation alert
        alert("Tak! Præmien er klar i baren.");

        // Optionally redirect back to the main page
        window.location.href = 'index.html';
    });
});