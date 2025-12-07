// NotesHub Pro - App script
// - Firebase Email+Phone auth (placeholders)
// - Admin-only upload (ADMIN_EMAIL / ADMIN_PHONE)
// - IndexedDB local backup + Firestore metadata optional
// Replace firebaseConfig & ADMIN_EMAIL/ADMIN_PHONE below

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

// Admin identifiers (replace with your admin's email and/or phone)
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PHONE = "+911234567890";

let appFirebaseReady = false;
let auth, storage, db;

function initFirebase(){
  try{
    if (!firebaseConfig || firebaseConfig.apiKey.startsWith('REPLACE_ME')) {
      console.log('Firebase not configured - running in demo/local mode.');
      return;
    }
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    storage = firebase.storage();
    db = firebase.firestore();
    appFirebaseReady = true;
    console.log('Firebase initialized');
    setupAuthListener();
  }catch(e){ console.warn('Firebase init error', e); }
}

/* ---------- IndexedDB simple wrapper for local copies ---------- */
const IDB_NAME = 'noteshub-pro-db';
const STORE = 'notes';
let idb;
function openIDB(){
  return new Promise((res, rej)=>{
    const rq = indexedDB.open(IDB_NAME,1);
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    rq.onsuccess = ()=> res(rq.result);
    rq.onerror = ()=> rej(rq.error);
  });
}
async function idbAdd(item){
  const db = await openIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).add(item).onsuccess = ()=> res();
    tx.onerror = ()=> rej();
  });
}
async function idbGetAll(){
  const db = await openIDB();
  return new Promise(res=>{
    const tx = db.transaction(STORE,'readonly');
    tx.objectStore(STORE).getAll().onsuccess = e => res(e.target.result || []);
  });
}
async function idbClear(){
  const db = await openIDB();
  return new Promise(res=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = ()=> res();
  });
}

/* ---------- UI refs ---------- */
const UI = {
  modeToggle: document.getElementById('modeToggle'),
  openLogin: document.getElementById('openLogin'),
  loginModal: document.getElementById('loginModal'),
  closeLogin: document.getElementById('closeLogin'),
  emailSignup: document.getElementById('emailSignup'),
  emailLogin: document.getElementById('emailLogin'),
  emailInput: document.getElementById('email'),
  passInput: document.getElementById('password'),
  phoneInput: document.getElementById('phone'),
  sendOtp: document.getElementById('sendOtp'),
  verifyOtp: document.getElementById('verifyOtp'),
  otpCode: document.getElementById('otpCode'),
  tabEmail: document.querySelector('.tab[data-tab="email"]'),
  tabPhone: document.querySelector('.tab[data-tab="phone"]'),
  authMsg: document.getElementById('authMsg'),
  authArea: document.getElementById('authArea'),
  userInfo: document.getElementById('userInfo'),
  authButtons: document.getElementById('authButtons'),
  uploadForm: document.getElementById('uploadForm'),
  fileInput: document.getElementById('fileInput'),
  noteTitle: document.getElementById('noteTitle'),
  noteCategory: document.getElementById('noteCategory'),
  uploadStatus: document.getElementById('uploadStatus'),
  notesGrid: document.getElementById('notesGrid'),
  noteTpl: document.getElementById('noteCardTpl'),
  navUpload: document.getElementById('nav-upload'),
  navNotes: document.getElementById('nav-notes'),
  navHome: document.getElementById('nav-home'),
  navAdmin: document.getElementById('nav-admin'),
  views: {
    home: document.getElementById('homeView'),
    upload: document.getElementById('uploadView'),
    notes: document.getElementById('notesView'),
    admin: document.getElementById('adminView'),
  },
  exportBtn: document.getElementById('exportBtn'),
  clearBtn: document.getElementById('clearBtn'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
};

let currentUser = null;
let notes = [];

/* ---------- Theme ---------- */
const saved = localStorage.getItem('nh:theme');
if (saved === 'dark') document.body.classList.add('dark'), UI.modeToggle.checked = true;
UI.modeToggle.addEventListener('change', ()=>{
  document.body.classList.toggle('dark', UI.modeToggle.checked);
  localStorage.setItem('nh:theme', UI.modeToggle.checked ? 'dark' : 'light');
});

/* ---------- Navigation ---------- */
UI.navHome.addEventListener('click', ()=> showView('home'));
UI.navUpload.addEventListener('click', ()=> showView('upload'));
UI.navNotes.addEventListener('click', ()=> showView('notes'));
UI.navAdmin.addEventListener('click', ()=> showView('admin'));

function showView(v){
  Object.values(UI.views).forEach(el => el.classList.add('hidden'));
  UI.views[v].classList.remove('hidden');
}

/* ---------- Auth modal ---------- */
UI.openLogin.addEventListener('click', ()=> { UI.loginModal.classList.remove('hidden'); UI.loginModal.setAttribute('aria-hidden','false'); });
UI.closeLogin.addEventListener('click', ()=> { UI.loginModal.classList.add('hidden'); UI.loginModal.setAttribute('aria-hidden','true'); });

UI.tabEmail.addEventListener('click', ()=> switchTab('email'));
UI.tabPhone.addEventListener('click', ()=> switchTab('phone'));

function switchTab(t){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));
  document.querySelector('.tab[data-tab="'+t+'"]').classList.add('active');
  document.getElementById('tab-'+t).classList.remove('hidden');
}

