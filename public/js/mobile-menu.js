document.addEventListener('DOMContentLoaded', function() {
  // Detect iOS Safari
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  
  // Apply iOS-specific fixes
  if (isIOS || isSafari) {
    document.documentElement.classList.add('ios-device');
    document.body.classList.add('ios-device');
    
    // Fix search input for iOS Safari
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    
    if (searchButton && searchInput) {
      // Replace existing button to clear event listeners
      const newButton = searchButton.cloneNode(true);
      searchButton.parentNode.replaceChild(newButton, searchButton);
      
      // Add iOS-specific event handler
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!searchInput.classList.contains('active')) {
          // Show search input
          searchInput.classList.add('active');
          document.body.classList.add('search-active');
          
          // Force inline styles for iOS
          searchInput.style.display = 'block';
          searchInput.style.opacity = '1';
          searchInput.style.visibility = 'visible';
          searchInput.style.width = 'calc(100% - 20px)';
          searchInput.style.maxWidth = '300px';
          searchInput.style.position = 'fixed';
          searchInput.style.top = '106px';
          searchInput.style.right = '10px';
          searchInput.style.zIndex = '9999999';
          searchInput.style.padding = '8px 15px';
          searchInput.style.border = '1px solid #ddd';
          searchInput.style.borderRadius = '20px';
          searchInput.style.backgroundColor = 'white';
          searchInput.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
          searchInput.style.height = '36px';
          searchInput.style.fontSize = '14px';
          
          // Focus with longer delay for iOS
          setTimeout(function() {
            searchInput.focus();
          }, 500);
        } else {
          // Hide search input
          searchInput.classList.remove('active');
          document.body.classList.remove('search-active');
          searchInput.style.opacity = '0';
          searchInput.style.visibility = 'hidden';
        }
      }, { capture: true });
    }
  }
  
  // Run on all devices, but apply mobile-specific behaviors only on mobile
  setupSearchButton();
  initCategoryScroll();
  
  // Apply mobile-specific behaviors
  applyMobileSpecificBehaviors();
  
  // Start category auto-scroll immediately
  startCategoryAutoScroll();
  
  // Listen for window resize to handle responsive behavior
  window.addEventListener('resize', function() {
    applyMobileSpecificBehaviors();
  });
  
  // Directly attach click handler to mobile menu toggle
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      // Only toggle the menu if we're in mobile view
      if (window.innerWidth <= 768) {
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
          mobileNav.classList.toggle('active');
          const icon = this.querySelector('i');
          if (icon) {
            if (mobileNav.classList.contains('active')) {
              icon.className = 'fas fa-times';
            } else {
              icon.className = 'fas fa-bars';
            }
          }
          console.log('Mobile menu toggled:', mobileNav.classList.contains('active'));
        } else {
          console.error('Mobile navigation menu not found!');
        }
      }
    });
  }
  
  // Add click event listeners to all mobile menu navigation links
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) {
    const navLinks = mobileNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        // Close the mobile menu when a link is clicked
        mobileNav.classList.remove('active');
        
        // Change the hamburger icon back
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        if (menuToggle) {
          const icon = menuToggle.querySelector('i');
          if (icon) {
            icon.className = 'fas fa-bars';
          }
        }
      });
    });
  }
  
  // Add a Safari iOS-specific fix for search functionality
  applyIOSSafariSearchFix();
});

// Apply behaviors specific to mobile devices
function applyMobileSpecificBehaviors() {
  const isMobile = window.innerWidth <= 768;
  const mobileNav = document.querySelector('.mobile-nav');
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const searchInput = document.querySelector('.search-input');
  
  // Show/hide mobile elements based on screen width
  if (isMobile) {
    // Show mobile menu toggle
    if (menuToggle) menuToggle.style.display = 'flex';
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
      if (mobileNav && menuToggle && !menuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('active');
        const icon = menuToggle.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-bars';
        }
      }
    });
    
    // Add click event listeners to all mobile menu navigation links
    if (mobileNav) {
      const navLinks = mobileNav.querySelectorAll('a');
      navLinks.forEach(link => {
        // Remove any existing click listeners first to avoid duplicates
        link.removeEventListener('click', closeMobileMenu);
        // Add the click listener
        link.addEventListener('click', closeMobileMenu);
      });
    }
    
    // Start category auto-scroll
    startCategoryAutoScroll();
  } else {
    // Hide mobile elements on larger screens
    if (menuToggle) menuToggle.style.display = 'none';
    if (mobileNav) {
      mobileNav.classList.remove('active');
      mobileNav.style.display = 'none'; // Force hide on desktop
    }
    
    // Reset search input to default state on larger screens
    if (searchInput && searchInput.classList.contains('active')) {
      searchInput.classList.remove('active');
    }
    
    // Stop category auto-scroll on desktop
    stopCategoryAutoScroll();
  }
}

