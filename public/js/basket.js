// Basket functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize basket if it doesn't exist
  if (!localStorage.getItem('basket')) {
    localStorage.setItem('basket', JSON.stringify([]));
  }
  
  // Set default delivery option if not set
  if (!localStorage.getItem('deliveryOption')) {
    localStorage.setItem('deliveryOption', 'standard');
    localStorage.setItem('deliveryCost', '30');
  }
  
  // Handle backward compatibility - add configId to existing basket items
  migrateBasketItems();
  
  // Update basket count indicator if it exists
  updateBasketCount();
  
  // Mark all buttons to indicate we've attached listeners in this session
  // This prevents attaching multiple listeners if the script runs more than once
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn:not([data-listener-attached])');
  
  addToCartButtons.forEach(button => {
    // Add event listener directly - we'll use the attribute to avoid duplicating
    button.addEventListener('click', function(event) {
      // Prevent any other handlers from firing
      event.preventDefault();
      event.stopPropagation();
      
      // Call our function directly
      handleAddToBasket(button);
    });
    
    // Mark this button as having a listener attached
    button.setAttribute('data-listener-attached', 'true');
  });
  
  // Render basket items if on basket page
  if (window.location.pathname.includes('/products/basket.html')) {
    renderBasketItems();
    setupBasketPage();
  }
});

// Function to handle adding to basket without relying on event object
function handleAddToBasket(button) {
  console.log("Add to basket handler called");
  
  const productContainer = button.closest('.product-info-detail') || button.closest('.product-info');
  if (!productContainer) {
    console.error("Could not find product container");
    return;
  }
  
  // Get product details
  const productName = productContainer.querySelector('.product-title').innerText;
  const productPrice = productContainer.querySelector('.current-price').innerText.replace('£', '');
  
  // Get product image
  const productImageEl = document.querySelector('.main-image img') || 
                       button.closest('.product-card')?.querySelector('.product-image img');
  const productImage = productImageEl ? productImageEl.src : '';
  
  // Get product ID (can be derived from URL or any data attribute)
  const productId = window.location.pathname.split('/').pop().replace('.html', '') || 
                  Date.now().toString();
  
  // Get extra seats if available (for sofas)
  let extraSeats = 0;
  // Try to get from extraSeats select element
  const extraSeatsSelect = document.getElementById('extraSeats');
  if (extraSeatsSelect) {
    extraSeats = parseInt(extraSeatsSelect.value);
  }
  // Check for button data attribute as fallback
  else if (button.dataset.extraSeats) {
    extraSeats = parseInt(button.dataset.extraSeats);
  }
  
  // Get selected color if available
  let selectedColor = '';
  // Try to get from selectedColorText element
  const selectedColorText = document.getElementById('selectedColorText');
  if (selectedColorText) {
    selectedColor = selectedColorText.innerText;
  }
  // Check for button data attribute as fallback
  else if (button.dataset.color) {
    selectedColor = button.dataset.color;
  }
  
  // Get selected side facing if available
  let sideFacing = '';
  // Try to get from selectedSideText element
  const selectedSideText = document.getElementById('selectedSideText');
  if (selectedSideText) {
    sideFacing = selectedSideText.innerText;
  }
  // Check for button data attribute as fallback
  else if (button.dataset.side) {
    sideFacing = button.dataset.side;
  }
  
  // Get price from the page, if possible, to account for extras like seats
  let finalPrice = parseFloat(productPrice);
  const totalPriceEl = document.querySelector('.total-price h3 span');
  if (totalPriceEl) {
    const totalPriceText = totalPriceEl.textContent.replace('£', '');
    if (!isNaN(parseFloat(totalPriceText))) {
      finalPrice = parseFloat(totalPriceText);
    }
  }
  
  // Create a unique configuration identifier based on product ID, color, side facing and extra seats
  const configId = `${productId}-${selectedColor}-${sideFacing}-${extraSeats}`;
  
  // Add some console logging to debug
  console.log('Adding to basket:', { 
    productId, 
    configId, 
    productName, 
    finalPrice, 
    selectedColor,
    sideFacing, 
    extraSeats 
  });
  
  // Create product object
  const product = {
    id: productId,
    configId: configId,
    name: productName,
    price: finalPrice,
    image: productImage,
    quantity: 1,
    extraSeats: extraSeats,
    color: selectedColor,
    sideFacing: sideFacing
  };
  
  // Get current basket
  const basket = JSON.parse(localStorage.getItem('basket') || '[]');
  
  // Check if product with the same configuration already exists
  const existingProductIndex = basket.findIndex(item => item.configId === configId);
  
  if (existingProductIndex > -1) {
    // Increment quantity if product already exists
    basket[existingProductIndex].quantity += 1;
    showConfirmation('Added to basket! Quantity updated.');
  } else {
    // Add new product to basket with quantity 1
    basket.push(product);
    showConfirmation('Added to basket!');
  }
  
  // Save updated basket
  localStorage.setItem('basket', JSON.stringify(basket));
  
  // Update basket count
  updateBasketCount();
}

