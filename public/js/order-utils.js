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
  // Auto-create contact field if missing but email or phone exists
  if (!orderData.contact && (orderData.email || orderData.phone)) {
    const contactParts = [];
    if (orderData.email) contactParts.push(orderData.email);
    if (orderData.phone) contactParts.push(orderData.phone);
    orderData.contact = contactParts.join(' / ');
    console.log('Created contact field from email/phone:', orderData.contact);
  }
  
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

  // Try to save to server API
  try {
    // Save to server API
    console.log('Sending order to server API:', orderData.id);
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
      console.log('Order saved successfully to server API:', orderData.id);
      
      // Update the order in localStorage to mark it as synced
      markOrderAsSynced(orderData.id);
      
      return true;
    } else {
      console.error('Failed to save order to server API:', result.error);
      // The order is already in localStorage with pendingSync = true
      return false;
    }
  } catch (error) {
    console.error('Error saving order to server API:', error);
    
    // Mark for future sync
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
  
  return product;
}

// Determine product image based on name and color
function determineProductImage(productName, color) {
  let imagePath = '';
  
  // Convert to lowercase for case-insensitive comparison
  const nameLower = productName.toLowerCase();
  const colorLower = color.toLowerCase();
  
  // Remove any special characters or extra spaces
  const cleanName = nameLower.replace(/[^\w\s]/gi, '').trim();
  
  // Default fallback image
  let defaultImage = '/images/products/default.jpg';
  
  // Determine product type and set image path
  if (cleanName.includes('sofa') || cleanName.includes('corner') || cleanName.includes('suite')) {
    let subfolder = 'v3+2';
    if (cleanName.includes('corner')) subfolder = 'corner';
    
    if (colorLower === 'grey' || colorLower === 'gray') {
      imagePath = `/images/Verona Sofa/${subfolder}/vgrey3.jpg`;
    } else if (colorLower === 'black') {
      imagePath = `/images/Verona Sofa/${subfolder}/vblack3.jpg`;
    } else if (colorLower === 'cream' || colorLower === 'beige') {
      imagePath = `/images/Verona Sofa/${subfolder}/vcream3.jpg`;
    } else if (colorLower === 'blue') {
      imagePath = `/images/Verona Sofa/${subfolder}/vblue3.jpg`;
    } else if (colorLower === 'brown') {
      imagePath = `/images/Verona Sofa/${subfolder}/vbrown3.jpg`;
    } else {
      imagePath = `/images/Verona Sofa/${subfolder}/vgrey3.jpg`; // Default to grey
    }
  } else if (cleanName.includes('chair') || cleanName.includes('armchair')) {
    let subfolder = 'v';
    
    if (colorLower === 'grey' || colorLower === 'gray') {
      imagePath = `/images/Arm Chair/${subfolder}/vgrey.jpg`;
    } else if (colorLower === 'black') {
      imagePath = `/images/Arm Chair/${subfolder}/vblack.jpg`;
    } else if (colorLower === 'cream' || colorLower === 'beige') {
      imagePath = `/images/Arm Chair/${subfolder}/vcream.jpg`;
    } else if (colorLower === 'blue') {
      imagePath = `/images/Arm Chair/${subfolder}/vblue.jpg`;
    } else if (colorLower === 'brown') {
      imagePath = `/images/Arm Chair/${subfolder}/vbrown.jpg`;
    } else {
      imagePath = `/images/Arm Chair/${subfolder}/vgrey.jpg`; // Default to grey
    }
  } else if (cleanName.includes('ottoman') || cleanName.includes('footstool')) {
    imagePath = `/images/ottoman-${colorLower || 'grey'}.jpg`;
  } else if (cleanName.includes('bed') || cleanName.includes('divan')) {
    imagePath = `/images/bed-${colorLower || 'grey'}.jpg`;
  } else {
    // Default image if no specific match
    imagePath = defaultImage;
  }
  
  // Check if this path exists, if not use default
  console.log('Determined image path:', imagePath);
  return imagePath;
}

