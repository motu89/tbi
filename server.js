const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const fs = require('fs');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load service account from file
  serviceAccount = require('./firebase-service-account.json');
} catch (error) {
  // If file doesn't exist, use environment variables or empty object
  console.log('Service account file not found, using empty credentials for now');
  serviceAccount = {};
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get Firestore database
const db = admin.firestore();

// Log environment
console.log('Running in local environment');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: 'british-interiors-admin-secret',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 3600000, // 1 hour
    httpOnly: true,
    secure: false, // Set to false for now to troubleshoot
    sameSite: 'lax'
  }
}));

// Debug middleware to log session info
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`Session ID: ${req.session.id}`);
  console.log(`Is Authenticated: ${req.session.isAuthenticated}`);
  next();
});

// Authentication middleware - MUST be defined before routes
app.use((req, res, next) => {
  // Only apply to admin routes, but not to admin login routes
  if (req.path.startsWith('/admin') && 
      !req.path.startsWith('/admin/login')) {
    
    if (!req.session.isAuthenticated) {
      console.log('Unauthorized access attempt to:', req.path);
      return res.redirect('/admin/login');
    }
  }
  next();
});

// Global array to store orders in memory
let orders = [];

// Global variable to store last order sync timestamp
let lastOrderSync = new Date().toISOString();

// Initialize orders from file system
try {
  const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    console.log('Created data directory');
  }
  
  // Load orders from file or initialize with empty array
  if (fs.existsSync(ordersFilePath)) {
    const data = fs.readFileSync(ordersFilePath, 'utf8');
    orders = JSON.parse(data);
    console.log(`Loaded ${orders.length} orders from file`);
  } else {
    // Initialize with empty array and create the file
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Created new orders file');
  }
} catch (error) {
  console.error('Error loading orders:', error);
  console.log('Using in-memory orders only');
  // Initialize with empty array
  orders = [];
}

// API endpoint to get all orders
app.get('/api/orders', async (req, res) => {
  // Only allow admin to access all orders
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to /api/orders');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  try {
    // Get orders from Firestore
    const snapshot = await db.collection('orders').orderBy('timestamp', 'desc').get();
    const firestoreOrders = [];
    
    snapshot.forEach(doc => {
      firestoreOrders.push(doc.data());
    });
    
    console.log(`Retrieved ${firestoreOrders.length} orders from Firestore`);
    
    // Merge with local orders - prioritize Firestore orders
    const mergedOrders = mergeOrders(firestoreOrders, orders);
    
    console.log(`Returning ${mergedOrders.length} merged orders to admin`);
    
    res.json(mergedOrders);
  } catch (error) {
    console.error('Error fetching orders from Firestore:', error);
    
    // Fallback to local orders
    console.log(`Falling back to ${orders.length} local orders`);
    
    // Check if orders array is valid
    if (!Array.isArray(orders)) {
      console.error('Orders variable is not an array!');
      // Reset orders to empty array if it's corrupted
      orders = [];
    }
    
    res.json(orders);
  }
});

// Helper function to merge orders from Firestore and local storage
function mergeOrders(firestoreOrders, localOrders) {
  // Create a map of orders by ID for faster lookup
  const orderMap = new Map();
  
  // Add local orders to the map
  localOrders.forEach(order => {
    orderMap.set(order.id, order);
  });
  
  // Override with Firestore orders (they take precedence)
  firestoreOrders.forEach(order => {
    orderMap.set(order.id, order);
  });
  
  // Convert map back to array
  return Array.from(orderMap.values());
}