// Function to close the mobile menu when a link is clicked
function closeMobileMenu() {
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) {
    mobileNav.classList.remove('active');
    
    // Change the hamburger icon back
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-bars';
      }
    }
  }
}

// Setup search button functionality
function setupSearchButton() {
  const searchButton = document.querySelector('.search-button');
  const searchInput = document.querySelector('.search-input');
  
  if (searchButton && searchInput) {
    // Detect iOS devices
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
    
    // Remove existing event listeners to prevent duplicates
    searchButton.removeEventListener('click', handleSearchButtonClick);
    
    // Add multiple event listeners to ensure the click is captured on all devices
    ['click', 'touchstart', 'touchend'].forEach(function(eventType) {
      searchButton.addEventListener(eventType, handleSearchButtonClick, { passive: false, capture: true });
    });
    
    // Special handling for iOS Safari
    if (isIOS || isSafari) {
      // Add iOS detection class to body
      document.body.classList.add('ios-device');
      
      // Add extra event listener with higher priority for iOS
      searchButton.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleSearchButtonClick(e);
        return false;
      }, { passive: false, capture: true });
    }
    
    // Handle search form submission
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', function(event) {
        if (searchInput.value.trim() === '') {
          // If search input is empty and not active, toggle the input visibility
          if (!searchInput.classList.contains('active')) {
            event.preventDefault();
            searchInput.classList.add('active');
            
            // Force inline styles for maximum compatibility
            searchInput.style.display = 'block';
            searchInput.style.opacity = '1';
            searchInput.style.visibility = 'visible';
            searchInput.style.width = 'calc(100% - 20px)';
            searchInput.style.maxWidth = '300px';
            searchInput.style.position = 'fixed';
            searchInput.style.top = '106px';
            searchInput.style.right = '10px';
            searchInput.style.zIndex = '1000000';
            
            // Focus with delay
            setTimeout(function() {
              searchInput.focus();
            }, 300);
          } else if (searchInput.value.trim() === '') {
            // If search input is active but empty, prevent form submission
            event.preventDefault();
          }
        }
      });
    }
    
    // Close search when clicking outside
    document.addEventListener('click', function(event) {
      if (searchInput.classList.contains('active') && 
          !searchButton.contains(event.target) && 
          !searchInput.contains(event.target)) {
        searchInput.classList.remove('active');
        document.body.classList.remove('search-active');
        
        // Reset inline styles
        searchInput.style.opacity = '0';
        searchInput.style.visibility = 'hidden';
      }
    });
  }
}

