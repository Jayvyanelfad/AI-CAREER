document.addEventListener("DOMContentLoaded", function() {
    // DOM Elements
    const paymentTabs = document.querySelectorAll(".method-tab");
    const paymentSections = document.querySelectorAll(".payment-section");
    const upiPayBtn = document.getElementById("upi-pay-btn");
    const cardPayBtn = document.getElementById("card-pay-btn");
    const processingOverlay = document.querySelector(".payment-overlay");
    const successModal = document.getElementById("success-modal");
    const viewCoursesBtn = document.getElementById("view-courses-btn");
    
    // Initialize Stripe (replace with your publishable key)
    const stripe = Stripe('pk_test_your_stripe_key_here');
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
            }
        }
    });
    
    // Mount Stripe card element
    cardElement.mount('#card-element');
    
    // Handle payment method tabs
    paymentTabs.forEach(tab => {
        tab.addEventListener("click", function() {
            const method = this.dataset.method;
            
            // Update active tab
            paymentTabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");
            
            // Show corresponding section
            paymentSections.forEach(section => {
                section.classList.remove("active");
                if (section.classList.contains(`${method}-payment`)) {
                    section.classList.add("active");
                }
            });
        });
    });
    
    // Handle UPI payment
    upiPayBtn.addEventListener("click", function() {
        const upiId = document.getElementById("upi-id").value;
        
        if (!validateUPI(upiId)) {
            alert("Please enter a valid UPI ID (e.g., name@upi)");
            return;
        }
        
        processPayment("upi", { upi_id: upiId });
    });
    
    // Handle Card payment
    cardPayBtn.addEventListener("click", async function() {
        processingOverlay.classList.remove("hidden");
        
        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
        });
        
        if (error) {
            processingOverlay.classList.add("hidden");
            document.getElementById("card-errors").textContent = error.message;
            return;
        }
        
        processPayment("card", { payment_method_id: paymentMethod.id });
    });
    
    // View courses after successful payment
    viewCoursesBtn.addEventListener("click", function() {
        window.location.href = "premium-courses.html";
    });
    
    // Helper Functions
    function validateUPI(upiId) {
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId);
    }
    
    async function processPayment(method, paymentData) {
        processingOverlay.classList.remove("hidden");
        
        try {
            // In a real app, you would send this to your backend
            const response = await simulatePaymentAPI(method, paymentData);
            
            if (response.success) {
                // Store payment status in localStorage
                localStorage.setItem("premium-member", "true");
                localStorage.setItem("payment-method", method);
                
                // Show success
                processingOverlay.classList.add("hidden");
                successModal.classList.remove("hidden");
            } else {
                throw new Error(response.message || "Payment failed");
            }
        } catch (error) {
            processingOverlay.classList.add("hidden");
            alert(`Payment Error: ${error.message}`);
            console.error("Payment error:", error);
        }
    }
    
    // Simulate payment API call
    function simulatePaymentAPI(method, data) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    transaction_id: `txn_${Math.random().toString(36).substr(2, 9)}`,
                    method: method
                });
            }, 2000);
        });
    }
    
    // Set username if available
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
        document.getElementById("username").textContent = storedUsername;
    }
});