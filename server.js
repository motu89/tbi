const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const fs = require('fs');

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
    // Check if orders array is valid
    if (!Array.isArray(orders)) {
      console.error('Orders variable is not an array!');
      // Reset orders to empty array if it's corrupted
      orders = [];
    }
    
    console.log(`Returning ${orders.length} orders to admin`);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
  
  // Save orders to file
  try {
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Order added and saved to file');
  } catch (error) {
    console.error('Error saving order to file:', error);
    return res.status(500).json({ error: 'Failed to save order' });
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
  
  // If no order was removed, it doesn't exist
  if (orders.length === initialLength) {
    console.log(`Order ${orderId} not found`);
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Update last sync timestamp
  lastOrderSync = new Date().toISOString();
  
  // Save updated orders to file
  try {
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log(`Order ${orderId} deleted and saved to file`);
  } catch (error) {
    console.error('Error saving updated orders to file:', error);
    // Don't return error here, as the order was removed from memory
  }
  
  res.json({ success: true });
});

// API endpoint to update order status
app.patch('/api/orders/:id', async (req, res) => {
  // Only allow admin to update orders
  if (!req.session.isAuthenticated) {
    console.log('Unauthorized access attempt to update order');
    return res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
  }
  
  const orderId = req.params.id;
  const updateData = req.body;
  
  console.log(`Updating order: ${orderId}`, updateData);
  
  // Find the order
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    console.log(`Order ${orderId} not found`);
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Update the order with the new data
  orders[orderIndex] = {
    ...orders[orderIndex],
    ...updateData,
    lastUpdated: new Date().toISOString()
  };
  
  // Update last sync timestamp
  lastOrderSync = new Date().toISOString();
  
  // Save updated orders to file
  try {
    const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log(`Order ${orderId} updated and saved to file`);
  } catch (error) {
    console.error('Error saving updated order to file:', error);
    // Don't return error here, as the order was updated in memory
  }
  
  res.json({ success: true, order: orders[orderIndex] });
});

// API endpoint to get last sync timestamp
app.get('/api/sync', (req, res) => {
  res.json({ lastSync: lastOrderSync });
});

// Admin login route
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  // Hardcoded admin credentials - in production this would use a database
  if (username === 'admin' && password === 'britishinteriors2023') {
    req.session.isAuthenticated = true;
    req.session.username = username;
    console.log('Admin login successful');
    
    // Redirect to admin dashboard
    res.json({ success: true, redirect: '/admin' });
  } else {
    console.log('Admin login failed');
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Admin logout route
app.get('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.redirect('/admin/login');
  });
});

// Serve HTML pages
// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Admin login page
app.get('/admin/login', (req, res) => {
  // If already authenticated, redirect to admin dashboard
  if (req.session.isAuthenticated) {
    return res.redirect('/admin');
  }
  
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch all other routes and serve the index.html
app.get('*', (req, res) => {
  // Exclude API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