// Handle search button click
function handleSearchButtonClick(e) {
  e.preventDefault();
  e.stopPropagation(); // Prevent event bubbling
  const searchInput = document.querySelector('.search-input');
  const searchDropdown = document.querySelector('.search-dropdown');
  
  if (searchInput) {
    // Check if search is already active
    if (!searchInput.classList.contains('active')) {
      // Opening the search
      searchInput.classList.add('active');
      document.body.classList.add('search-active');
      
      // Force inline styles for maximum compatibility
      searchInput.style.display = 'block';
      searchInput.style.opacity = '1';
      searchInput.style.visibility = 'visible';
      searchInput.style.width = 'calc(100% - 20px)';
      searchInput.style.maxWidth = '300px';
      searchInput.style.position = 'fixed';
      searchInput.style.top = '106px';
      searchInput.style.right = '10px';
      searchInput.style.zIndex = '1000000';
      searchInput.style.padding = '8px 15px';
      searchInput.style.border = '1px solid #ddd';
      searchInput.style.borderRadius = '20px';
      searchInput.style.backgroundColor = 'white';
      searchInput.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
      
      // Use longer timeout for iOS to properly register the focus
      setTimeout(() => {
        try {
          searchInput.focus();
          console.log('Search input focused');
        } catch (err) {
          console.error('Error focusing search input:', err);
        }
      }, 300);
      
      // Hide any existing search dropdown
      if (searchDropdown && searchDropdown.classList.contains('show')) {
        searchDropdown.classList.remove('show');
      }
      
      // For mobile devices, ensure the search input is visible in the viewport
      if (window.innerWidth <= 768) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
          // Position the search input correctly
          setTimeout(() => {
            const inputRect = searchInput.getBoundingClientRect();
            // Make sure it's visible in the viewport
            if (inputRect.top < 0 || inputRect.bottom > window.innerHeight) {
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }
          }, 150);
        }
      }
      
      // Prevent any touch or click events from closing the search immediately
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    } else {
      // Closing the search
      searchInput.classList.remove('active');
      document.body.classList.remove('search-active');
      
      // Reset inline styles
      searchInput.style.opacity = '0';
      searchInput.style.visibility = 'hidden';
      
      // Hide search dropdown
      if (searchDropdown) {
        searchDropdown.classList.remove('show');
      }
      
      return false; // Prevent default and stop propagation
    }
  }
}

// Global variables for category auto-scroll
let categoryAutoScrollInterval = null;
let categoryScrollPaused = false;
let lastInteractionTime = 0;
const INTERACTION_TIMEOUT = 3000; // Resume auto-scroll after 3 seconds of no interaction

// Add a global fix for search input visibility
document.addEventListener('touchstart', function(e) {
  const searchInput = document.querySelector('.search-input');
  if (searchInput && searchInput.classList.contains('active')) {
    // Prevent any touch events from accidentally closing the search
    if (!e.target.closest('.search-button') && !e.target.closest('.search-input')) {
      e.stopPropagation();
    }
    
    // Re-apply active styles to ensure search stays visible
    setTimeout(function() {
      if (searchInput.classList.contains('active')) {
        searchInput.style.display = 'block';
        searchInput.style.opacity = '1';
        searchInput.style.visibility = 'visible';
      }
    }, 100);
  }
}, { passive: false, capture: true });

// Initialize horizontal scrolling for category bar
function initCategoryScroll() {
  const categoryBar = document.querySelector('.category-bar');
  
  if (categoryBar) {
    // Add touch scrolling behavior
    let isDown = false;
    let startX;
    let scrollLeft;
    
    categoryBar.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - categoryBar.offsetLeft;
      scrollLeft = categoryBar.scrollLeft;
      pauseCategoryAutoScroll();
    });
    
    categoryBar.addEventListener('touchstart', (e) => {
      isDown = true;
      startX = e.touches[0].pageX - categoryBar.offsetLeft;
      scrollLeft = categoryBar.scrollLeft;
      pauseCategoryAutoScroll();
    });
    
    categoryBar.addEventListener('mouseleave', () => {
      isDown = false;
      resumeCategoryAutoScrollAfterDelay();
    });
    
    categoryBar.addEventListener('mouseup', () => {
      isDown = false;
      resumeCategoryAutoScrollAfterDelay();
    });
    
    categoryBar.addEventListener('touchend', () => {
      isDown = false;
      resumeCategoryAutoScrollAfterDelay();
    });
    
    categoryBar.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - categoryBar.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      categoryBar.scrollLeft = scrollLeft - walk;
      lastInteractionTime = Date.now();
    });
    
    categoryBar.addEventListener('touchmove', (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - categoryBar.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      categoryBar.scrollLeft = scrollLeft - walk;
      lastInteractionTime = Date.now();
    });
    
    // Add scroll snap behavior
    const categories = categoryBar.querySelectorAll('.category');
    categories.forEach(category => {
      category.addEventListener('click', function(e) {
        // Prevent default if we're in the middle of a scroll
        if (isDown) {
          e.preventDefault();
        }
        pauseCategoryAutoScroll();
        resumeCategoryAutoScrollAfterDelay();
      });
    });
    
    // Start auto-scrolling immediately regardless of screen size
    // This ensures it works on mobile
    startCategoryAutoScroll();
  }
}

