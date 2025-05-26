# Firebase Integration for The British Interiors

This guide explains how to set up and configure Firebase for real-time order tracking in The British Interiors website.

## Prerequisites

1. A Google account
2. The British Interiors website codebase
3. Node.js and npm installed

## Firebase Setup Steps

### Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name your project (e.g., "thebritishinteriors")
4. Follow the setup wizard to create your project

### Step 2: Set Up Firestore Database

1. In your Firebase project, navigate to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in production mode (or test mode for development)
4. Choose a location closest to your users (e.g., europe-west1)
5. Click "Enable"

### Step 3: Create Service Account for Backend

1. Go to Project Settings (gear icon) > Service accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` in the root of your project

### Step 4: Configure Security Rules

1. In Firestore Database, click on the "Rules" tab
2. Update the rules to allow authenticated access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      // Allow read/write for authenticated admin users
      allow read, write: if request.auth != null;
      // For testing, you can temporarily use this rule:
      // allow read, write: if true;
    }
  }
}
```

## Configuration in Your Project

### Step 1: Verify Service Account File

Ensure the `firebase-service-account.json` file is in the root directory of your project. The server will load this file to authenticate with Firebase.

### Step 2: Test Firebase Integration

1. Start your server: `npm start`
2. Place a test order from the website
3. Check the Firestore Database in Firebase Console to see if the order appears
4. Check the admin panel to see if real-time updates work

## Troubleshooting

### Common Issues:

1. **CORS Errors**: If you see CORS errors, ensure your Firebase security rules allow access from your domain.

2. **Authentication Errors**: If you see "Firebase: Error (auth/...)" errors:
   - Verify your service account file is correctly placed
   - Check that your API keys are correct in the client-side code

3. **Missing Orders**: If orders aren't showing up in Firestore:
   - Check browser console for JavaScript errors
   - Verify network requests in browser developer tools
   - Ensure the order has required fields (name, contact, address)

## Security Considerations

- Never commit your `firebase-service-account.json` file to public repositories
- Add it to your `.gitignore` file
- For production, consider using environment variables for Firebase configuration 