// Function to get all orders from server and localStorage
async function getAllOrders() {
  console.log('Getting all orders...');
  
  // First get orders from localStorage
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  console.log(`Found ${localOrders.length} orders in localStorage`);
  
  try {
    // Try to get orders from server
    const response = await fetch('/api/orders');
    
    if (!response.ok) {
      // If server request fails, return only local orders
      console.error(`Server returned error: ${response.status}`);
      return localOrders;
    }
    
    const serverOrders = await response.json();
    console.log(`Retrieved ${serverOrders.length} orders from server`);
    
    // Merge server and local orders
    const mergedOrders = mergeOrders(serverOrders, localOrders);
    console.log(`Merged into ${mergedOrders.length} total orders`);
    
    return mergedOrders;
  } catch (error) {
    console.error('Error fetching orders from server:', error);
    // Return local orders if server request fails
    return localOrders;
  }
}

// Merge orders from server and localStorage
function mergeOrders(serverOrders, localOrders) {
  // Create a map for quick lookup
  const orderMap = new Map();
  
  // Add server orders first
  serverOrders.forEach(order => {
    orderMap.set(order.id, { ...order, source: 'server' });
  });
  
  // Add or update with local orders that have pending sync
  localOrders.forEach(order => {
    if (order.pendingSync) {
      // This order hasn't been synced or has local changes
      orderMap.set(order.id, { ...order, source: 'local' });
    } else if (!orderMap.has(order.id)) {
      // This order is only in localStorage but is marked as synced
      orderMap.set(order.id, { ...order, source: 'local' });
    }
  });
  
  // Convert map back to array and sort by timestamp (newest first)
  return Array.from(orderMap.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Function to delete an order
async function deleteOrder(orderId) {
  console.log(`Deleting order: ${orderId}`);
  
  try {
    // Delete from server
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    // If server deletion successful, also remove from localStorage
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedOrders = localOrders.filter(order => order.id !== orderId);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    
    console.log(`Order ${orderId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    return false;
  }
}

// Function to sync pending orders to server
async function syncPendingOrders() {
  // Get orders from localStorage
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  
  // Find orders that need to be synced
  const pendingOrders = localOrders.filter(order => order.pendingSync);
  
  if (pendingOrders.length === 0) {
    console.log('No pending orders to sync');
    return { success: true, synced: 0 };
  }
  
  console.log(`Found ${pendingOrders.length} pending orders to sync`);
  
  // Track sync results
  let syncedCount = 0;
  let failedCount = 0;
  
  // Sync each pending order
  for (const order of pendingOrders) {
    try {
      // Send to server API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Successfully synced order: ${order.id}`);
        markOrderAsSynced(order.id);
        syncedCount++;
      } else {
        console.error(`Failed to sync order ${order.id}:`, result.error);
        failedCount++;
      }
    } catch (error) {
      console.error(`Error syncing order ${order.id}:`, error);
      failedCount++;
      
      // Update sync attempts
      const localOrdersUpdated = JSON.parse(localStorage.getItem('orders') || '[]');
      const orderIndex = localOrdersUpdated.findIndex(o => o.id === order.id);
      
      if (orderIndex >= 0) {
        localOrdersUpdated[orderIndex].syncAttempts = (localOrdersUpdated[orderIndex].syncAttempts || 0) + 1;
        localOrdersUpdated[orderIndex].lastSyncAttempt = new Date().toISOString();
        localStorage.setItem('orders', JSON.stringify(localOrdersUpdated));
      }
    }
  }
  
  return {
    success: failedCount === 0,
    synced: syncedCount,
    failed: failedCount,
    total: pendingOrders.length
  };
}

// Function to force sync all orders
async function forceOrderSync() {
  console.log('Forcing order sync...');
  
  // Get all orders from localStorage
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  
  if (localOrders.length === 0) {
    console.log('No local orders to sync');
    return { success: true, synced: 0 };
  }
  
  console.log(`Found ${localOrders.length} local orders to sync`);
  
  // Mark all orders as pending sync
  const markedOrders = localOrders.map(order => ({
    ...order,
    pendingSync: true,
    lastUpdated: new Date().toISOString()
  }));
  
  // Save back to localStorage
  localStorage.setItem('orders', JSON.stringify(markedOrders));
  
  // Now sync all pending orders
  return await syncPendingOrders();
}