// API endpoint to save an order
app.post('/api/orders', async (req, res) => {
  const orderData = req.body;
  
  // Validate required fields
  if (!orderData.name || !orderData.contact || !orderData.address) {
    console.log('Missing required fields in order data');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate an order ID if not provided
  if (!orderData.id) {
    orderData.id = 'order-' + Date.now();
  }
  
  // Add timestamp if not provided
  if (!orderData.timestamp) {
    orderData.timestamp = new Date().toISOString();
  }
  
  console.log(`Processing order: ${orderData.id}`);
  
  // Check if this order already exists (by ID)
  const existingOrderIndex = orders.findIndex(order => order.id === orderData.id);
  
  if (existingOrderIndex >= 0) {
    console.log(`Order ${orderData.id} already exists, updating it`);
    // Update existing order
    orders[existingOrderIndex] = orderData;
  } else {
    console.log(`Order ${orderData.id} is new, adding it`);
    // Add new order
    orders.push(orderData);
  }
  
  // Update last sync timestamp
  lastOrderSync = new Date().toISOString();
  
  // Save orders to file - but only in local environment
  try {
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Order added and saved to file');
  } catch (error) {
    console.error('Error saving order to file:', error);
  }
  
  // Save to Firebase Firestore
  try {
    // Convert any non-standard data types to string
    const firestoreOrder = JSON.parse(JSON.stringify(orderData));
    
    // Add to Firestore collection
    await db.collection('orders').doc(orderData.id).set(firestoreOrder);
    console.log(`Order ${orderData.id} saved to Firestore`);
  } catch (error) {
    console.error('Error saving order to Firestore:', error);
    // Don't return error - we've already saved to local file
  }
  
  res.status(201).json({ success: true, orderId: orderData.id });
});

// API endpoint to delete an order
app.delete('/api/orders/:id', async (req, res) => {
  // Only allow admin to delete orders
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to delete order');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  const orderId = req.params.id;
  console.log(`Deleting order: ${orderId}`);
  
  // Find and remove the order from local array
  const initialLength = orders.length;
  orders = orders.filter(order => order.id !== orderId);
  
  // If no order was removed, check if it exists in Firestore before returning 404
  let orderExists = orders.length < initialLength;
  
  // Update last sync timestamp
  lastOrderSync = new Date().toISOString();
  
  // Save updated orders to file - but only in local environment
  try {
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Local orders updated after deletion');
  } catch (error) {
    console.error('Error saving orders to file after deletion:', error);
  }
  
  // Delete from Firestore
  try {
    // Check if document exists in Firestore first
    const docRef = db.collection('orders').doc(orderId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      await docRef.delete();
      console.log(`Order ${orderId} deleted from Firestore`);
      orderExists = true;
    } else if (!orderExists) {
      console.log(`Order ${orderId} not found in Firestore or local storage`);
      return res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    console.error('Error deleting order from Firestore:', error);
    // Continue if local deletion was successful
    if (!orderExists) {
      return res.status(404).json({ error: 'Order not found' });
    }
  }
  
  res.json({ 
    success: true,
    lastSync: lastOrderSync,
    remainingOrders: orders.length
  });
});

// New API endpoint for full order sync - this helps sync orders across devices
app.post('/api/sync-orders', async (req, res) => {
  // Only allow admin to sync orders
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to /api/sync-orders');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  try {
    console.log('Performing full order sync');
    
    // If client sends orders in the request body, merge them with server orders
    if (req.body && Array.isArray(req.body.orders) && req.body.orders.length > 0) {
      console.log(`Received ${req.body.orders.length} orders from client for sync`);
      
      // Merge orders from client with server orders
      const clientOrders = req.body.orders;
      
      // Create a map for quick lookup
      const orderMap = new Map();
      
      // Add server orders first
      orders.forEach(order => {
        orderMap.set(order.id, order);
      });
      
      // Add or update with client orders
      clientOrders.forEach(order => {
        if (!orderMap.has(order.id)) {
          // New order from client
          console.log(`Adding new order from client sync: ${order.id}`);
          orderMap.set(order.id, order);
        } else {
          // Order exists on both - use the one with the latest timestamp
          const serverOrder = orderMap.get(order.id);
          const serverTime = new Date(serverOrder.timestamp).getTime();
          const clientTime = new Date(order.timestamp).getTime();
          
          if (clientTime > serverTime) {
            console.log(`Updating order from client sync: ${order.id}`);
            orderMap.set(order.id, order);
          }
        }
      });
      
      // Convert map back to array
      orders = Array.from(orderMap.values());
      
      // Update last sync timestamp
      lastOrderSync = new Date().toISOString();
      
      // Save to file - but only in local environment
      try {
        const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
        fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
        console.log('Orders synced and saved to file');
      } catch (error) {
        console.error('Error saving orders to file after sync:', error);
      }
    }
    
    // Return all orders to client
    console.log(`Returning ${orders.length} orders to client after sync`);
    res.json({ 
      success: true, 
      count: orders.length,
      orders: orders,
      lastSync: lastOrderSync
    });
  } catch (error) {
    console.error('Error during order sync:', error);
    res.status(500).json({ error: 'Failed to sync orders', message: error.message });
  }
});

// API endpoint to check for new orders
app.get('/api/check-orders', (req, res) => {
  // Only allow admin to access
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to /api/check-orders');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  // Get client's last sync timestamp and order count
  const clientLastSync = req.query.lastSync || '';
  const clientOrderCount = parseInt(req.query.orderCount || '0', 10);
  
  console.log(`Check-orders request: Client last sync=${clientLastSync}, Client order count=${clientOrderCount}, Server order count=${orders.length}`);
  
  // Determine if sync is needed:
  // 1. If client's last sync is older than server's last update
  // 2. If client has a different number of orders than the server
  const syncByTimestamp = !clientLastSync || new Date(clientLastSync) < new Date(lastOrderSync);
  const syncByCount = clientOrderCount !== orders.length;
  const needsSync = syncByTimestamp || syncByCount;
  
  console.log(`Sync needed: ${needsSync} (by timestamp: ${syncByTimestamp}, by count: ${syncByCount})`);
  
  res.json({
    needsSync,
    lastSync: lastOrderSync,
    orderCount: orders.length,
    reason: syncByTimestamp ? 'New orders available' : 
           (syncByCount ? 'Order count mismatch' : 'Up to date')
  });
});

// Debug API endpoint to check order storage status
app.get('/api/debug/orders-status', async (req, res) => {
  // Only allow admin to access debug info
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to /api/debug/orders-status');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  try {
    let fileExists = false;
    let fileOrdersCount = 0;
    
    // Only check file in local environment
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    try {
      fileExists = fs.existsSync(ordersFilePath);
      if (fileExists) {
        try {
          const fileData = fs.readFileSync(ordersFilePath, 'utf8');
          const fileOrders = JSON.parse(fileData);
          fileOrdersCount = fileOrders.length;
        } catch (readError) {
          console.error('Error reading orders file:', readError);
        }
      }
    } catch (e) {
      console.error('Error checking orders file:', e);
    }
    
    res.json({
      environment: 'Local',
      inMemoryOrders: orders.length,
      fileExists: fileExists,
      fileOrdersCount: fileOrdersCount,
      isAuthenticated: req.session.isAuthenticated === true,
      lastSync: lastOrderSync
    });
  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({ error: 'Failed to get debug info', message: error.message });
  }
});

