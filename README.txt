NotesHub Pro - Full Package
===========================

What's included:
- index.html (main UI)
- styles.css (professional styles + 3D logo + glowing heading + dark/light themes)
- app.js (Firebase auth (email+phone), admin-only upload, local IndexedDB storage, Firestore metadata optional)
- manifest.json (PWA)
- sw.js (service worker)
- README (this file)

Important steps for full functionality (Firebase):
1) Create a Firebase project at https://console.firebase.google.com/
2) Enable Authentication -> Sign-in methods:
   - Email/Password
   - Phone
3) Create an admin user (email) OR note the admin's phone number.
4) In app.js replace firebaseConfig values with your project's config.
5) Set ADMIN_EMAIL and/or ADMIN_PHONE in app.js to your admin identity.
6) (Optional) Create Firestore database (in test mode for now) to store note metadata.

How admin uploads work:
- Only users who sign in with the configured ADMIN_EMAIL or ADMIN_PHONE can upload.
- Uploads always save a local copy in IndexedDB for offline use.
- If Firebase Storage and Firestore are configured, files are uploaded to Storage and metadata stored in Firestore.

Hosting:
- Host on GitHub Pages or Netlify. For phone auth to work you must host on HTTPS (GitHub Pages is fine).

If you want, paste your firebaseConfig object here and I will embed it into the package and rezip for you (so you don't need to edit files manually).

Enjoy — I can now:
- Embed your firebaseConfig directly (if you paste it)
- Add custom 3D logo SVG you like
- Generate icons (192/512)