// Keep this function for backward compatibility
function addToBasket(event) {
  event.preventDefault();
  event.stopPropagation();
  
  console.log("Legacy add to basket function called");
  
  const button = event.target.closest('.add-to-cart-btn');
  if (!button) return;
  
  // Just delegate to our main handler
  handleAddToBasket(button);
}

// Function to update basket count indicator
function updateBasketCount() {
  const basketCountEl = document.querySelector('.basket-count');
  if (basketCountEl) {
    const basket = JSON.parse(localStorage.getItem('basket') || '[]');
    
    // Calculate total items by summing each item's quantity
    const itemCount = basket.reduce((total, item) => {
      const qty = parseInt(item.quantity) || 0;
      console.log(`Item ${item.name}: quantity = ${qty}`);
      return total + qty;
    }, 0);
    
    console.log("Total basket count:", itemCount);
    
    basketCountEl.textContent = itemCount;
    
    // Hide count if zero
    basketCountEl.style.display = itemCount > 0 ? 'flex' : 'none';
  }
}

// Function to migrate existing basket items to include configId
function migrateBasketItems() {
  const basket = JSON.parse(localStorage.getItem('basket') || '[]');
  let migrationNeeded = false;
  
  basket.forEach(item => {
    if (!item.configId) {
      migrationNeeded = true;
      // Generate configId from existing properties
      item.configId = `${item.id}-${item.color || ''}-${item.extraSeats || 0}`;
    }
  });
  
  if (migrationNeeded) {
    localStorage.setItem('basket', JSON.stringify(basket));
  }
}

