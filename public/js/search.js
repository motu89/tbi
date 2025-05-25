document.addEventListener('DOMContentLoaded', function() {
  // Sample product data - in a real implementation, this would come from a database
  const products = [
    { 
      id: 1, 
      name: 'Crush Velvet L-Shape Dylan Sofa', 
      price: '£449', 
      image: '/images/Dylan Sofa/cv/greycv1.jpg',
      url: '/products/dylan-sofa1.html'
    },
    { 
      id: 2, 
      name: 'Plush Velvet L-Shape Dylan Sofa', 
      price: '£449', 
      image: '/images/Dylan Sofa/p/pcream4.jpg',
      url: '/products/dylan-sofa2.html'
    },
    { 
      id: 3, 
      name: 'Jumbo Cord L-Shape Dylan Sofa', 
      price: '£449', 
      image: '/images/Dylan Sofa/j/jmink2.jpg',
      url: '/products/dylan-sofa3.html'
    },
    { 
      id: 4, 
      name: 'Leather L-Shape Dylan Sofa', 
      price: '£449', 
      image: '/images/Dylan Sofa/L/bb2.jpg',
      url: '/products/dylan-sofa4.html'
    },
    { 
      id: 5, 
      name: 'Verona Corner Sofa', 
      price: '£649', 
      image: '/images/Verona Sofa/vc/vcmink2.jpg',
      url: '/products/verona-corner-sofa.html'
    },
    { 
      id: 6, 
      name: '3+2 Verona Sofa', 
      price: '£449', 
      image: '/images/Verona Sofa/v3+2/vblack2.jpg',
      url: '/products/verona-3-2-sofa.html'
    },
    { 
      id: 7, 
      name: 'Bishop U-Shape Sofa', 
      price: '£699', 
      image: '/images/U-shape Sofa/bishop/bblack1.jpg',
      url: '/products/bishop-u-shape-sofa.html'
    },
    { 
      id: 8, 
      name: 'Mini U-Shape Sofa', 
      price: '£550', 
      image: '/images/U-Shape Sofa/mini/mcream1.jpg',
      url: '/products/mini-u-shape-sofa.html'
    },
    { 
      id: 9, 
      name: 'Salone Corner Sofa', 
      price: '£950', 
      image: '/images/Salone Sofa/c/scream2.jpg',
      url: '/products/salone-corner-sofa.html'
    },
    { 
      id: 10, 
      name: 'Salone 3+2 Sofa', 
      price: '£450', 
      image: '/images/Salone Sofa/3+2/black.jpg',
      url: '/products/salone-3-2-sofa.html'
    },
    { 
      id: 11, 
      name: 'Leather Roma Recliner Corner Sofa', 
      price: '£699', 
      image: '/images/Leather Sofa/c/bg2.jpg',
      url: '/products/leather-corner-sofa.html'
    },
    { 
      id: 12, 
      name: 'Leather Roma Recliner 3+2 Sofa', 
      price: '£550', 
      image: '/images/Leather Sofa/3+2/lb1.jpg',
      url: '/products/leather-3-2-sofa.html'
    },
    { 
      id: 13, 
      name: 'Dylan Arm Chair', 
      price: '£229', 
      image: '/images/Arm Chair/d/kgrey.jpg',
      url: '/products/dylan-arm-chair.html'
    },
    { 
      id: 14, 
      name: 'Salone Arm Chair', 
      price: '£349', 
      image: '/images/Arm Chair/s/smink.jpg',
      url: '/products/salone-arm-chair.html'
    },
    { 
      id: 15, 
      name: 'Verona Arm Chair', 
      price: '£299', 
      image: '/images/Arm Chair/v/vmink.jpg',
      url: '/products/verona-arm-chair.html'
    },
    { 
      id: 16, 
      name: 'Leather Recliner Arm Chair', 
      price: '£349', 
      image: '/images/Arm Chair/l/lbb.jpg',
      url: '/products/leather-recliner-arm-chair.html'
    },
    { 
      id: 17, 
      name: 'Modern Sofabeds With Storage', 
      price: '£449', 
      image: '/images/Sofabed/sb/sbgrey.jpg',
      url: '/products/modern-sofabeds.html'
    }
  ];

  // Get DOM elements
  const searchInput = document.querySelector('.search-input');
  const searchButton = document.querySelector('.search-button');
  const searchForm = document.querySelector('.search-form');
  
  // Safari detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 768;
  
  console.log('Safari browser detected:', isSafari);
  console.log('iOS device detected:', isIOS);
  console.log('Mobile view:', isMobile);
  
  // Add Safari-specific class if needed
  if (isSafari) {
    document.body.classList.add('safari-browser');
    if (searchInput) {
      searchInput.classList.add('safari-input');
    }
  }
  
  // Create search dropdown if it doesn't exist
  let searchDropdown = document.querySelector('.search-dropdown');
  if (!searchDropdown) {
    searchDropdown = document.createElement('div');
    searchDropdown.className = 'search-dropdown';
    
    // Add dropdown to the appropriate container based on device
    if (isMobile) {
      // For mobile, add to the search container
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer) {
        searchContainer.appendChild(searchDropdown);
      }
    } else {
      // For desktop, add to the dedicated container outside header
      const desktopContainer = document.getElementById('desktop-search-dropdown-container');
      if (desktopContainer) {
        desktopContainer.appendChild(searchDropdown);
      } else {
        // Fallback if dedicated container doesn't exist
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
          searchContainer.appendChild(searchDropdown);
        }
      }
    }
  }

  // Function to show search results
  function showSearchResults(query) {
    // Clear previous results
    searchDropdown.innerHTML = '';
    
    if (!query || !query.trim()) {
      searchDropdown.classList.remove('show');
      return;
    }
    
    // Filter products based on query
    const filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // Create dropdown content
    const header = document.createElement('div');
    header.className = 'search-dropdown-header';
    header.textContent = 'Search Results';
    searchDropdown.appendChild(header);
    
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-dropdown-results';
    
    if (filteredProducts.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No products found';
      resultsContainer.appendChild(noResults);
    } else {
      filteredProducts.slice(0, 5).forEach(product => {
        const resultItem = document.createElement('a');
        resultItem.className = 'search-result-item';
        resultItem.href = product.url;
        
        const imageDiv = document.createElement('div');
        imageDiv.className = 'search-result-image';
        const image = document.createElement('img');
        image.src = product.image;
        image.alt = product.name;
        imageDiv.appendChild(image);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'search-result-info';
        
        const title = document.createElement('div');
        title.className = 'search-result-title';
        title.textContent = product.name;
        
        const price = document.createElement('div');
        price.className = 'search-result-price';
        price.textContent = product.price;
        
        infoDiv.appendChild(title);
        infoDiv.appendChild(price);
        
        resultItem.appendChild(imageDiv);
        resultItem.appendChild(infoDiv);
        resultsContainer.appendChild(resultItem);
      });
    }
    
    searchDropdown.appendChild(resultsContainer);
    
    // Add footer with view all link if there are results
    if (filteredProducts.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'search-dropdown-footer';
      const viewAllLink = document.createElement('a');
      viewAllLink.href = '/#'; // Replace with actual search results page
      viewAllLink.textContent = 'View all results';
      footer.appendChild(viewAllLink);
      searchDropdown.appendChild(footer);
    }
    
    // Show dropdown
    searchDropdown.classList.add('show');
    
    // Position dropdown correctly based on device type
    positionDropdown();
  }
  
  // Function to position dropdown correctly based on device type
  function positionDropdown() {
    if (window.innerWidth <= 768) {
      positionMobileDropdown();
    } else {
      positionDesktopDropdown();
    }
  }
  
  // Function to position dropdown on mobile
  function positionMobileDropdown() {
    // For mobile devices
    const searchInput = document.querySelector('.search-input.active');
    if (searchInput) {
      const inputRect = searchInput.getBoundingClientRect();
      searchDropdown.style.position = 'fixed';
      searchDropdown.style.top = (inputRect.bottom + 5) + 'px';
      searchDropdown.style.right = '10px';
      searchDropdown.style.left = 'auto';
      searchDropdown.style.width = (searchInput.offsetWidth) + 'px';
      searchDropdown.style.maxWidth = '300px';
      searchDropdown.style.zIndex = '1000000';
      
      // Extra Safari/iOS fixes
      if (isSafari || isIOS) {
        searchDropdown.style.display = 'block';
        searchDropdown.style.opacity = '1';
        searchDropdown.style.visibility = 'visible';
        searchDropdown.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        searchDropdown.style.backgroundColor = 'white';
        
        // iOS specific position adjustment
        if (isIOS) {
          searchDropdown.style.top = '150px';
        }
      }
    }
  }
  
  // Function to position dropdown on desktop
  function positionDesktopDropdown() {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
      const containerRect = searchContainer.getBoundingClientRect();
      
      // Move the dropdown to the desktop container if not already there
      const desktopContainer = document.getElementById('desktop-search-dropdown-container');
      if (desktopContainer && !desktopContainer.contains(searchDropdown)) {
        desktopContainer.appendChild(searchDropdown);
      }
      
      // Position relative to search container
      searchDropdown.style.position = 'absolute';
      searchDropdown.style.top = (containerRect.bottom + 10) + 'px';
      searchDropdown.style.left = (containerRect.left + containerRect.width - 300) + 'px';
      searchDropdown.style.right = 'auto';
      searchDropdown.style.width = '300px';
      searchDropdown.style.zIndex = '1000000';
      
      // Apply container pointer-events
      if (desktopContainer) {
        desktopContainer.style.pointerEvents = 'auto';
      }
    }
  }

  // Handle search input - use input event with extra check for Safari
  if (searchInput) {
    // Use both input and keyup events for better cross-browser compatibility
    ['input', 'keyup'].forEach(eventType => {
      searchInput.addEventListener(eventType, function() {
        if (this.value && this.value.trim()) {
          showSearchResults(this.value);
        } else {
          searchDropdown.classList.remove('show');
          
          // Reset pointer-events for desktop container
          const desktopContainer = document.getElementById('desktop-search-dropdown-container');
          if (desktopContainer) {
            desktopContainer.style.pointerEvents = 'none';
          }
        }
      });
    });
    
    searchInput.addEventListener('focus', function() {
      if (this.value && this.value.trim()) {
        showSearchResults(this.value);
      }
    });
  }
  
  // Handle search form submission
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (searchInput && searchInput.value && searchInput.value.trim()) {
        showSearchResults(searchInput.value);
      }
    });
  }
  
  // Close dropdown when clicking outside - with Safari-specific handling
  document.addEventListener('click', function(e) {
    if (searchInput && searchButton && searchDropdown &&
        !searchInput.contains(e.target) && 
        !searchButton.contains(e.target) && 
        !searchDropdown.contains(e.target)) {
      searchDropdown.classList.remove('show');
      
      // Reset pointer-events for desktop container
      const desktopContainer = document.getElementById('desktop-search-dropdown-container');
      if (desktopContainer) {
        desktopContainer.style.pointerEvents = 'none';
      }
    }
  });
  
  // Update position on window resize
  window.addEventListener('resize', function() {
    if (searchDropdown.classList.contains('show')) {
      positionDropdown();
    }
  });
}); 
