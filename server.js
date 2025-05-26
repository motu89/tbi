const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS for production
const io = socketIO(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? [
      "https://tbi.up.railway.app",
      "https://the-british-interiors.up.railway.app",
      "https://the-british-interiors.railway.app"
    ] : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Notify client that connection is established
  socket.emit('connection-established', { message: 'Connected to server' });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Log environment
console.log(`Running in ${process.env.NODE_ENV || 'development'} environment`);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration with secure cookies in production
const sessionConfig = {
  secret: 'british-interiors-admin-secret',
  resave: true, // Changed to true to ensure session is saved on each request
  saveUninitialized: true, // Changed to true to create session for all users
  cookie: { 
    maxAge: 86400000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

// In production, use secure cookies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

app.use(session(sessionConfig));

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

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  } catch (dirError) {
    console.error('Error creating data directory:', dirError);
    console.log('Will use in-memory storage only');
  }
}

// Initialize orders from file system
try {
  const ordersFilePath = path.join(dataDir, 'orders.json');
  
  // Load orders from file or initialize with empty array
  if (fs.existsSync(ordersFilePath)) {
    try {
      const data = fs.readFileSync(ordersFilePath, 'utf8');
      orders = JSON.parse(data);
      console.log(`Loaded ${orders.length} orders from file`);
    } catch (readError) {
      console.error('Error reading orders file:', readError);
      console.log('Using empty orders array due to file read error');
      orders = [];
    }
  } else {
    // Initialize with empty array and create the file
    try {
      fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
      console.log('Created new orders file');
    } catch (writeError) {
      console.error('Error creating orders file:', writeError);
      console.log('Will use in-memory orders only');
    }
  }
} catch (error) {
  console.error('Error initializing orders system:', error);
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
  
  // Emit real-time event for new/updated order
  io.emit('new-order', {
    order: orderData,
    isNew: existingOrderIndex < 0,
    timestamp: new Date().toISOString()
  });
  
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
  
  // Emit real-time event for deleted order
  io.emit('order-deleted', {
    orderId: orderId,
    timestamp: new Date().toISOString()
  });
  
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
  
  // Emit real-time event for updated order
  io.emit('order-updated', {
    order: orders[orderIndex],
    orderId: orderId,
    changes: updateData,
    timestamp: new Date().toISOString()
  });
  
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

// Basket page route - must be before the generic product route
app.get(['/products/basket', '/products/basket.html'], (req, res) => {
  console.log('Serving basket page');
  res.sendFile(path.join(__dirname, 'views', 'products', 'basket.html'));
});

// Product pages route - high priority
app.get('/products/:productName', (req, res) => {
  let productName = req.params.productName;
  
  // Remove .html extension if it exists in the URL
  if (productName.endsWith('.html')) {
    productName = productName.slice(0, -5);
  }
  
  const productFile = path.join(__dirname, 'views', 'products', `${productName}.html`);
  
  console.log(`Attempting to serve product page: ${productFile}`);
  console.log(`Does file exist? ${fs.existsSync(productFile)}`);
  
  // Check if the file exists
  if (fs.existsSync(productFile)) {
    console.log(`Serving product file: ${productFile}`);
    return res.sendFile(productFile);
  } else {
    console.log(`Product page not found: ${productFile}`);
    // Try to send a 404 page, or fall back to index if 404 doesn't exist
    const notFoundPage = path.join(__dirname, 'views', '404.html');
    if (fs.existsSync(notFoundPage)) {
      console.log(`Serving 404 page: ${notFoundPage}`);
      return res.status(404).sendFile(notFoundPage);
    } else {
      console.log(`Serving index page as fallback`);
      return res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep server running despite the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep server running despite the error
});

// Catch all other routes and serve the index.html
// This should be the LAST route
app.get('*', (req, res, next) => {
  // Exclude API routes
  if (req.path.startsWith('/api/')) {
    console.log(`API route not found: ${req.path}`);
    return res.status(404).json({ error: 'API endpoint not found' });
  } 
  
  // Handle all other routes by serving the index.html
  console.log(`Catch-all route handling: ${req.path}`);
  return res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// The following is a sample <script> block to add to admin.html for Socket.IO integration
/* 
<script src="/socket.io/socket.io.js"></script>
<script>
  // Connect to Socket.IO server
  const socket = io();
  
  // Event: Connection established
  socket.on('connection-established', (data) => {
    console.log('Connected to server:', data.message);
  });
  
  // Event: New order received
  socket.on('new-order', (data) => {
    console.log('New order received:', data.order);
    
    // Play notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.play();
    
    // Show toast notification
    showToast(`New order received from ${data.order.name}!`, false);
    
    // Reload orders if we're on the admin page
    if (typeof loadOrders === 'function') {
      loadOrders();
    }
  });
  
  // Event: Order updated
  socket.on('order-updated', (data) => {
    console.log('Order updated:', data.order);
    
    // Reload orders if we're on the admin page
    if (typeof loadOrders === 'function') {
      loadOrders();
    }
  });
  
  // Event: Order deleted
  socket.on('order-deleted', (data) => {
    console.log('Order deleted:', data.orderId);
    
    // Reload orders if we're on the admin page
    if (typeof loadOrders === 'function') {
      loadOrders();
    }
  });
</script>
*/
