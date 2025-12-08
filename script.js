// ========================================
// STRIPE CONFIGURATION
// ========================================
// Replace with your actual Stripe publishable key from https://dashboard.stripe.com/apikeys
const stripe = Stripe('pk_test_51QWD4cCiMXC9wKEJQB2h3PjPRf7Nn8rbPK6dqU21yYCfzqIDiznJAXlc1dUIgXwYRzONnJn6RXQ3GgVXkzQbKMtv00HjWGihbh');

// ========================================
// BACKEND CONFIGURATION
// ========================================
// Replace this with your Render backend URL after deployment
// Example: 'https://your-invoice-backend.onrender.com/create-payment-intent'
const BACKEND_URL = 'https://your-invoice-backend.onrender.com/create-payment-intent';

// Create an instance of Stripe Elements
const elements = stripe.elements();

// Create and mount the card element
const cardElement = elements.create('card', {
  style: {
    base: {
      fontSize: '16px',
      color: '#333',
      fontFamily: 'Arial, sans-serif',
      '::placeholder': {
        color: '#aaa',
      },
    },
    invalid: {
      color: '#e74c3c',
    },
  },
});

// Get DOM elements
const payNowButton = document.getElementById('payNowButton');
const paymentFormContainer = document.getElementById('paymentFormContainer');
const paymentInitial = document.getElementById('paymentInitial');
const submitPayment = document.getElementById('submitPayment');
const cancelPayment = document.getElementById('cancelPayment');
const cardErrors = document.getElementById('card-errors');
const cardholderName = document.getElementById('cardholderName');
const cardholderEmail = document.getElementById('cardholderEmail');
const paymentOverlay = document.getElementById('paymentOverlay');
const checkmarkContainer = document.getElementById('checkmarkContainer');
const thankYouScreen = document.getElementById('thankYouScreen');
const closeOverlay = document.getElementById('closeOverlay');

// ========================================
// EVENT HANDLERS
// ========================================

// Show payment form when Pay Now is clicked
payNowButton.addEventListener('click', function() {
  paymentInitial.style.display = 'none';
  paymentFormContainer.classList.add('active');
  
  // Mount the card element when form is shown
  cardElement.mount('#card-element');
  
  // Scroll to form
  setTimeout(() => {
    paymentFormContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
});

// Cancel payment and return to initial view
cancelPayment.addEventListener('click', function() {
  paymentFormContainer.classList.remove('active');
  setTimeout(() => {
    paymentInitial.style.display = 'block';
    cardElement.unmount();
    cardErrors.textContent = '';
  }, 500);
});

// Close overlay and return to invoice
closeOverlay.addEventListener('click', function() {
  paymentOverlay.classList.remove('active');
  checkmarkContainer.style.display = 'flex';
  thankYouScreen.classList.remove('active');
});

// Handle real-time validation errors from the card Element
cardElement.addEventListener('change', function(event) {
  if (event.error) {
    cardErrors.textContent = event.error.message;
  } else {
    cardErrors.textContent = '';
  }
});

// ========================================
// PAYMENT SUBMISSION
// ========================================

submitPayment.addEventListener('click', async function(e) {
  e.preventDefault();

  // Validate inputs
  if (!cardholderName.value.trim()) {
    cardErrors.textContent = 'Please enter the cardholder name';
    return;
  }

  if (!cardholderEmail.value.trim()) {
    cardErrors.textContent = 'Please enter your email address';
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cardholderEmail.value.trim())) {
    cardErrors.textContent = 'Please enter a valid email address';
    return;
  }

  // Disable button and show loading state
  submitPayment.disabled = true;
  submitPayment.textContent = 'Processing...';
  cardErrors.textContent = '';

  try {
    // ========================================
    // STEP 1: Create Payment Intent on your Render backend
    // ========================================
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 552259, // Amount in pence (£5,522.59)
        currency: 'gbp',
        invoiceNumber: 'INV-2025-001',
        customerEmail: cardholderEmail.value,
        customerName: cardholderName.value,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    const { clientSecret } = await response.json();

    // ========================================
    // STEP 2: Confirm the payment with Stripe
    // ========================================
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardholderName.value,
          email: cardholderEmail.value,
        },
      },
    });

    if (error) {
      // Payment failed
      cardErrors.textContent = error.message;
      submitPayment.disabled = false;
      submitPayment.textContent = 'Pay £5,522.59';
    } else if (paymentIntent.status === 'succeeded') {
      // Payment succeeded!
      handleSuccessfulPayment(paymentIntent.id);
    }
  } catch (err) {
    console.error('Payment Error:', err);
    
    // Show user-friendly error message
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      cardErrors.textContent = '⚠️ Unable to connect to payment server. Please check your backend URL is correct.';
      console.error(`
========================================
CONNECTION ERROR
========================================

Cannot connect to backend at: ${BACKEND_URL}

Please ensure:
1. Your Render backend is deployed and running
2. The BACKEND_URL variable is set to your correct Render URL
3. Your backend has CORS enabled for your domain
4. Your Render service is not sleeping (free tier sleeps after inactivity)

Check your Render dashboard: https://dashboard.render.com
      `);
    } else {
      cardErrors.textContent = err.message || 'Payment failed. Please try again or contact support.';
    }
    
    submitPayment.disabled = false;
    submitPayment.textContent = 'Pay £5,522.59';
  }
});

// ========================================
// SUCCESS HANDLER
// ========================================
function handleSuccessfulPayment(transactionId) {
  // Hide the payment form
  paymentFormContainer.classList.remove('active');
  
  // Show the overlay with checkmark
  paymentOverlay.classList.add('active');
  checkmarkContainer.style.display = 'flex';
  
  // After 2 seconds, transition to thank you screen
  setTimeout(() => {
    checkmarkContainer.style.display = 'none';
    thankYouScreen.classList.add('active');
    
    // Set the payment details
    document.getElementById('transactionIdDisplay').textContent = transactionId;
    
    // Set current date
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    document.getElementById('paymentDate').textContent = formattedDate;
  }, 2000);
}