// Function to check for new orders from the server
async function checkForNewOrders() {
  try {
    // Get last sync timestamp from localStorage
    let lastSyncTime = localStorage.getItem('lastOrderSync') || null;
    
    // Get current number of orders in localStorage
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const localOrderCount = localOrders.length;
    
    // Check with server if we need to sync
    const response = await fetch(`/api/sync`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const serverLastSync = result.lastSync;
    
    // If server's last sync is newer than our last sync, or if this is the first sync
    if (!lastSyncTime || new Date(serverLastSync) > new Date(lastSyncTime)) {
      console.log('Server has newer orders, syncing...');
      
      // Update our last sync time
      localStorage.setItem('lastOrderSync', serverLastSync);
      
      // Get all orders from server
      const ordersResponse = await fetch('/api/orders');
      
      if (!ordersResponse.ok) {
        throw new Error(`Server returned ${ordersResponse.status}: ${ordersResponse.statusText}`);
      }
      
      const serverOrders = await ordersResponse.json();
      
      // Merge with local orders
      const mergedOrders = mergeOrders(serverOrders, localOrders);
      
      // Get non-pending orders only for localStorage
      const nonPendingMerged = mergedOrders.map(order => {
        // Keep pending status for local orders
        if (order.source === 'local' && order.pendingSync) {
          return { ...order, pendingSync: true };
        }
        // Mark server orders as synced
        return { ...order, pendingSync: false, synced: true };
      });
      
      // Save merged orders to localStorage
      localStorage.setItem('orders', JSON.stringify(nonPendingMerged));
      
      return {
        newDataAvailable: true,
        orderCount: mergedOrders.length,
        previousCount: localOrderCount,
        newOrders: mergedOrders.length - localOrderCount
      };
    }
    
    // No new data
    return {
      newDataAvailable: false,
      orderCount: localOrderCount
    };
  } catch (error) {
    console.error('Error checking for new orders:', error);
    return {
      newDataAvailable: false,
      error: error.message
    };
  }
}

// Make functions available globally
window.saveOrder = saveOrder;
window.getAllOrders = getAllOrders;
window.deleteOrder = deleteOrder;
window.syncPendingOrders = syncPendingOrders;
window.forceOrderSync = forceOrderSync;
window.checkForNewOrders = checkForNewOrders;
window.ensureOrderUtilsLoaded = ensureOrderUtilsLoaded;

// Debug function to diagnose order issues
window.debugOrderIssues = function() {
  // Get orders from localStorage
  const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  console.log(`Found ${localOrders.length} orders in localStorage`);
  
  // Check for missing required fields
  const problematicOrders = localOrders.filter(order => 
    !order.name || !order.contact || !order.address
  );
  
  if (problematicOrders.length > 0) {
    console.warn(`Found ${problematicOrders.length} orders with missing required fields`);
    console.table(problematicOrders.map(order => ({
      id: order.id,
      hasName: !!order.name,
      hasContact: !!order.contact,
      hasAddress: !!order.address,
      pendingSync: !!order.pendingSync,
      syncAttempts: order.syncAttempts || 0
    })));
  } else {
    console.log('All orders have required fields');
  }
  
  // Check for pending sync orders
  const pendingOrders = localOrders.filter(order => order.pendingSync);
  if (pendingOrders.length > 0) {
    console.warn(`Found ${pendingOrders.length} orders pending sync`);
    console.table(pendingOrders.map(order => ({
      id: order.id,
      timestamp: order.timestamp,
      syncAttempts: order.syncAttempts || 0,
      lastSyncAttempt: order.lastSyncAttempt || 'never'
    })));
  } else {
    console.log('No orders pending sync');
  }
  
  return {
    totalOrders: localOrders.length,
    problematicOrders: problematicOrders.length,
    pendingOrders: pendingOrders.length
  };
}; 
