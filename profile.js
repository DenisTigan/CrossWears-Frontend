document.addEventListener("DOMContentLoaded", () => {
    loadProfileData();

    const profileImg = document.getElementById('profile-image');
    if (profileImg) {
        profileImg.src = `${API_URL}/api/user/avatar`;
    }
});


// 1. Încărcare date profil (Afișează Nume, Email, Telefon, Adresă, Badge)
function loadProfileData() {
    const token = localStorage.getItem("userToken");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const authHeaders = { 'Authorization': 'Bearer ' + token };

    // 1. Prima cerere: Datele text ale profilului
    axios.get(`${API_URL}/api/user/me`, {
        headers: authHeaders
    })
    .then(res => {
        const user = res.data;
        
        // POPULARE INPUT-URI
        const fullNameInput = document.getElementById("edit-fullname");
        const emailInput = document.getElementById("edit-email");
        const phoneInput = document.getElementById("edit-phone");
        const addressInput = document.getElementById("edit-address");
        const newsletterCheck = document.getElementById("newsletter-status");
        const avatarName = document.getElementById("avatar-fullname-display");

        if(fullNameInput) fullNameInput.value = user.fullName || "";
        if(emailInput) emailInput.value = user.email || "";
        if(phoneInput) phoneInput.value = user.phoneNumber || "";
        if(addressInput) addressInput.value = user.defaultAddress || "";
        if(newsletterCheck) newsletterCheck.checked = user.newsletterSubscribed;
        
        if(avatarName) avatarName.innerText = user.fullName || "Utilizator";

        // BADGE CLIENT FIDEL
        if (user.orderCount >= 5) {
            const title = document.getElementById("profile-title");
            if (title && !title.innerHTML.includes("⭐")) {
                title.innerHTML += ' <span class="badge-fidel">⭐ Client Fidel</span>';
            }
        }

        // 2. A doua cerere: Imaginea de profil (Securizată)
        // Folosim responseType: 'blob' pentru a primi datele binare ale imaginii
        return axios.get(`${API_URL}/api/user/avatar`, {
            headers: authHeaders,
            responseType: 'blob'
        });
    })
    .then(imageResponse => {
        // Transformăm datele binare (Blob) într-un URL pe care browserul îl poate citi
        const imageObjectURL = URL.createObjectURL(imageResponse.data);
        const profileImg = document.getElementById("profile-image");
        if (profileImg) {
            profileImg.src = imageObjectURL;
        }
        
        if (window.lucide) lucide.createIcons();
    })
    .catch(err => {
        // Gestionare erori
        if (err.response && err.response.status === 403) {
            alert("Sesiunea a expirat. Te rugăm să te loghezi din nou.");
            window.location.href = "login.html";
            return;
        }

        // Dacă eroarea vine de la avatar (ex: utilizatorul nu are poză încă)
        // Punem placeholder-ul gri
        if (err.config && err.config.url.includes("avatar")) {
            const profileImg = document.getElementById("profile-image");
            if (profileImg) {
                profileImg.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            }
        }
        
        console.error("Eroare la încărcare profil:", err);
    });
}

// 2. SALVARE DATE (Nume, Telefon, Adresă)
function updateProfileInfo() {
    const token = localStorage.getItem("userToken");
    const data = {
        fullName: document.getElementById("edit-fullname").value,
        phoneNumber: document.getElementById("edit-phone").value,
        address: document.getElementById("edit-address").value
    };

    axios.put(`${API_URL}/api/user/update`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        alert("Modificările au fost salvate!");
        loadProfileData(); // Reîmprospătăm datele pe pagină
    })
    .catch(err => alert("Eroare la salvarea datelor."));
}

// 3. LOGICĂ AVATAR (Upload)
function triggerFileInput() {
    // Deschide fereastra de selecție fișier
    document.getElementById('hidden-avatar-input').click();
}

function uploadAvatarFile() {
    const fileInput = document.getElementById('hidden-avatar-input');
    if (!fileInput || fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    const token = localStorage.getItem("userToken");

    axios.post(`${API_URL}/api/user/upload-avatar`, formData, {
        headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data' 
        }
    })
    .then(res => {
        alert("Poza a fost actualizată!");
        
        // REPARAREA: În loc de refresh pagină, apelăm din nou funcția 
        // care cere poza de la server în mod securizat.
        loadProfileData(); 
    })
    .catch(err => {
        console.error("Eroare upload:", err);
        alert("Nu s-a putut încărca imaginea.");
    });
}


function toggleNewsletter() {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    // Trimitem cererea către noul endpoint sincronizat (cel cu @Transactional)
    axios.put(`${API_URL}/api/user/newsletter-toggle`, {}, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        console.log("Status newsletter actualizat în DB:", res.data);
    })
    .catch(err => {
        console.error("Eroare la schimbarea statusului:", err);
        // Dacă serverul dă eroare, întoarcem bifa la starea anterioară
        const check = document.getElementById("newsletter-status");
        check.checked = !check.checked;
        alert("Nu s-a putut actualiza preferința.");
    });
}

// 4. ALTE SETĂRI (Newsletter & Parolă)
function subscribeNewsletter() {
    const email = document.getElementById("footer-email").value;
    
    axios.post(`${API_URL}/api/newsletter/subscribe`, { email: email })
    .then(res => {
        alert("Te-ai abonat!");
        
        // Dacă suntem pe pagina de profil, reîncărcăm datele ca să vedem bifa pusă
        if (typeof loadProfileData === "function") {
            loadProfileData(); 
        }
    })
    .catch(err => console.error("Eroare la abonare:", err));
}

function changePassword() {
    const token = localStorage.getItem("userToken");
    const data = {
        oldPassword: document.getElementById("old-password").value,
        newPassword: document.getElementById("new-password").value
    };

    if(!data.oldPassword || !data.newPassword) {
        alert("Te rugăm să completezi ambele câmpuri de parolă.");
        return;
    }

    axios.put(`${API_URL}/api/user/change-password`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        alert("Parola a fost schimbată!");
        document.getElementById("old-password").value = "";
        document.getElementById("new-password").value = "";
    })
    .catch(err => alert(err.response?.data || "Eroare la schimbarea parolei."));
}

function removeAvatar() {
    if (!confirm("Ești sigur că vrei să ștergi poza de profil?")) return;

    const token = localStorage.getItem("userToken");
    
    axios.delete(`${API_URL}/api/user/delete-avatar`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        alert("Poza a fost ștearsă!");
        // Resetăm imaginea la placeholder-ul default
        document.getElementById("profile-image").src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    })
    .catch(err => alert("Eroare la ștergerea pozei."));
}