// Start auto-scrolling the category bar
function startCategoryAutoScroll() {
  const categoryBar = document.querySelector('.category-bar');
  if (!categoryBar) return;
  
  // Clear any existing interval to prevent duplicates
  stopCategoryAutoScroll();
  
  // Get all category items
  const categories = categoryBar.querySelectorAll('.category');
  if (!categories.length) return;
  
  // Calculate category width (including margin)
  const categoryWidth = categories[0].offsetWidth + 15; // 15px is the margin-right
  
  // Current category index
  let currentIndex = 0;
  
  // Set a new interval
  categoryAutoScrollInterval = setInterval(() => {
    if (categoryScrollPaused) return;
    
    // Check if enough time has passed since last user interaction
    if (Date.now() - lastInteractionTime < INTERACTION_TIMEOUT) return;
    
    // Get scroll width and current position
    const scrollWidth = categoryBar.scrollWidth;
    const clientWidth = categoryBar.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    // Calculate the next position
    currentIndex = (currentIndex + 1) % categories.length;
    
    // If we're near the end, go back to start
    if ((currentIndex + 1) * categoryWidth > maxScroll) {
      currentIndex = 0;
      smoothScrollTo(categoryBar, 0, 800);
    } else {
      // Scroll to the next category
      const nextScrollPosition = currentIndex * categoryWidth;
      smoothScrollTo(categoryBar, nextScrollPosition, 500);
    }
    
  }, 5000); // Scroll every 5 seconds
  
  console.log("Category auto-scroll started with " + categories.length + " categories");
}

// Stop auto-scrolling
function stopCategoryAutoScroll() {
  if (categoryAutoScrollInterval) {
    clearInterval(categoryAutoScrollInterval);
    categoryAutoScrollInterval = null;
  }
}

// Pause auto-scrolling (on user interaction)
function pauseCategoryAutoScroll() {
  categoryScrollPaused = true;
  lastInteractionTime = Date.now();
}

// Resume auto-scrolling after delay
function resumeCategoryAutoScrollAfterDelay() {
  lastInteractionTime = Date.now();
  setTimeout(() => {
    categoryScrollPaused = false;
  }, INTERACTION_TIMEOUT);
}

// Smooth scroll helper function
function smoothScrollTo(element, to, duration) {
  const start = element.scrollLeft;
  const change = to - start;
  const startTime = performance.now();
  
  function animateScroll(currentTime) {
    const elapsedTime = currentTime - startTime;
    if (elapsedTime >= duration) {
      element.scrollLeft = to;
      return;
    }
    
    const progress = elapsedTime / duration;
    const easeInOutCubic = progress < 0.5 
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    element.scrollLeft = start + change * easeInOutCubic;
    requestAnimationFrame(animateScroll);
  }
  
  requestAnimationFrame(animateScroll);
}

// Add a Safari iOS-specific fix for search functionality
function applyIOSSafariSearchFix() {
  // Only target Safari on iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    console.log('Applying iOS Safari search fix');
    
    const searchIcon = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    
    if (searchIcon && searchInput) {
      // Remove existing event listeners for Safari
      const newSearchIcon = searchIcon.cloneNode(true);
      searchIcon.parentNode.replaceChild(newSearchIcon, searchIcon);
      
      // Add Safari-specific event handler
      newSearchIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle search visibility
        if (searchInput.style.display === 'none' || 
            searchInput.style.display === '' || 
            !searchInput.classList.contains('active')) {
          
          // Show and position the search input
          searchInput.classList.add('active');
          searchInput.style.display = 'block';
          searchInput.style.visibility = 'visible';
          searchInput.style.opacity = '1';
          searchInput.style.width = 'calc(100% - 20px)';
          
          // Force layout reflow
          document.body.offsetHeight;
          
          // Delay focus for iOS Safari
          setTimeout(function() {
            searchInput.focus();
            
            // Double check visibility after focus
            searchInput.style.display = 'block';
            searchInput.style.visibility = 'visible';
          }, 300);
        } else {
          // Hide the search input
          searchInput.classList.remove('active');
          searchInput.style.display = 'none';
          searchInput.style.visibility = 'hidden';
          searchInput.style.opacity = '0';
        }
      }, false);
    }
  }
} 