/* ---------- Email signup/login ---------- */
UI.emailSignup.addEventListener('click', async ()=>{
  const email = UI.emailInput.value.trim();
  const pass = UI.passInput.value;
  if (!email || !pass) return UI.authMsg.textContent = 'Enter email & password';
  if (!appFirebaseReady) return UI.authMsg.textContent = 'Firebase not configured.';
  try{
    await auth.createUserWithEmailAndPassword(email, pass);
    UI.authMsg.textContent = 'Signup success';
  }catch(err){ UI.authMsg.textContent = err.message }
});
UI.emailLogin.addEventListener('click', async ()=>{
  const email = UI.emailInput.value.trim();
  const pass = UI.passInput.value;
  if (!email || !pass) return UI.authMsg.textContent = 'Enter email & password';
  if (!appFirebaseReady) return UI.authMsg.textContent = 'Firebase not configured.';
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    UI.authMsg.textContent = 'Logged in';
    UI.loginModal.classList.add('hidden');
  }catch(err){ UI.authMsg.textContent = err.message }
});

/* ---------- Phone auth (recaptcha) ---------- */
let verifier;
UI.sendOtp.addEventListener('click', async ()=>{
  const phone = UI.phoneInput.value.trim();
  if (!phone) return UI.authMsg.textContent = 'Enter phone';
  if (!appFirebaseReady) return UI.authMsg.textContent = 'Firebase not configured.';
  verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {size:'invisible'});
  try{
    const confirmation = await auth.signInWithPhoneNumber(phone, verifier);
    window._confirmation = confirmation;
    UI.authMsg.textContent = 'OTP sent';
  }catch(err){ UI.authMsg.textContent = err.message }
});
UI.verifyOtp.addEventListener('click', async ()=>{
  const code = UI.otpCode.value.trim();
  if (!code || !window._confirmation) return UI.authMsg.textContent = 'Enter OTP';
  try{
    await window._confirmation.confirm(code);
    UI.authMsg.textContent = 'Phone auth success';
    UI.loginModal.classList.add('hidden');
  }catch(err){ UI.authMsg.textContent = err.message }
});

/* ---------- Auth listener ---------- */
function setupAuthListener(){
  auth.onAuthStateChanged(u=>{
    currentUser = u;
    if (u){
      UI.userInfo.classList.remove('hide');
      UI.userInfo.textContent = u.email || u.phoneNumber || 'User';
      UI.authButtons.classList.add('hide');
      UI.userInfo.innerHTML = '<span>' + (u.email||u.phoneNumber) + '</span> <button id="signOut" class="btn">Sign out</button>';
      document.getElementById('signOut').addEventListener('click', ()=> auth.signOut());
      updateAdminState();
    } else {
      UI.authButtons.classList.remove('hide');
      UI.userInfo.classList.add('hide');
      UI.userInfo.textContent = '';
      updateAdminState();
    }
  });
}

