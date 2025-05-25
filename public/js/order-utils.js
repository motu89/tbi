// Order utilities for The British Interiors
// This file handles order creation and storage with proper API integration

// Function to ensure order-utils.js is loaded
function ensureOrderUtilsLoaded(callback) {
  // If saveOrder function exists, then order-utils.js is already loaded
  if (typeof window.saveOrder === 'function') {
    if (callback) callback();
    return;
  }
  
  console.log('Loading order-utils.js...');
  
  // Create script element
  const script = document.createElement('script');
  script.src = '/js/order-utils.js';
  script.onload = function() {
    console.log('order-utils.js loaded successfully');
    if (callback) callback();
  };
  script.onerror = function() {
    console.error('Failed to load order-utils.js');
  };
  
  // Append to head
  document.head.appendChild(script);
}

// Function to generate a unique order ID
function generateOrderId() {
  return 'order-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

// Function to save an order to server
async function saveOrder(orderData) {
  // Make sure we have the required fields
  if (!orderData.name || !orderData.contact || !orderData.address) {
    console.error('Missing required order fields');
    return false;
  }

  // Generate an order ID if not provided
  if (!orderData.id) {
    orderData.id = generateOrderId();
  }

  // Add timestamp if not provided
  if (!orderData.timestamp) {
    orderData.timestamp = new Date().toISOString();
  }

  // Process product details and ensure images are properly set
  if (orderData.productDetails) {
    // Single product order with new structure (Buy Now)
    orderData.productDetails = processSingleProduct(orderData.productDetails, orderData);
  } else if (orderData.product && typeof orderData.product === 'object') {
    // Legacy structure - single product as object
    orderData.product = processSingleProduct(orderData.product, orderData);
  } else if (orderData.products && Array.isArray(orderData.products)) {
    // Multiple products (Basket checkout)
    orderData.products = orderData.products.map(product => processSingleProduct(product, orderData));
  }

  console.log('Processing order:', orderData.id);

  // First save to localStorage to ensure we don't lose the order
  saveOrderToLocalStorage(orderData);

  try {
    // Save to server API
    console.log('Sending order to server:', orderData.id);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Order saved successfully to server:', orderData.id);
      
      // Update the order in localStorage to mark it as synced
      markOrderAsSynced(orderData.id);
      
      return true;
    } else {
      console.error('Failed to save order to server:', result.error);
      // The order is already in localStorage with pendingSync = true
      return false;
    }
  } catch (error) {
    console.error('Error saving order to server:', error);
    
    // The order is already in localStorage
    // Make sure it's marked for future sync
    markOrderForSync(orderData.id);
    
    return false;
  }
}

// Save order to localStorage
function saveOrderToLocalStorage(orderData) {
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  
  // Check if this order already exists (by ID)
  const existingOrderIndex = localOrders.findIndex(order => order.id === orderData.id);
  
  if (existingOrderIndex >= 0) {
    // Update existing order
    localOrders[existingOrderIndex] = {
      ...orderData,
      pendingSync: true,
      lastUpdated: new Date().toISOString()
    };
  } else {
    // Add new order
    localOrders.push({
      ...orderData,
      pendingSync: true,
      lastUpdated: new Date().toISOString()
    });
  }
  
  // Save to localStorage
  localStorage.setItem('orders', JSON.stringify(localOrders));
  console.log('Order saved to localStorage:', orderData.id);
}

// Mark an order as synced with the server
function markOrderAsSynced(orderId) {
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  const orderIndex = localOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex >= 0) {
    localOrders[orderIndex].pendingSync = false;
    localOrders[orderIndex].synced = true;
    localOrders[orderIndex].syncedAt = new Date().toISOString();
    localStorage.setItem('orders', JSON.stringify(localOrders));
    console.log('Order marked as synced:', orderId);
  }
}

// Mark an order for future sync
function markOrderForSync(orderId) {
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  const orderIndex = localOrders.findIndex(order => order.id === orderId);
  
  if (orderIndex >= 0) {
    localOrders[orderIndex].pendingSync = true;
    localOrders[orderIndex].syncAttempts = (localOrders[orderIndex].syncAttempts || 0) + 1;
    localOrders[orderIndex].lastSyncAttempt = new Date().toISOString();
    localStorage.setItem('orders', JSON.stringify(localOrders));
    console.log('Order marked for future sync:', orderId);
  }
}

