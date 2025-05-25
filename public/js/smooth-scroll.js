document.addEventListener('DOMContentLoaded', function() {
    // Get all shop now buttons in the hero section
    const shopNowButtons = document.querySelectorAll('.hero-slider .shop-now-btn');
    
    // Add click event listener to each button
    shopNowButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target section ID from the href attribute
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // Calculate the position to scroll to
                const headerOffset = 100; // Adjust this value based on your header height
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                // Smooth scroll to the target section
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Add a highlight effect to the target section
                targetSection.classList.add('highlight');
                setTimeout(() => {
                    targetSection.classList.remove('highlight');
                }, 2000);
            }
        });
    });
}); 