/* ---------- Admin check ---------- */
function isAdmin(){
  if (!currentUser) return false;
  if (currentUser.email && currentUser.email.toLowerCase() === (ADMIN_EMAIL||'').toLowerCase()) return true;
  if (currentUser.phoneNumber && currentUser.phoneNumber === (ADMIN_PHONE||'')) return true;
  return false;
}
function updateAdminState(){
  const adminInfo = document.getElementById('adminInfo');
  if (isAdmin()){
    adminInfo.textContent = 'Logged in as Admin';
    document.getElementById('uploadForm').style.display = 'block';
  } else {
    adminInfo.textContent = 'Not logged in as admin.';
    document.getElementById('uploadForm').style.display = 'none';
  }
}

/* ---------- Upload flow (admin only) ---------- */
document.getElementById('uploadForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!isAdmin()){ alert('Only admin can upload.'); return; }
  const file = UI.fileInput.files[0];
  const title = UI.noteTitle.value.trim() || file.name;
  const category = UI.noteCategory.value.trim() || 'General';
  if (!file){ alert('Choose file'); return; }
  UI.uploadStatus.textContent = 'Uploading...';
  // store locally always
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    const ab = ev.target.result;
    await idbAdd({ title, category, filename: file.name, blob: Array.from(new Uint8Array(ab)), createdAt: Date.now() });
    // optional: upload to Firebase Storage
    if (appFirebaseReady && storage){
      try{
        const path = 'notes/' + Date.now() + '_' + file.name;
        const ref = storage.ref().child(path);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        // save metadata to Firestore
        if (db){
          await db.collection('notes').add({ title, category, filename: file.name, url, createdAt: Date.now() });
        }
        UI.uploadStatus.textContent = 'Uploaded to Firebase & saved locally';
      }catch(err){
        console.warn('Firebase upload failed', err);
        UI.uploadStatus.textContent = 'Saved locally; Firebase upload failed';
      }
    } else {
      UI.uploadStatus.textContent = 'Saved locally (no Firebase configured)';
    }
    loadNotes();
    UI.uploadForm.reset();
  };
  reader.readAsArrayBuffer(file);
});

/* ---------- Load notes from local DB and Firestore (if available) ---------- */
async function loadNotes(){
  notes = await idbGetAll();
  // fetch remote notes metadata from Firestore if available
  if (appFirebaseReady && db){
    try{
      const snap = await db.collection('notes').orderBy('createdAt','desc').get();
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data(), remote: true }));
      // merge remote metadata (we won't download blobs here)
      notes = notes.concat(remote);
    }catch(e){ console.warn('Fetch remote notes failed', e); }
  }
  renderNotes();
}

function renderNotes(){
  UI.notesGrid.innerHTML = '';
  if (!notes.length){ UI.notesGrid.innerHTML = '<p class="muted">No notes yet.</p>'; return; }
  const tpl = document.getElementById('noteCardTpl');
  notes.slice().reverse().forEach(n=>{
    const node = tpl.content.cloneNode(true);
    node.querySelector('.title').textContent = n.title || n.filename;
    node.querySelector('.meta').textContent = n.category + ' • ' + new Date((n.createdAt||Date.now())).toLocaleString();
    const dl = node.querySelector('.download');
    if (n.url){
      dl.href = n.url;
      dl.textContent = 'Download';
    } else if (n.blob){
      const arr = new Uint8Array(n.blob);
      const blob = new Blob([arr]);
      const url = URL.createObjectURL(blob);
      dl.href = url;
      dl.download = n.filename || 'file';
      dl.textContent = 'Download';
    } else {
      dl.remove();
    }
    UI.notesGrid.appendChild(node);
  });
}

/* ---------- Export / Clear ---------- */
UI.exportBtn.addEventListener('click', async ()=>{
  const all = await idbGetAll();
  const data = JSON.stringify(all);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notes_backup.json'; a.click(); a.remove();
});
UI.clearBtn.addEventListener('click', async ()=>{ if(confirm('Clear local DB?')){ await idbClear(); loadNotes(); } });

/* ---------- Init ---------- */
(async function init(){
  initFirebase();
  if (appFirebaseReady) setupAuthListener();
  // Even if firebase not ready, allow local DB usage and show login modal disabled
  loadNotes();
})();