// Process a single product to ensure proper image paths
function processSingleProduct(product, orderData) {
  // Process product to ensure it has the proper image paths
  if (!product.image || product.image.trim() === '') {
    // If no image is provided, try to determine it from the product name and color
    const productName = product.name || product.title || product.product || 
                        orderData.product || orderData.productTitle || 'Unknown Product';
    const productColor = product.color || (orderData.color || '').toLowerCase();
    
    // Set image path based on product name and color
    product.image = determineProductImage(productName, productColor);
  }
  
  // Ensure the image path is properly formatted
  if (product.image && !product.image.startsWith('/')) {
    // If the path is relative, make it absolute
    if (!product.image.startsWith('http')) {
      product.image = '/' + product.image;
    }
  }
  
  return product;
}

// Function to determine product image based on name and color
function determineProductImage(productName, color) {
  const nameLower = productName.toLowerCase();
  const colorLower = (color || '').toLowerCase();
  
  console.log('Determining image for', nameLower, colorLower);
  
  // Handle different product categories
  if (nameLower.includes('sofa') || nameLower.includes('seater')) {
    if (nameLower.includes('dylan')) {
      return '/images/Dylan Sofa/DSC_0018.JPG';
    } else if (nameLower.includes('verona')) {
      // Choose image based on color if available
      if (colorLower.includes('grey')) {
        return '/images/Verona Sofa/v3+2/vgrey3.jpg';
      } else if (colorLower.includes('black')) {
        return '/images/Verona Sofa/v3+2/vblack2.jpg';
      } else if (colorLower.includes('mink')) {
        return '/images/Verona Sofa/v3+2/vmink1.jpg';
      } else {
        return '/images/Verona Sofa/v3+2/vgrey3.jpg';
      }
    } else if (nameLower.includes('salone')) {
      return '/images/Salone Sofa/1.JPG';
    } else if (nameLower.includes('u-shape') || nameLower.includes('ushape')) {
      return '/images/U-shape Sofa/1.jpg';
    } else if (nameLower.includes('leather roma recliner 3 seater') || 
              (nameLower.includes('leather') && nameLower.includes('roma') && nameLower.includes('3 seater'))) {
      // Specific handling for Leather Roma Recliner 3 seater
      if (colorLower.includes('grey')) {
        return '/images/Leather Sofa/3+2/lg2.jpg';
      } else if (colorLower.includes('black')) {
        return '/images/Leather Sofa/3+2/lb1.jpg';
      } else if (colorLower.includes('brown')) {
        return '/images/Leather Sofa/3+2/lh3.jpg';
      } else {
        return '/images/Leather Sofa/3+2/lg2.jpg';
      }
    } else if (nameLower.includes('leather roma recliner 3+2') || 
              (nameLower.includes('leather') && nameLower.includes('roma') && nameLower.includes('3+2'))) {
      // Specific handling for Leather Roma Recliner 3+2 Sofa
      if (colorLower.includes('grey')) {
        return '/images/Leather Sofa/3+2/lg2.jpg';
      } else if (colorLower.includes('black')) {
        return '/images/Leather Sofa/3+2/lb1.jpg';
      } else if (colorLower.includes('brown')) {
        return '/images/Leather Sofa/3+2/lh3.jpg';
      } else {
        return '/images/Leather Sofa/3+2/lg2.jpg';
      }
    } else if (nameLower.includes('leather')) {
      return '/images/Leather Sofa/1.jpg';
    } else {
      return '/images/Verona Sofa/v3+2/vgrey3.jpg'; // Default sofa image
    }
  } else if (nameLower.includes('chair') || nameLower.includes('arm chair')) {
    // Choose image based on color if available
    if (colorLower.includes('grey')) {
      return '/images/Arm Chair/v/vgrey.jpg';
    } else if (colorLower.includes('black')) {
      return '/images/Arm Chair/v/vblack.jpg';
    } else if (colorLower.includes('mink')) {
      return '/images/Arm Chair/v/vmink.jpg';
    } else {
      return '/images/Arm Chair/v/vgrey.jpg';
    }
  } else if (nameLower.includes('sofabed')) {
    return '/images/Sofabed/sb1.jpg';
  }
  
  // Default to placeholder if no match
  return '/images/placeholder.jpg';
}

