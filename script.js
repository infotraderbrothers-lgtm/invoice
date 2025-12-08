// ========================================
// STRIPE CONFIGURATION
// ========================================
// IMPORTANT: Replace 'pk_test_...' with your actual Stripe publishable key
// Get your key from: https://dashboard.stripe.com/apikeys
const stripe = Stripe('pk_test_51QWD4cCiMXC9wKEJQB2h3PjPRf7Nn8rbPK6dqU21yYCfzqIDiznJAXlc1dUIgXwYRzONnJn6RXQ3GgVXkzQbKMtv00HjWGihbh');

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
const successMessage = document.getElementById('successMessage');
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
  }, 500);
});

// Close overlay and return to invoice
closeOverlay.addEventListener('click', function() {
  paymentOverlay.classList.remove('active');
  checkmarkContainer.style.display = 'flex';
  thankYouScreen.classList.remove('active');
  
  // Optionally refresh the page or update invoice status
  // location.reload();
});

// Handle real-time validation errors from the card Element
cardElement.addEventListener('change', function(event) {
  if (event.error) {
    cardErrors.textContent = event.error.message;
  } else {
    cardErrors.textContent = '';
  }
});

// Handle payment submission
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

  // Disable button and show loading state
  submitPayment.disabled = true;
  submitPayment.textContent = 'Processing...';
  cardErrors.textContent = '';

  try {
    // ========================================
    // STEP 1: Create Payment Intent on your server
    // ========================================
    // You need to create a server endpoint that creates a Stripe Payment Intent
    // This example assumes you have an endpoint at '/create-payment-intent'
    
    const response = await fetch('/create-payment-intent', {
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
        document.getElementById('transactionIdDisplay').textContent = paymentIntent.id;
        
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
  } catch (err) {
    console.error('Error:', err);
    cardErrors.textContent = 'Payment failed. Please try again or contact support.';
    submitPayment.disabled = false;
    submitPayment.textContent = 'Pay £5,522.59';
  }
});