// Session check endpoint
app.get('/api/check-session', (req, res) => {
  res.json({ 
    isAuthenticated: req.session.isAuthenticated === true,
    sessionId: req.session.id,
    sessionAge: req.session.cookie ? req.session.cookie.maxAge : null
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    ordersCount: orders.length,
    timestamp: new Date().toISOString(),
    environment: 'Local',
    isAuthenticated: req.session.isAuthenticated === true,
    lastSync: lastOrderSync
  });
});

// Serve HTML files from the views directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/404', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', '404.html'));
});

// Admin login routes
app.get('/admin/login', (req, res) => {
  // Always reset the session when accessing the login page directly
  // This ensures users always have to login 
  req.session.isAuthenticated = false;
  console.log('Login page accessed, session reset');
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username });
  
  // Hardcoded credentials (in a real app, use proper authentication)
  if (username === 'shoaib' && password === 'adminshabi896') {
    req.session.isAuthenticated = true;
    req.session.username = username;
    
    // Save session explicitly
    req.session.save(err => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).send('Error during login. Please try again.');
      }
      
    console.log('Authentication successful for user:', username);
      console.log('Session after login:', req.session);
      
      // Redirect after successful session save
    res.redirect('/admin');
    });
  } else {
    console.log('Authentication failed for user:', username);
    res.redirect('/admin/login?error=invalid');
  }
});

// Admin logout route
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin routes - these are now protected by the middleware above
app.get('/admin', (req, res) => {
  // Double-check authentication here as well
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access to /admin, redirecting to login');
    return res.redirect('/admin/login');
  }
  
  console.log('Serving admin page to authenticated user:', req.session.username);
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/admin/', (req, res) => {
  // Double-check authentication here as well
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access to /admin/, redirecting to login');
    return res.redirect('/admin/login');
  }
  
  console.log('Serving admin page to authenticated user:', req.session.username);
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Handle product pages
app.get('/products/:productId', (req, res) => {
  const productPage = path.join(__dirname, 'views', 'products', req.params.productId);
  
  // Check if the file exists
  if (fs.existsSync(productPage)) {
    res.sendFile(productPage);
  } else {
    // If no specific product page exists, redirect to 404
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start server if not being used as a module
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin login page: http://localhost:${PORT}/admin/login`);
  });
}

// Export the app for standard use
module.exports = app;
