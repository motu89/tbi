document.addEventListener('DOMContentLoaded', function() {
  // Hero slider functionality
  const slides = document.querySelectorAll('.slide');
  const prevArrow = document.querySelector('.prev-arrow');
  const nextArrow = document.querySelector('.next-arrow');
  let currentSlide = 0;
  const isMobile = window.innerWidth <= 768;

  // Initialize slider
  function initSlider() {
    if (slides.length === 0) return;
    
    // Hide all slides initially
    slides.forEach((slide, index) => {
      slide.classList.remove('active');
      
      if (isMobile) {
        slide.style.display = 'none';
      }
      
      // Preload images to ensure they're ready
      const img = slide.querySelector('img');
      if (img) {
        const preloadImg = new Image();
        preloadImg.src = img.src;
        
        // When image loads, set dimensions appropriately for the device
        preloadImg.onload = function() {
          if (isMobile) {
            img.style.width = '100%';
            img.style.height = 'auto';
            
            // If this is the first slide, adjust spacing after image loads
            if (index === 0) {
              adjustHeroSlider();
            }
          }
        };
      }
    });
    
    // Show first slide
    slides[0].classList.add('active');
    if (isMobile) {
      slides[0].style.display = 'block';
    }
    
    // Position arrows after first image is loaded
    const firstImg = slides[0].querySelector('img');
    if (firstImg) {
      firstImg.onload = function() {
        positionArrows();
        if (isMobile) {
          adjustHeroSlider();
        }
      };
    }
  }
  
  // Adjust hero slider to match image dimensions (mobile only)
  function adjustHeroSlider() {
    if (!isMobile) return;
    
    const heroSlider = document.querySelector('.hero-slider');
    const activeSlide = document.querySelector('.slide.active');
    
    if (!heroSlider || !activeSlide) return;
    
    const img = activeSlide.querySelector('img');
    if (!img) return;
    
    // Remove any extra space on mobile
    heroSlider.style.height = 'auto';
    heroSlider.style.marginBottom = '0';
    
    // Adjust product section spacing on mobile
    const productSections = document.querySelector('.product-sections');
    if (productSections) {
      productSections.style.marginTop = '10px'; // Add space between hero and products
      productSections.style.paddingTop = '0';
    }
    
    // Specifically adjust the Dylan Sofa section on mobile
    const dylanSofa = document.querySelector('#dylan-sofa');
    if (dylanSofa) {
      dylanSofa.style.paddingTop = '15px'; // Increase padding at top
      dylanSofa.style.marginTop = '0';
      dylanSofa.style.backgroundColor = '#f9f9f9';
    }
    
    // Center the image horizontally
    if (img) {
      img.style.margin = '0 auto';
      img.style.display = 'block';
    }
  }
  
  // Position arrows in the middle of the image height
  function positionArrows() {
    const activeSlide = document.querySelector('.slide.active');
    if (!activeSlide) return;
    
    const img = activeSlide.querySelector('img');
    if (!img) return;
    
    const imgHeight = img.offsetHeight;
    const arrowOffset = imgHeight / 2;
    
    if (prevArrow) prevArrow.style.top = `${arrowOffset}px`;
    if (nextArrow) nextArrow.style.top = `${arrowOffset}px`;
  }
  
  // Initialize slider on page load
  initSlider();

  function showSlide(index) {
    // Hide current slide
    slides.forEach(slide => {
      slide.classList.remove('active');
      if (isMobile) {
        slide.style.display = 'none';
      }
    });
    
    // Show new slide with smooth transition
    slides[index].classList.add('active');
    if (isMobile) {
      slides[index].style.display = 'block';
    }
    
    // Reposition arrows based on new image height
    setTimeout(positionArrows, 50);
    
    // Adjust spacing after slide change (mobile only)
    if (isMobile) {
      setTimeout(adjustHeroSlider, 50);
    }
  }

  if (prevArrow && nextArrow) {
    prevArrow.addEventListener('click', function() {
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      showSlide(currentSlide);
    });

    nextArrow.addEventListener('click', function() {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    });
  }

  // Auto-rotate slides every 5 seconds
  let autoSlideInterval = setInterval(function() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  }, 5000);
  
  // Pause auto-rotation when hovering over slider
  const heroSlider = document.querySelector('.hero-slider');
  if (heroSlider) {
    heroSlider.addEventListener('mouseenter', function() {
      clearInterval(autoSlideInterval);
    });
    
    heroSlider.addEventListener('mouseleave', function() {
      clearInterval(autoSlideInterval); // Clear any existing interval
      autoSlideInterval = setInterval(function() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
      }, 5000);
    });
  }
  
  // Handle window resize to maintain proper positioning
  window.addEventListener('resize', function() {
    const newIsMobile = window.innerWidth <= 768;
    
    // Only update if mobile status has changed
    if (newIsMobile !== isMobile) {
      location.reload(); // Reload the page to apply correct styles
    } else {
      positionArrows();
      if (isMobile) {
        adjustHeroSlider();
      }
    }
  });
  
  // Run adjustment again after page is fully loaded (mobile only)
  window.addEventListener('load', function() {
    if (isMobile) {
      adjustHeroSlider();
    }
    positionArrows();
  });

  // ----- PRICE FILTER DROPDOWN -----
  // Get elements
  const priceBtn = document.getElementById('price-filter-trigger');
  const priceContainer = document.querySelector('.price-filter-container');
  const priceDropdown = document.getElementById('price-dropdown');
  const lowToHighBtn = document.querySelector('[data-sort="low-to-high"]');
  const highToLowBtn = document.querySelector('[data-sort="high-to-low"]');
  
  // If elements exist
  if (priceBtn && priceDropdown) {
    // Position the dropdown below the price button
    function positionDropdown() {
      // Get button position
      const btnRect = priceBtn.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Set dropdown position - align with the button's left edge
      priceDropdown.style.top = (btnRect.bottom + scrollTop + 5) + 'px';
      priceDropdown.style.left = (btnRect.left) + 'px';
      
      // Ensure dropdown is visible in viewport (prevent clipping at right edge)
      const viewportWidth = window.innerWidth;
      const dropdownRect = priceDropdown.getBoundingClientRect();
      if (dropdownRect.right > viewportWidth) {
        // Adjust position to align with button's right edge instead
        priceDropdown.style.left = 'auto';
        priceDropdown.style.right = (viewportWidth - btnRect.right) + 'px';
        
        // We can't directly select pseudoelements in JS
        // Instead, set a class for right-aligned arrow
        priceDropdown.classList.add('right-aligned');
      } else {
        priceDropdown.classList.remove('right-aligned');
      }
    }
    
    // Position dropdown initially
    positionDropdown();
    
    // Update position on window resize and scroll
    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown);
    
    // Toggle dropdown when clicking the price button
    priceBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle dropdown visibility class
      priceDropdown.classList.toggle('show');
      
      if (priceDropdown.classList.contains('show')) {
        positionDropdown();
      }
      
      // Log status for debugging
      console.log("Price button clicked, dropdown visibility: " + priceDropdown.classList.contains('show'));
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function(e) {
      if (!priceBtn.contains(e.target) && !priceDropdown.contains(e.target)) {
        priceDropdown.classList.remove('show');
      }
    });
    
    // ----- PRICE SORTING FUNCTIONALITY -----
    // Function to properly parse price strings
    function parsePrice(priceText) {
      // Remove currency symbol, commas, and trim whitespace
      return parseFloat(priceText.replace(/[£$,\s]/g, '').trim());
    }
    
    // Function to sort products
    function sortProducts(direction) {
      console.log("Sorting products by price: " + direction);
      
      const productSections = document.querySelectorAll('.product-section');
      let firstProductSection = null;
      
      // Process each product section
      productSections.forEach((section, index) => {
        if (index === 0) {
          firstProductSection = section;
        }
        
        const productGrid = section.querySelector('.product-grid');
        if (productGrid) {
          // Get all product cards in this grid
          const productCards = Array.from(productGrid.querySelectorAll('.product-card'));
          
          if (productCards.length) {
            // Sort the product cards by price
            productCards.sort((a, b) => {
              // Find current price elements
              const priceA = parsePrice(a.querySelector('.current-price').textContent);
              const priceB = parsePrice(b.querySelector('.current-price').textContent);
              
              // Sort based on direction
              return direction === 'low-to-high' ? priceA - priceB : priceB - priceA;
            });
            
            // Clear the product grid
            while (productGrid.firstChild) {
              productGrid.removeChild(productGrid.firstChild);
            }
            
            // Add the sorted product cards back to the grid
            productCards.forEach(card => {
              productGrid.appendChild(card);
            });
            
            // Add subtle animation for visual feedback
            productGrid.classList.add('sorting-active');
            setTimeout(() => {
              productGrid.classList.remove('sorting-active');
            }, 500);
          }
        }
      });
      
      // Update button text to reflect active sort
      const priceSpan = priceBtn.querySelector('span');
      if (priceSpan) {
        const directionText = direction === 'low-to-high' ? 'Low to High' : 'High to Low';
        priceSpan.innerHTML = `Price <small>(${directionText})</small>`;
      }
      
      // Add highlight class to show sorting is active
      priceContainer.classList.add('active-sort');
      
      // Hide dropdown
      priceDropdown.classList.remove('show');
      
      // Show sort direction indicator
      displaySortIndicator(direction);
      
      // Scroll to first product section
      if (firstProductSection) {
        window.scrollTo({
          top: firstProductSection.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    }
    
    // Display temporary sort indicator
    function displaySortIndicator(direction) {
      let sortIndicator = document.getElementById('sort-indicator');
      if (!sortIndicator) {
        sortIndicator = document.createElement('div');
        sortIndicator.id = 'sort-indicator';
        document.body.appendChild(sortIndicator);
      }
      
      const directionText = direction === 'low-to-high' ? 'Low to High' : 'High to Low';
      sortIndicator.textContent = `Sorted by Price: ${directionText}`;
      sortIndicator.className = 'show';
      
      // Hide after 2 seconds
      setTimeout(() => {
        sortIndicator.className = '';
      }, 2000);
    }
    
    // Add event listeners to sort buttons
    if (lowToHighBtn) {
      lowToHighBtn.addEventListener('click', function(e) {
        e.preventDefault();
        sortProducts('low-to-high');
      });
    }
    
    if (highToLowBtn) {
      highToLowBtn.addEventListener('click', function(e) {
        e.preventDefault();
        sortProducts('high-to-low');
      });
    }
  }
});