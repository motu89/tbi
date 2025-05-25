document.addEventListener('DOMContentLoaded', function() {
  console.log('Product detail script loaded');
  
  // Get elements
  const mainImage = document.getElementById('mainImage');
  const mainVideo = document.getElementById('mainVideo');
  const thumbnails = document.querySelectorAll('.thumbnail');
  const colorOptions = document.querySelectorAll('.color-option');
  const selectedColorText = document.getElementById('selected-color-text');
  const totalPriceElement = document.getElementById('total-price');
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  const buyNowBtn = document.querySelector('.buy-now-btn');
  
  console.log('Elements found:', { 
    mainImage: mainImage, 
    thumbnails: thumbnails.length, 
    colorOptions: colorOptions.length
  });
  
  // Ensure order-utils.js is loaded for Buy Now functionality
  if (typeof window.ensureOrderUtilsLoaded !== 'function') {
    // Create script element to load order-utils.js
    const script = document.createElement('script');
    script.src = '/js/order-utils.js';
    document.head.appendChild(script);
    console.log('Loading order-utils.js for Buy Now functionality');
  }
  
  // Initialize display states
  mainImage.style.display = 'block';
  mainVideo.style.display = 'none';
  
  // Base price (from the current price element)
  const currentPriceElement = document.querySelector('.current-price');
  let basePrice = parseFloat(currentPriceElement.textContent.replace('£', ''));
  console.log('Base price:', basePrice);
  
  // Keep track of selected options
  let selectedColor = "Grey";
  
  // Direct event handling function for thumbnails
  function handleThumbnailClick(event) {
    const thumbnail = event.currentTarget;
    console.log('Thumbnail clicked:', thumbnail.getAttribute('data-image') || thumbnail.getAttribute('data-video'));
    
    // Remove active class from all thumbnails
    thumbnails.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked thumbnail
    thumbnail.classList.add('active');
    
    // Handle image or video display
    const type = thumbnail.getAttribute('data-type');
    
    if (type === 'image') {
      const imageSrc = thumbnail.getAttribute('data-image');
      mainImage.src = imageSrc;
      mainImage.style.display = 'block';
      mainVideo.style.display = 'none';
      // Reset video
      mainVideo.pause();
    } else if (type === 'video') {
      const videoSrc = thumbnail.getAttribute('data-video');
      // Update video source
      const videoSource = mainVideo.querySelector('source');
      videoSource.src = videoSrc;
      mainVideo.load(); // Reload the video with the new source
      // Show video and play it
      mainImage.style.display = 'none';
      mainVideo.style.display = 'block';
      // Force a layout calculation to ensure the video is visible before playing
      void mainVideo.offsetWidth;
      // Play the video
      try {
        const playPromise = mainVideo.play();
        if (playPromise !== undefined) {
          playPromise.then(_ => {
            // Automatic playback started
            console.log("Video playback started successfully");
          }).catch(error => {
            // Auto-play was prevented
            console.log("Video autoplay prevented:", error);
            // Show a play button or message to the user
            alert("Please click the video to play it manually.");
          });
        }
      } catch (e) {
        console.error("Error playing video:", e);
      }
    }
  }
  
  // Direct event handling function for color options
  function handleColorClick(event) {
    const colorOption = event.currentTarget;
    console.log('Color option clicked:', colorOption.getAttribute('data-color'));
    
    // Remove active class from all color options
    colorOptions.forEach(o => o.classList.remove('active'));
    
    // Add active class to clicked option
    colorOption.classList.add('active');
    
    // Update selected color text
    selectedColor = colorOption.getAttribute('data-color');
    selectedColorText.textContent = selectedColor;
    
    // Update main image to show selected color
    const imageSrc = colorOption.getAttribute('data-image');
    console.log('Changing image to:', imageSrc);
    
    // Only change the image if we're not viewing the video
    if (mainVideo.style.display !== 'block') {
      mainImage.src = imageSrc;
    }
  }
  
  // Attach event listeners
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', handleThumbnailClick);
  });
  
  colorOptions.forEach(option => {
    option.addEventListener('click', handleColorClick);
  });
  
  // Function to update total price display - now simply displays the base price
  function updateTotalPrice() {
    totalPriceElement.textContent = `£${basePrice}`;
    console.log('Total price updated:', basePrice);
  }
  
  // Handle Add to Basket button - NOTE: Using empty handlers since basket.js now handles this functionality
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function(event) {
      // We're removing this functionality as it's now handled by basket.js
      // Do nothing here, prevent default to avoid issues
      event.preventDefault();
      event.stopPropagation();
    });
  }
  
  // Handle Buy Now button
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', function(event) {
      console.log('Buy now clicked');
      
      // Ensure order-utils.js is loaded before proceeding
      if (typeof window.ensureOrderUtilsLoaded === 'function') {
        window.ensureOrderUtilsLoaded(() => {
          // Redirect to basket page after ensuring order-utils.js is loaded
          setTimeout(() => {
            window.location.href = '/products/basket.html';
          }, 100);
        });
      } else {
        // Fallback if ensureOrderUtilsLoaded is not available
        setTimeout(() => {
          window.location.href = '/products/basket.html';
        }, 100);
      }
    });
  }
  
  // Initialize basket count on page load
  if (typeof updateBasketCount === 'function') {
    updateBasketCount();
  } else {
    // Fallback function if basket.js hasn't loaded yet
    function updateBasketCount() {
      const basket = JSON.parse(localStorage.getItem('basket')) || [];
      const count = basket.reduce((total, item) => total + item.quantity, 0);
      
      const basketCountElement = document.querySelector('.basket-count');
      if (basketCountElement) {
        basketCountElement.textContent = count;
      }
    }
    updateBasketCount();
  }
  
  // Add log to confirm all event listeners are attached
  console.log('All event listeners attached successfully');
}); 