// Function to render basket items on basket page
function renderBasketItems() {
  const basketContainer = document.querySelector('.basket-items');
  const basketSubtotalEl = document.querySelector('.basket-subtotal');
  const basketTotalEl = document.querySelector('.basket-total');
  const emptyBasketEl = document.querySelector('.empty-basket');
  const basketSummaryEl = document.querySelector('.basket-summary');
  const basketActionsEl = document.querySelector('.basket-actions');
  const deliveryCostEl = document.querySelector('.delivery-cost');
  
  if (!basketContainer) return;
  
  const basket = JSON.parse(localStorage.getItem('basket') || '[]');
  const deliveryOption = localStorage.getItem('deliveryOption') || 'standard';
  const deliveryCost = parseInt(localStorage.getItem('deliveryCost') || '30');
  
  // Update delivery cost display
  deliveryCostEl.textContent = `£${deliveryCost.toFixed(2)}`;
  
  // Check if basket is empty
  if (basket.length === 0) {
    basketContainer.innerHTML = '';
    basketSubtotalEl.textContent = '£0';
    basketTotalEl.textContent = '£0';
    emptyBasketEl.style.display = 'block';
    basketSummaryEl.style.display = 'none';
    basketActionsEl.style.display = 'none';
    return;
  }
  
  // Show basket summary and actions, hide empty message
  basketSummaryEl.style.display = 'block';
  basketActionsEl.style.display = 'flex';
  emptyBasketEl.style.display = 'none';
  
  // Clear container
  basketContainer.innerHTML = '';
  
  // Add each item to the basket container
  let subtotal = 0;
  
  basket.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    // Create additional info elements
    let additionalInfo = '';
    
    if (item.color) {
      additionalInfo += `<p class="basket-item-extra">Color: ${item.color}</p>`;
    }
    
    if (item.sideFacing) {
      additionalInfo += `<p class="basket-item-extra">Side: ${item.sideFacing}</p>`;
    }
    
    if (item.extraSeats > 0) {
      additionalInfo += `<p class="basket-item-extra">Extra Seats: ${item.extraSeats}</p>`;
    }
    
    const itemElement = document.createElement('div');
    itemElement.className = 'basket-item';
    itemElement.setAttribute('data-config-id', item.configId);
    itemElement.innerHTML = `
      <div class="basket-item-image">
        <img src="${item.image}" alt="${item.name}" onerror="this.src='/images/placeholder.jpg';">
      </div>
      <div class="basket-item-details">
        <h3 class="basket-item-title">${item.name}</h3>
        <p class="basket-item-price">£${item.price.toFixed(2)}</p>
        ${additionalInfo}
      </div>
      <div class="basket-item-quantity">
        <button class="quantity-btn decrease" data-config-id="${item.configId}">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn increase" data-config-id="${item.configId}">+</button>
      </div>
      <div class="basket-item-total">
        £${itemTotal.toFixed(2)}
      </div>
      <button class="remove-item-btn" data-config-id="${item.configId}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    basketContainer.appendChild(itemElement);
  });
  
  // Calculate total
  const total = subtotal + deliveryCost;
  
  // Update subtotal and total
  basketSubtotalEl.textContent = `£${subtotal.toFixed(2)}`;
  basketTotalEl.textContent = `£${total.toFixed(2)}`;
  
  // Add event listeners to quantity buttons and remove buttons
  const decreaseButtons = document.querySelectorAll('.quantity-btn.decrease');
  const increaseButtons = document.querySelectorAll('.quantity-btn.increase');
  const removeButtons = document.querySelectorAll('.remove-item-btn');
  
  decreaseButtons.forEach(button => {
    button.addEventListener('click', decreaseQuantity);
  });
  
  increaseButtons.forEach(button => {
    button.addEventListener('click', increaseQuantity);
  });
  
  removeButtons.forEach(button => {
    button.addEventListener('click', removeItem);
  });
}

// Function to increase item quantity
function increaseQuantity(event) {
  const configId = event.currentTarget.dataset.configId;
  const basket = JSON.parse(localStorage.getItem('basket'));
  const productIndex = basket.findIndex(item => item.configId === configId);
  
  if (productIndex > -1) {
    basket[productIndex].quantity += 1;
    localStorage.setItem('basket', JSON.stringify(basket));
    renderBasketItems();
    updateBasketCount();
  }
}

// Function to decrease item quantity
function decreaseQuantity(event) {
  const configId = event.currentTarget.dataset.configId;
  const basket = JSON.parse(localStorage.getItem('basket'));
  const productIndex = basket.findIndex(item => item.configId === configId);
  
  if (productIndex > -1) {
    if (basket[productIndex].quantity > 1) {
      basket[productIndex].quantity -= 1;
      localStorage.setItem('basket', JSON.stringify(basket));
    } else {
      // Remove item if quantity would be 0
      basket.splice(productIndex, 1);
      localStorage.setItem('basket', JSON.stringify(basket));
    }
    renderBasketItems();
    updateBasketCount();
  }
}

// Function to remove item from basket
function removeItem(event) {
  const configId = event.currentTarget.dataset.configId;
  const basket = JSON.parse(localStorage.getItem('basket'));
  const productIndex = basket.findIndex(item => item.configId === configId);
  
  if (productIndex > -1) {
    basket.splice(productIndex, 1);
    localStorage.setItem('basket', JSON.stringify(basket));
    renderBasketItems();
    updateBasketCount();
    showConfirmation('Item removed from basket');
  }
}

// Function to clear entire basket
function clearBasket() {
  localStorage.setItem('basket', JSON.stringify([]));
  renderBasketItems();
  updateBasketCount();
  showConfirmation('Basket cleared');
}

// Function to show confirmation message
function showConfirmation(message) {
  // Create confirmation element if it doesn't exist
  if (!document.querySelector('.confirmation-message')) {
    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation-message';
    document.body.appendChild(confirmation);
  }
  
  const confirmationEl = document.querySelector('.confirmation-message');
  confirmationEl.textContent = message;
  confirmationEl.classList.add('show');
  
  // Hide after 2 seconds
  setTimeout(() => {
    confirmationEl.classList.remove('show');
  }, 2000);
}

// Function to set up basket page specific functionality
function setupBasketPage() {
  const clearBasketBtn = document.querySelector('.clear-basket-btn');
  const checkoutBtn = document.querySelector('.checkout-btn');
  const deliveryModal = document.getElementById('deliveryModal');
  const closeModalBtn = document.querySelector('.close-modal');
  const continueBtn = document.querySelector('.continue-btn');
  const standardDeliveryRadio = document.getElementById('standardDelivery');
  const premiumDeliveryRadio = document.getElementById('premiumDelivery');
  const checkoutFormContainer = document.querySelector('.checkout-form-container');
  
  // Set initial delivery option based on localStorage
  const savedDeliveryOption = localStorage.getItem('deliveryOption');
  if (savedDeliveryOption === 'standard') {
    standardDeliveryRadio.checked = true;
  } else if (savedDeliveryOption === 'premium') {
    premiumDeliveryRadio.checked = true;
  }
  
  // Clear basket button
  if (clearBasketBtn) {
    clearBasketBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear your basket?')) {
        clearBasket();
      }
    });
  }
  
  // Checkout button - show delivery modal
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      // Check if basket has items
      const basket = JSON.parse(localStorage.getItem('basket') || '[]');
      if (basket.length === 0) {
        alert('Your basket is empty. Please add some items before proceeding to checkout.');
        return;
      }
      
      // Show modal
      deliveryModal.classList.add('show');
    });
  }
  
  // Close modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function() {
      deliveryModal.classList.remove('show');
    });
    
    // Also close when clicking outside the modal
    window.addEventListener('click', function(event) {
      if (event.target === deliveryModal) {
        deliveryModal.classList.remove('show');
      }
    });
  }
  
  // Continue button in modal
  if (continueBtn) {
    continueBtn.addEventListener('click', function() {
      // Save selected delivery option
      const deliveryOption = standardDeliveryRadio.checked ? 'standard' : 'premium';
      const deliveryCost = standardDeliveryRadio.checked ? 30 : 50;
      
      localStorage.setItem('deliveryOption', deliveryOption);
      localStorage.setItem('deliveryCost', deliveryCost.toString());
      
      // Close modal
      deliveryModal.classList.remove('show');
      
      // Update delivery cost and total
      renderBasketItems();
      
      // Show checkout form
      if (checkoutFormContainer) {
        // Initialize checkout form if it doesn't have content yet
        if (!checkoutFormContainer.querySelector('#checkoutForm')) {
          initializeCheckoutForm(checkoutFormContainer);
        }
        
        checkoutFormContainer.style.display = 'block';
        // Scroll to checkout form
        checkoutFormContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  // Delivery option radio buttons
  if (standardDeliveryRadio && premiumDeliveryRadio) {
    const deliveryOptions = document.querySelectorAll('.delivery-option');
    deliveryOptions.forEach(option => {
      option.addEventListener('click', function() {
        const radio = this.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
        }
      });
    });
  }
}

// Initialize the checkout form in the basket page
function initializeCheckoutForm(container) {
  // Calculate current basket totals
  const basket = JSON.parse(localStorage.getItem('basket') || '[]');
  const deliveryOption = localStorage.getItem('deliveryOption') || 'standard';
  const deliveryCost = parseInt(localStorage.getItem('deliveryCost') || '30');
  let subtotal = 0;
  
  basket.forEach(item => {
    subtotal += item.price * item.quantity;
  });
  
  const total = subtotal + deliveryCost;
  
  // Create the checkout form HTML
  container.innerHTML = `
    <h2>Complete Your Order</h2>
    <div class="order-form" id="checkoutForm">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" placeholder="Enter your full name" required>
      </div>
      <div class="form-group">
        <label for="contact">Contact No</label>
        <input type="tel" id="contact" placeholder="Enter your phone number" required>
      </div>
      <div class="form-group">
        <label for="postcode">Post Code</label>
        <input type="text" id="postcode" placeholder="Enter your post code" required>
      </div>
      <div class="form-group">
        <label for="address">Address</label>
        <textarea id="address" rows="3" placeholder="Enter your full address" required></textarea>
      </div>
      <div class="form-group">
        <label for="deliveryDate">Preferred Delivery Date (optional)</label>
        <input type="date" id="deliveryDate">
      </div>
      
      <div class="order-summary" id="orderSummary">
        <h3>Order Summary</h3>
        <div id="orderProductsList">
          ${basket.map(item => `
            <p>
              <strong>${item.name}</strong> ${item.color ? `(${item.color})` : ''} x ${item.quantity}
              ${item.extraSeats > 0 ? ` + ${item.extraSeats} extra seats` : ''}
            </p>
          `).join('')}
        </div>
        <p><strong>Delivery:</strong> <span id="summaryDelivery">${deliveryOption === 'standard' ? 'Standard (£30)' : 'Premium (£50)'}</span></p>
        <p><strong>Total:</strong> <span id="summaryTotal">£${total.toFixed(2)}</span></p>
      </div>
      
      <button id="placeOrderBtn" class="buy-now-btn">
        <i class="fas fa-check"></i> Place Order
      </button>
    </div>
    
    <!-- Thank You Section -->
    <div class="thank-you" id="thankYou" style="display: none;">
      <h2><i class="fas fa-check-circle"></i> Thank You For Your Order!</h2>
      <p>Your order has been placed successfully.</p>
      <p>We will contact you shortly to confirm your order details.</p>
      
      <div class="whatsapp-contact">
        <p>If you want any customized sofa or want to book via WhatsApp, contact us.</p>
        <a href="https://wa.me/447351898651" class="whatsapp-btn" target="_blank">
          <i class="fab fa-whatsapp"></i> Contact on WhatsApp
        </a>
      </div>
    </div>
  `;
  
  // Add event listener for place order button
  const placeOrderBtn = container.querySelector('#placeOrderBtn');
  const thankYou = container.querySelector('#thankYou');
  const checkoutForm = container.querySelector('#checkoutForm');
  
  placeOrderBtn.addEventListener('click', function() {
    const name = document.getElementById('name').value;
    const contact = document.getElementById('contact').value;
    const postcode = document.getElementById('postcode').value;
    const address = document.getElementById('address').value;
    
    // Validate form
    if (!name || !contact || !postcode || !address) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create order object
    const basket = JSON.parse(localStorage.getItem('basket') || '[]');
    const deliveryOption = localStorage.getItem('deliveryOption') || 'standard';
    const deliveryCost = parseInt(localStorage.getItem('deliveryCost') || '30');
    
    let subtotal = 0;
    basket.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    const finalTotal = subtotal + deliveryCost;
    
    const order = {
      id: 'order-' + Date.now(),
      name: name,
      contact: contact,
      postcode: postcode,
      address: address,
      deliveryDate: document.getElementById('deliveryDate').value,
      products: basket.map(item => ({
        ...item,
        name: item.name || item.title,  // Make sure name is set for all products
        product: item.name || item.title // Set product field for compatibility
      })),
      deliveryOption: deliveryOption,
      deliveryCost: deliveryCost,
      subtotal: subtotal,
      total: finalTotal,
      timestamp: new Date().toISOString()
    };
    
    // Use the saveOrder utility if available, otherwise fall back to direct localStorage
    if (typeof window.saveOrder === 'function') {
      console.log('Using saveOrder utility for basket checkout');
      window.saveOrder(order);
    } else {
      // Fallback if order-utils.js is not loaded
      console.log('Falling back to direct localStorage for basket checkout');
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.push(order);
      localStorage.setItem('orders', JSON.stringify(orders));
    }
    
    // Clear the basket
    clearBasket();
    
    // Show thank you message
    checkoutForm.style.display = 'none';
    thankYou.style.display = 'block';
    
    // Show confirmation toast
    showConfirmation('Order placed successfully!');
  });
}

// Expose functions that might be needed elsewhere
window.updateBasketCount = updateBasketCount;
window.showConfirmation = showConfirmation; 