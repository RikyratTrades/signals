// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDU1AQULSP_-GHlv4hAjgf8dnlcQ_xd4mc",
    authDomain: "e-ride-b2928.firebaseapp.com",
    projectId: "e-ride-b2928",
    storageBucket: "e-ride-b2928.appspot.com",
    messagingSenderId: "766360236907",
    appId: "1:766360236907:web:a17ba4bc96703ead22922e"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized, use that one
}

// Initialize Firestore and Storage
var db = firebase.firestore();
var storage = firebase.storage(); // Initialize Firebase Storage

// Function to show toast notifications
function showToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "right",
        backgroundColor: "#1e3a8a",
        borderRadius: "8px",
        style: {
            fontSize: "14px",
            padding: "10px",
        }
    }).showToast();
}

// Function to switch between tabs
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Handle form submission for new signals
document.getElementById('signalForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    var formData = new FormData(this);
    var signal = Object.fromEntries(formData);

    // Add timestamp
    signal.timestamp = new Date().toISOString();

    // Handle image upload
    var imageFile = document.getElementById('image').files[0];
    if (imageFile) {
        var storageRef = storage.ref();
        var imageRef = storageRef.child('signals/' + imageFile.name);

        try {
            var snapshot = await imageRef.put(imageFile);
            var imageUrl = await snapshot.ref.getDownloadURL();
            signal.image = imageUrl; // Store the image URL in Firestore

            await db.collection('signals').add(signal);
            showToast('Signal successfully submitted!');
            this.reset();
            showTab('viewSignals');
            loadSignals(); // Reload signals after adding a new one
        } catch (error) {
            console.error('Error uploading image or adding signal: ', error);
            showToast('Error submitting signal.');
        }
    } else {
        // If no image is uploaded, proceed without the image
        signal.image = ''; // Or handle it as needed
        try {
            await db.collection('signals').add(signal);
            showToast('Signal successfully submitted!');
            this.reset();
            showTab('viewSignals');
            loadSignals(); // Reload signals after adding a new one
        } catch (error) {
            console.error('Error adding signal: ', error);
        }
    }
});

// Fetch signals from Firestore and update the feed
async function loadSignals() {
    var signalsFeed = document.getElementById('signalsFeed');
    signalsFeed.innerHTML = '';

    try {
        var snapshot = await db.collection('signals').orderBy('timestamp', 'desc').get();
        var authors = new Set();
        var models = new Set();
        var currencies = new Set();
        snapshot.forEach(doc => {
            var signal = doc.data();
            var card = document.createElement('div');
            card.className = 'signal-card';

            var time = new Date(signal.timestamp).toLocaleString();

            card.innerHTML = `
                <h3>${signal.signalName}</h3>
                <p><strong>Currency Pair / Asset:</strong> ${signal.currencyPair}</p>
                ${signal.image ? `<img src="${signal.image}" alt="Signal Image">` : ''}
                <p><strong>Reasoning:</strong> ${signal.reasoning}</p>
                <p><strong>Model:</strong> ${signal.model}</p>
                <p><strong>Risk-to-Reward Ratio:</strong> ${signal.riskReward}</p>
                <p><strong>Trade Taken:</strong> ${signal.tradeTaken}</p>
                <p><strong>Submitted On:</strong> ${time}</p>
                ${signal.status ? `<p><strong>Status:</strong> ${signal.status}</p>` : ''}
                ${signal.updateReasoning ? `<p><strong>Update Reasoning:</strong> ${signal.updateReasoning}</p>` : ''}
                <p><strong>Submitted by:</strong> ${signal.author}</p>
            `;
            signalsFeed.appendChild(card);

            authors.add(signal.author);
            models.add(signal.model);
            currencies.add(signal.currencyPair);
        });

        populateFilters([...authors], [...models], [...currencies]);
    } catch (error) {
        console.error('Error loading signals: ', error);
    }
}

// Populate filter options
function populateFilters(authors, models, currencies) {
    var filterAuthor = document.getElementById('filterAuthor');
    var filterModel = document.getElementById('filterModel');
    var filterCurrency = document.getElementById('filterCurrency');

    filterAuthor.innerHTML = '<option value="">All</option>';
    filterModel.innerHTML = '<option value="">All</option>';
    filterCurrency.innerHTML = '<option value="">All</option>';

    authors.forEach(author => {
        var option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        filterAuthor.appendChild(option);
    });

    models.forEach(model => {
        var option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        filterModel.appendChild(option);
    });

    currencies.forEach(currency => {
        var option = document.createElement('option');
        option.value = currency;
        option.textContent = currency;
        filterCurrency.appendChild(option);
    });
}

// Handle form submission for updating signals
document.getElementById('updateForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    var signalId = document.getElementById('signalId').value;
    var status = document.getElementById('status').value;
    var updateReasoning = document.getElementById('updateReasoning').value;

    try {
        var signalRef = db.collection('signals').doc(signalId);
        await signalRef.update({
            status: status,
            updateReasoning: updateReasoning,
        });
        showToast('Signal successfully updated!');
        this.reset();
        showTab('viewSignals');
        loadSignals(); // Reload signals after updating one
    } catch (error) {
        console.error('Error updating signal: ', error);
    }
});

// Filter signals based on selected criteria
document.getElementById('filterForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    var filterAuthor = document.getElementById('filterAuthor').value;
    var filterModel = document.getElementById('filterModel').value;
    var filterCurrency = document.getElementById('filterCurrency').value;

    var query = db.collection('signals').orderBy('timestamp', 'desc');

    if (filterAuthor) {
        query = query.where('author', '==', filterAuthor);
    }
    if (filterModel) {
        query = query.where('model', '==', filterModel);
    }
    if (filterCurrency) {
        query = query.where('currencyPair', '==', filterCurrency);
    }

    try {
        var snapshot = await query.get();
        var signalsFeed = document.getElementById('signalsFeed');
        signalsFeed.innerHTML = '';

        snapshot.forEach(doc => {
            var signal = doc.data();
            var card = document.createElement('div');
            card.className = 'signal-card';

            var time = new Date(signal.timestamp).toLocaleString();

            card.innerHTML = `
                <h3>${signal.signalName}</h3>
                <p><strong>Currency Pair / Asset:</strong> ${signal.currencyPair}</p>
                ${signal.image ? `<img src="${signal.image}" alt="Signal Image">` : ''}
                <p><strong>Reasoning:</strong> ${signal.reasoning}</p>
                <p><strong>Model:</strong> ${signal.model}</p>
                <p><strong>Risk-to-Reward Ratio:</strong> ${signal.riskReward}</p>
                <p><strong>Trade Taken:</strong> ${signal.tradeTaken}</p>
                <p><strong>Submitted On:</strong> ${time}</p>
                ${signal.status ? `<p><strong>Status:</strong> ${signal.status}</p>` : ''}
                ${signal.updateReasoning ? `<p><strong>Update Reasoning:</strong> ${signal.updateReasoning}</p>` : ''}
                <p><strong>Submitted by:</strong> ${signal.author}</p>
            `;
            signalsFeed.appendChild(card);
        });

        showToast('Filter applied successfully!');
    } catch (error) {
        console.error('Error applying filter: ', error);
    }
});

// Load signals on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSignals();
    // Show the 'viewSignals' tab by default
    showTab('viewSignals');
});

// Handle filter modal visibility
document.getElementById('filterButton').addEventListener('click', () => {
    document.getElementById('filterModal').style.display = 'block';
});

document.getElementById('modalCloseButton').addEventListener('click', () => {
    document.getElementById('filterModal').style.display = 'none';
});
