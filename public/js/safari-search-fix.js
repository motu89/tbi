/**
 * Safari iOS Search Fix - Direct approach
 * 
 * This is a standalone fix for search functionality on Safari iOS.
 * It only applies to Safari on iOS and doesn't affect other browsers.
 */

(function() {
  // Only run on Safari iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    console.log("Safari iOS detected - applying search fix from safari-search-fix.js");
    
    // Mark document immediately
    document.documentElement.classList.add('ios-device');
    if (document.body) document.body.classList.add('ios-device');
    
    // Create and inject immediate styles
    const style = document.createElement('style');
    style.textContent = `
      /* Ultra visible search input for iOS Safari */
      .search-input.active,
      #search-input.active,
      input[type="text"].search-input.active {
        position: fixed !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        top: 106px !important;
        right: 10px !important;
        left: auto !important;
        width: calc(100% - 20px) !important;
        max-width: 300px !important;
        height: 40px !important;
        padding: 8px 15px !important;
        border: 3px solid #3498db !important;
        border-radius: 20px !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        font-size: 16px !important;
        font-weight: normal !important;
        line-height: 1.2 !important;
        text-align: left !important;
        z-index: 9999999 !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
        -webkit-appearance: none !important;
        -webkit-transform: none !important;
        transform: none !important;
        transition: none !important;
        pointer-events: auto !important;
      }
      
      /* Make placeholder text visible */
      .search-input.active::placeholder {
        color: #666666 !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    
    // Function to create a visible search input
    function createVisibleSearchInput() {
      // Get search elements
      const searchButton = document.querySelector('.search-button');
      const searchInput = document.querySelector('.search-input');
      
      if (searchButton && searchInput && !document.getElementById('ios-visible-search')) {
        // Create a new visible search input overlay
        const visibleInput = document.createElement('input');
        visibleInput.type = 'text';
        visibleInput.placeholder = 'Search...';
        visibleInput.id = 'ios-visible-search';
        visibleInput.style.position = 'fixed';
        visibleInput.style.display = 'none'; // Initially hidden
        visibleInput.style.opacity = '0'; // Initially hidden
        visibleInput.style.top = '106px';
        visibleInput.style.right = '10px';
        visibleInput.style.width = 'calc(100% - 20px)';
        visibleInput.style.maxWidth = '300px';
        visibleInput.style.height = '40px';
        visibleInput.style.padding = '8px 15px';
        visibleInput.style.border = '3px solid #3498db';
        visibleInput.style.borderRadius = '20px';
        visibleInput.style.backgroundColor = '#ffffff';
        visibleInput.style.color = '#000000';
        visibleInput.style.fontSize = '16px';
        visibleInput.style.zIndex = '9999999';
        visibleInput.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        visibleInput.style.webkitAppearance = 'none';
        
        // Add to body
        document.body.appendChild(visibleInput);
        
        // Handle search button click
        searchButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Show our visible input
          if (visibleInput.style.display === 'none' || visibleInput.style.display === '') {
            // Safari reflow trick - first set opacity to 0
            visibleInput.style.opacity = '0';
            visibleInput.style.display = 'block';
            
            // Force reflow for Safari
            void visibleInput.offsetWidth;
            
            // Now make visible
            visibleInput.style.opacity = '1';
            
            // Focus with delay after reflow
            setTimeout(function() {
              visibleInput.focus();
            }, 50);
          } else {
            visibleInput.style.display = 'none';
            visibleInput.style.opacity = '0';
          }
          
          return false;
        }, true);
        
        // Sync visible input with real input
        visibleInput.addEventListener('input', function() {
          searchInput.value = visibleInput.value;
          
          // Trigger input event on the real input
          const event = new Event('input', { bubbles: true });
          searchInput.dispatchEvent(event);
        });
        
        // Handle form submission
        const searchForm = searchInput.closest('form');
        if (searchForm) {
          searchForm.addEventListener('submit', function(e) {
            searchInput.value = visibleInput.value;
            visibleInput.style.display = 'none';
            visibleInput.style.opacity = '0';
          });
        }
        
        // Hide visible input when clicking elsewhere
        document.addEventListener('click', function(e) {
          if (visibleInput.style.display === 'block' && 
              e.target !== visibleInput && 
              e.target !== searchButton && 
              !searchButton.contains(e.target)) {
            visibleInput.style.display = 'none';
            visibleInput.style.opacity = '0';
          }
        });
        
        // Also handle touchstart for better mobile experience
        document.addEventListener('touchstart', function(e) {
          if (visibleInput.style.display === 'block' && 
              e.target !== visibleInput && 
              e.target !== searchButton && 
              !searchButton.contains(e.target)) {
            visibleInput.style.display = 'none';
            visibleInput.style.opacity = '0';
          }
        }, {passive: true});
        
        console.log("Created visible search input for iOS Safari");
      }
    }
    
    // Create visible search input when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createVisibleSearchInput);
    } else {
      createVisibleSearchInput();
    }
    
    // Also create visible search input after a delay
    setTimeout(createVisibleSearchInput, 1000);
  }
})();

/**
 * Example usage with your simplified code:
 * 
 * <div class="search-container">
 *   <button id="search-icon">🔍</button>
 *   <input type="text" id="search-input" placeholder="Search..." style="display: none;" />
 * </div>
 * 
 * <script src="safari-search-fix.js"></script>
 * <script>
 *   // Your regular code for non-Safari browsers
 *   const searchIcon = document.getElementById('search-icon');
 *   const searchInput = document.getElementById('search-input');
 *
 *   // This will run on all browsers except Safari iOS
 *   if (!(/iPhone|iPad|iPod/i.test(navigator.userAgent) && 
 *        /Safari/i.test(navigator.userAgent) && 
 *        !/Chrome|CriOS/i.test(navigator.userAgent))) {
 *     searchIcon.addEventListener('click', () => {
 *       if (searchInput.style.display === 'none') {
 *         searchInput.style.display = 'block';
 *         searchInput.focus();
 *       } else {
 *         searchInput.style.display = 'none';
 *       }
 *     });
 *   }
 * </script>
 */ 
