document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const planButtons = document.querySelectorAll('.plan-btn');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const currencyButtons = document.querySelectorAll('.currency-btn');

    // Error Handling for Missing Elements
    if (!planButtons.length || !loadingOverlay || !currencyButtons.length) {
        console.error('Critical elements missing from the page');
        return;
    }

    // Plan Selection
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Accessibility: Indicate loading state
            loadingOverlay.setAttribute('aria-busy', 'true');
            loadingOverlay.classList.remove('hidden');
            
            // Disable buttons during loading
            planButtons.forEach(btn => btn.disabled = true);

            // Simulate loading delay
            setTimeout(() => {
                try {
                    if (this.classList.contains('free-btn')) {
                        window.location.href = 'free-courses.html';
                    } else {
                        window.location.href = 'payment.html';
                    }
                } catch (error) {
                    console.error('Navigation error:', error);
                    loadingOverlay.classList.add('hidden');
                    planButtons.forEach(btn => btn.disabled = false);
                    alert('An error occurred. Please try again.');
                }
            }, 1500);
        });
    });

    // Currency Toggle
    currencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update visual state
            currencyButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            
            // Update prices
            updatePrices(btn.dataset.currency);
        });
    });

    // Price Conversion Function
    function updatePrices(currency) {
        const amounts = document.querySelectorAll('.amount');
        const conversionRate = 75; // USD to INR
        
        amounts.forEach(amount => {
            try {
                const usd = parseFloat(amount.dataset.usd);
                if (isNaN(usd)) {
                    console.warn('Invalid price data for element:', amount);
                    return;
                }
                
                amount.textContent = currency === 'INR' 
                    ? `₹${(usd * conversionRate).toFixed(0)}` 
                    : `$${usd.toFixed(usd % 1 === 0 ? 0 : 2)}`;
            } catch (error) {
                console.error('Price update error:', error);
            }
        });
    }

    // Initialize prices
    document.querySelectorAll('.amount').forEach(amount => {
        const priceValue = parseFloat(amount.textContent.replace(/[^0-9.]/g, ''));
        if (!isNaN(priceValue)) {
            amount.dataset.usd = priceValue;
        }
    });
});