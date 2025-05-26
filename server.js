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
  resave: true, // Changed to true to ensure session is saved on each request
  saveUninitialized: true, // Changed to true to create session for all users
  cookie: { 
    maxAge: 86400000, // 24 hours (increased from 1 hour)
    httpOnly: true,
    secure: false, // Set to false for development
    sameSite: 'lax'
  }
}));

// Debug middleware to log session info
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`Session ID: ${req.session.id}`);
  console.log(`Session Cookie: ${JSON.stringify(req.session.cookie)}`);
  console.log(`Is Authenticated: ${req.session.isAuthenticated}`);
  if (req.session.username) {
    console.log(`Logged in as: ${req.session.username}`);
  }
  next();
});

// Authentication middleware - MUST be defined before routes
app.use((req, res, next) => {
  // Only apply to admin routes, but not to admin login routes
  if (req.path.startsWith('/admin') && 
      !req.path.startsWith('/admin/login')) {
    
    console.log('AUTH CHECK - Path:', req.path);
    console.log('AUTH CHECK - Is Authenticated:', req.session.isAuthenticated);
    
    if (!req.session.isAuthenticated) {
      console.log('AUTH CHECK - Not authenticated, redirecting to login');
      return res.redirect('/admin/login');
    } 
    
    console.log('AUTH CHECK - User is authenticated, proceeding to admin');
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

// API endpoint to check if session is still valid
app.get('/api/check-session', (req, res) => {
  console.log('Session check requested - Auth status:', req.session.isAuthenticated);
  console.log('Session check requested - Session ID:', req.session.id);
  
  res.json({ 
    isAuthenticated: req.session.isAuthenticated === true,
    username: req.session.username || null
  });
});

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin login route
app.post('/admin/login', (req, res) => {
  console.log('Admin login attempt:', req.body);
  const { username, password } = req.body;
  
  console.log(`Received credentials - Username: ${username}, Password: ${password}`);
  
  // Check if we received JSON data
  const isJsonRequest = req.is('application/json');
  console.log('Is JSON request:', isJsonRequest);
  
  // Hardcoded admin credentials
  if (username === 'shoaib' && password === 'adminshabi896') {
    // Set authentication in session
    req.session.isAuthenticated = true;
    req.session.username = username;
    
    // Save session explicitly
    req.session.save(err => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ error: 'Session error', message: 'Could not save session' });
      }
      
      console.log('Login successful - Session saved with auth:', req.session.isAuthenticated);
      console.log('Login successful - Session ID:', req.session.id);
      
      // If this is an AJAX request, respond with JSON
      if (isJsonRequest) {
        return res.json({ success: true, redirectTo: '/admin' });
      }
      
      // Regular form submission - redirect to admin page
      res.redirect('/admin');
    });
  } else {
    console.log(`Admin login failed - Username: ${username}, Password: ${password}`);
    
    // If this is an AJAX request, respond with JSON
    if (isJsonRequest) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.redirect('/admin/login?error=invalid');
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

// Admin page
app.get('/admin', (req, res) => {
  console.log('ADMIN PAGE - Request received');
  console.log('ADMIN PAGE - Auth status:', req.session.isAuthenticated);
  console.log('ADMIN PAGE - Session ID:', req.session.id);
  
  // Check if user is authenticated
  if (!req.session.isAuthenticated) {
    console.log('ADMIN PAGE - Not authenticated, redirecting to login');
    return res.redirect('/admin/login');
  }
  
  console.log('ADMIN PAGE - Serving to authenticated user:', req.session.username);
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Admin login page
app.get('/admin/login', (req, res) => {
  console.log('LOGIN PAGE - Request received');
  console.log('LOGIN PAGE - Auth status:', req.session.isAuthenticated);
  
  // If already authenticated, redirect to admin dashboard
  if (req.session.isAuthenticated) {
    console.log('LOGIN PAGE - Already authenticated, redirecting to admin');
    return res.redirect('/admin');
  }
  
  console.log('LOGIN PAGE - Serving login page');
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Direct product routes - explicit routes for each product page
// This ensures the routes work correctly without any routing conflicts

app.get('/products/basket.html', (req, res) => {
  console.log('Serving basket page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'basket.html'));
});

app.get('/products/dylan-sofa1.html', (req, res) => {
  console.log('Serving dylan-sofa1 page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'dylan-sofa1.html'));
});

app.get('/products/dylan-sofa2.html', (req, res) => {
  console.log('Serving dylan-sofa2 page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'dylan-sofa2.html'));
});

app.get('/products/dylan-sofa3.html', (req, res) => {
  console.log('Serving dylan-sofa3 page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'dylan-sofa3.html'));
});

app.get('/products/dylan-sofa4.html', (req, res) => {
  console.log('Serving dylan-sofa4 page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'dylan-sofa4.html'));
});

app.get('/products/verona-corner-sofa.html', (req, res) => {
  console.log('Serving verona-corner-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'verona-corner-sofa.html'));
});

app.get('/products/verona-3-2-sofa.html', (req, res) => {
  console.log('Serving verona-3-2-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'verona-3-2-sofa.html'));
});

app.get('/products/bishop-u-shape-sofa.html', (req, res) => {
  console.log('Serving bishop-u-shape-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'bishop-u-shape-sofa.html'));
});

app.get('/products/mini-u-shape-sofa.html', (req, res) => {
  console.log('Serving mini-u-shape-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'mini-u-shape-sofa.html'));
});

app.get('/products/salone-corner-sofa.html', (req, res) => {
  console.log('Serving salone-corner-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'salone-corner-sofa.html'));
});

app.get('/products/salone-3-2-sofa.html', (req, res) => {
  console.log('Serving salone-3-2-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'salone-3-2-sofa.html'));
});

app.get('/products/leather-corner-sofa.html', (req, res) => {
  console.log('Serving leather-corner-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'leather-corner-sofa.html'));
});

app.get('/products/leather-3-2-sofa.html', (req, res) => {
  console.log('Serving leather-3-2-sofa page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'leather-3-2-sofa.html'));
});

app.get('/products/dylan-arm-chair.html', (req, res) => {
  console.log('Serving dylan-arm-chair page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'dylan-arm-chair.html'));
});

app.get('/products/salone-arm-chair.html', (req, res) => {
  console.log('Serving salone-arm-chair page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'salone-arm-chair.html'));
});

app.get('/products/verona-arm-chair.html', (req, res) => {
  console.log('Serving verona-arm-chair page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'verona-arm-chair.html'));
});

app.get('/products/leather-recliner-arm-chair.html', (req, res) => {
  console.log('Serving leather-recliner-arm-chair page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'leather-recliner-arm-chair.html'));
});

app.get('/products/modern-sofabeds.html', (req, res) => {
  console.log('Serving modern-sofabeds page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'modern-sofabeds.html'));
});

// Fallback for other product pages (if any)
app.get('/products/:productName', (req, res) => {
  let productName = req.params.productName;
  
  // Remove .html extension if it exists in the URL
  if (productName.endsWith('.html')) {
    productName = productName.slice(0, -5);
  }
  
  const productFile = path.join(__dirname, 'views', 'products', `${productName}.html`);
  
  console.log(`Attempting to serve product page via fallback: ${productFile}`);
  console.log(`Does file exist? ${fs.existsSync(productFile)}`);
  
  // Check if the file exists
  if (fs.existsSync(productFile)) {
    console.log(`Serving product file via fallback: ${productFile}`);
    return res.sendFile(productFile);
  } else {
    console.log(`Product page not found: ${productFile}`);
    // Redirect to home page if product not found
    return res.redirect('/');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

// Catch all other routes and serve the index.html
// This should be the LAST route
app.get('*', (req, res) => {
  // Exclude API routes
  if (req.path.startsWith('/api/')) {
    console.log(`API route not found: ${req.path}`);
    return res.status(404).json({ error: 'API endpoint not found' });
  } 
  
  // Handle all other routes by serving the index.html
  console.log(`Catch-all route handling: ${req.path}`);
  return res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
