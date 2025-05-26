# The British Interiors

This is the website for The British Interiors, a furniture and interior design company.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open http://localhost:3000 in your browser

## Deployment to Railway

### Automatic Deployment

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js project and deploy it
3. Set environment variables if needed:
   - `NODE_ENV=production`
   - `PORT=3000` (Railway will override this with its own port)

### Manual Deployment

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login to Railway: `railway login`
3. Link to your project: `railway link`
4. Deploy: `railway up`

## Socket.IO Configuration

This application uses Socket.IO for real-time updates. The server is configured to work in both development and production environments.

### Troubleshooting Socket.IO Issues

If you experience connection issues with Socket.IO:

1. Check that the client is connecting to the correct server URL
2. Ensure CORS is properly configured for your domain
3. Check for any firewall or network restrictions
4. Verify that both websocket and polling transports are enabled

## Data Storage

Orders are stored in a JSON file in the `data` directory. In production, make sure this directory is writable.

## Admin Access

Admin login credentials:
- Username: shoaib
- Password: adminshabi896

## License

All rights reserved.

## Project Structure

- `server.js` - Express server to serve static files
- `views/` - Contains all HTML files
- `public/` - Contains static assets (CSS, JavaScript, images)

## Features

- Responsive design
- Product showcases
- WhatsApp contact button
- Image slider
- Smooth scrolling navigation

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Data Storage**: JSON
- **Dependencies**: 
  - Express.js (web framework)
  - Body-parser (request parsing)

## Future Enhancements

- User authentication
- Payment gateway integration
- Product search and filtering
- Inventory management
- Customer reviews
- Email notifications

## Acknowledgments

- Font Awesome for icons
- Placeholder images used in development 