// Function to get all orders from server API
async function getAllOrders() {
  console.log('Getting all orders');
  
  try {
    // Try to get orders from server API
    console.log('Fetching orders from server');
    const response = await fetch('/api/orders', {
      // Include credentials to ensure cookies are sent for authentication
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.status === 401) {
      console.error('Authentication failed when fetching orders');
      // Redirect to login page if not authenticated
      window.location.href = '/admin/login';
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const serverOrders = await response.json();
    console.log('Orders fetched from server:', serverOrders.length);
    
    // Get local orders
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    console.log('Local orders:', localOrders.length);
    
    // If server returned empty array but we have local orders, this might be a server restart
    if (serverOrders.length === 0 && localOrders.length > 0) {
      console.log('Server returned no orders but we have local orders - possible server restart');
      
      // Try to sync local orders to server
      try {
        console.log('Attempting to sync local orders to server');
        const syncResponse = await fetch('/api/sync-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify({ orders: localOrders })
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('Sync successful, server now has', syncResult.count, 'orders');
          
          // Return the merged orders from the sync response
          if (syncResult.orders && Array.isArray(syncResult.orders)) {
            // Update local storage
            localStorage.setItem('orders', JSON.stringify(syncResult.orders));
            return syncResult.orders;
          }
        }
      } catch (syncError) {
        console.error('Failed to sync local orders to server:', syncError);
      }
      
      // If sync failed or didn't return orders, return local orders
      return localOrders;
    }
    
    // Merge orders, keeping the most recent version of each
    const mergedOrders = mergeOrders(serverOrders, localOrders);
    console.log('Total merged orders:', mergedOrders.length);
    
    // Update local cache
    localStorage.setItem('orders', JSON.stringify(mergedOrders));
    
    return mergedOrders;
  } catch (error) {
    console.error('Error fetching orders from server:', error);
    
    // Fallback to local cache
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    console.log('Using local orders as fallback:', localOrders.length);
    
    // If we have no orders at all, throw an error
    if (localOrders.length === 0) {
      throw new Error('No orders found locally or on server: ' + error.message);
    }
    
    return localOrders;
  }
}

// Merge orders from different sources, keeping the most recent version
function mergeOrders(serverOrders, localOrders) {
  // Create a map for quick lookup
  const orderMap = new Map();
  
  // Add server orders first
  serverOrders.forEach(order => {
    orderMap.set(order.id, {
      ...order,
      source: 'server'
    });
  });
  
  // Add or update with local orders
  localOrders.forEach(order => {
    if (orderMap.has(order.id)) {
      // Order exists in both sources
      const serverOrder = orderMap.get(order.id);
      
      // If the local order has been synced with the server, keep the server version
      if (order.synced) {
        // Keep server version but preserve sync status
        orderMap.set(order.id, {
          ...serverOrder,
          synced: true,
          syncedAt: order.syncedAt
        });
      } else if (order.pendingSync) {
        // Local order has pending changes, keep the local version
        orderMap.set(order.id, {
          ...order,
          source: 'local'
        });
      }
      // Otherwise keep the server version (already in the map)
    } else {
      // Order only exists locally
      orderMap.set(order.id, {
        ...order,
        source: 'local'
      });
    }
  });
  
  // Convert map back to array
  return Array.from(orderMap.values());
}

// Function to delete an order by ID
async function deleteOrder(orderId) {
  console.log('Deleting order:', orderId);
  
  try {
    // Delete from server API
    console.log('Sending delete request to server for order:', orderId);
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Order deleted from server successfully:', orderId);
      
      // Also delete from local cache
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedLocalOrders = localOrders.filter(order => order.id !== orderId);
      localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
      
      return true;
    } else {
      console.error('Failed to delete order from server:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    
    // Try to delete from local cache anyway
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedLocalOrders = localOrders.filter(order => order.id !== orderId);
    localStorage.setItem('orders', JSON.stringify(updatedLocalOrders));
    
    return false;
  }
}

// Function to sync pending orders with the server
async function syncPendingOrders() {
  console.log('Syncing pending orders');
  
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  const pendingOrders = localOrders.filter(order => order.pendingSync === true);
  
  if (pendingOrders.length === 0) {
    console.log('No pending orders to sync');
    return { success: true, synced: 0 };
  }
  
  console.log('Found pending orders to sync:', pendingOrders.length);
  
  // Use the new sync-orders endpoint which handles merging
  try {
    // Send only the pending orders to the server
    const response = await fetch('/api/sync-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orders: pendingOrders })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Sync successful, received', result.count, 'orders from server');
      
      // Update local storage with the complete set of orders from server
      if (result.orders && Array.isArray(result.orders)) {
        // Mark all previously pending orders as synced
        const allOrderIds = new Set(result.orders.map(order => order.id));
        
        // Create a new array with all orders from server, marked as synced
        const updatedOrders = result.orders.map(serverOrder => {
          // Check if this was one of our pending orders
          const wasPending = pendingOrders.some(po => po.id === serverOrder.id);
          
          return {
            ...serverOrder,
            synced: true,
            syncedAt: new Date().toISOString(),
            pendingSync: false,
            // If this was a pending order, mark it as successfully synced
            syncSuccess: wasPending ? true : undefined
          };
        });
        
        // Save to localStorage
        localStorage.setItem('orders', JSON.stringify(updatedOrders));
        console.log('Updated local storage with', updatedOrders.length, 'synced orders');
      }
      
      return { 
        success: true,
        synced: pendingOrders.length,
        total: result.count
      };
    } else {
      console.error('Failed to sync orders');
      return { 
        success: false, 
        synced: 0,
        failed: pendingOrders.length,
        error: 'Server reported failure'
      };
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
    return { 
      success: false, 
      synced: 0,
      failed: pendingOrders.length,
      error: error.message
    };
  }
}

// Force sync all orders from server
async function forceOrderSync() {
  console.log('Forcing order sync with server');
  
  try {
    // Get all local orders to send to the server
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    console.log('Local orders to sync:', localOrders.length);
    
    // Send local orders to server and get all server orders
    const response = await fetch('/api/sync-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'same-origin', // Include credentials for authentication
      body: JSON.stringify({ orders: localOrders })
    });
    
    if (response.status === 401) {
      console.error('Authentication failed when syncing orders');
      // Redirect to login page if not authenticated
      window.location.href = '/admin/login';
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Orders synced successfully, received:', result.count);
      
      // Update local storage with the complete set of orders from server
      if (result.orders && Array.isArray(result.orders)) {
        // Mark all orders as synced
        const syncedOrders = result.orders.map(order => ({
          ...order,
          synced: true,
          syncedAt: new Date().toISOString(),
          pendingSync: false
        }));
        
        // Save to localStorage
        localStorage.setItem('orders', JSON.stringify(syncedOrders));
        console.log('Updated local storage with', syncedOrders.length, 'synced orders');
      } else {
        console.warn('No orders returned from server in sync response');
      }
      
      return { success: true, count: result.count };
    } else {
      console.error('Failed to sync orders');
      return { success: false, error: 'Failed to sync orders' };
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
    return { success: false, error: error.message };
  }
}

// Check for online status and sync pending orders when online
window.addEventListener('online', function() {
  console.log('Connection restored, syncing pending orders');
  syncPendingOrders();
});

// Try to sync pending orders when the page loads
document.addEventListener('DOMContentLoaded', function() {
  if (navigator.onLine) {
    console.log('Page loaded and online, checking for pending orders');
    syncPendingOrders();
  }
});

// Function to check if there are new orders on the server
async function checkForNewOrders() {
  console.log('Checking for new orders on server');
  
  try {
    // Get current order count from localStorage
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const localOrderCount = localOrders.length;
    const lastSyncTime = localStorage.getItem('lastOrderSync') || '';
    
    console.log(`Local order count: ${localOrderCount}, Last sync: ${lastSyncTime}`);
    
    // Call the check-orders endpoint to see if there are new orders
    const response = await fetch(`/api/check-orders?orderCount=${localOrderCount}&lastSync=${encodeURIComponent(lastSyncTime)}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Check orders result:', result);
    
    // Store the latest sync time
    if (result.lastSync) {
      localStorage.setItem('lastOrderSync', result.lastSync);
    }
    
    // If there are new orders, force a sync
    if (result.needsSync) {
      console.log(`New orders detected on server (${result.reason}), syncing...`);
      const syncResult = await forceOrderSync();
      return { 
        ...syncResult, 
        newOrders: true,
        reason: result.reason
      };
    } else {
      console.log('No new orders detected on server');
      return { 
        success: true, 
        count: result.orderCount, 
        newOrders: false,
        reason: result.reason
      };
    }
  } catch (error) {
    console.error('Error checking for new orders:', error);
    return { success: false, error: error.message };
  }
}

// Make functions available globally
window.saveOrder = saveOrder;
window.getAllOrders = getAllOrders;
window.deleteOrder = deleteOrder;
window.ensureOrderUtilsLoaded = ensureOrderUtilsLoaded;
window.syncPendingOrders = syncPendingOrders;
window.forceOrderSync = forceOrderSync;
window.checkForNewOrders = checkForNewOrders; 
