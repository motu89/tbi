// Product Order Handler for The British Interiors
// This file handles the "Buy Now" order functionality for all product pages

/**
 * Handles order submission from product pages
 * @param {HTMLFormElement} formElement - The order form element
 * @param {Object} productDetails - Product details object
 * @returns {Promise<boolean>} - Success status of the order
 */
async function handleProductOrder(formElement, productDetails) {
  // Prevent default form submission
  event.preventDefault();
  
  // If the form is valid (browser validation will handle this)
  if (!formElement.checkValidity()) {
    return false;
  }
  
  try {
    // Get form values using FormData
    const formData = new FormData(formElement);
    const name = formData.get('name');
    const contact = formData.get('contact');
    const postcode = formData.get('postcode');
    const address = formData.get('address');
    const deliveryDate = formData.get('deliveryDate');
    
    // Get delivery details
    const deliveryOption = document.querySelector('input[name="delivery"]:checked').value;
    const deliveryCost = deliveryOption === 'standard' ? 30 : 50;
    
    // Calculate final price
    const finalTotal = productDetails.price + deliveryCost;
    
    // Create order object
    const order = {
      id: 'order-' + Date.now(),
      name: name,
      contact: contact,
      postcode: postcode,
      address: address,
      deliveryDate: deliveryDate || '',
      product: productDetails.name,
      productTitle: productDetails.title || productDetails.name,
      productDetails: {
        name: productDetails.name,
        title: productDetails.title || productDetails.name,
        color: productDetails.color,
        size: productDetails.size,
        price: productDetails.price,
        image: productDetails.image,
        quantity: 1,
        sideFacing: productDetails.sideFacing || "N/A",
        extraSeats: productDetails.extraSeats || 0
      },
      color: productDetails.color,
      size: productDetails.size,
      deliveryOption: deliveryOption,
      deliveryCost: deliveryCost,
      total: finalTotal,
      timestamp: new Date().toISOString()
    };
    
    // First ensure order-utils.js is loaded
    await new Promise((resolve, reject) => {
      if (typeof window.saveOrder === 'function') {
        resolve();
        return;
      }
      
      console.log('Loading order-utils.js...');
      const script = document.createElement('script');
      script.src = '/js/order-utils.js';
      script.onload = function() {
        console.log('order-utils.js loaded successfully');
        resolve();
      };
      script.onerror = function(err) {
        console.error('Failed to load order-utils.js:', err);
        reject(err);
      };
      document.head.appendChild(script);
    });
    
    // Save order using the utility function
    const result = await window.saveOrder(order);
    
    if (result) {
      console.log('Order saved successfully:', order.id);
      return true;
    } else {
      console.warn('Order saved to localStorage but server sync failed');
      return false;
    }
  } catch (error) {
    console.error('Error processing order:', error);
    return false;
  }
}

// Make the function available globally
window.handleProductOrder = handleProductOrder; 