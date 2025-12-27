const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const container = document.getElementById("product-details");
const API_BASE = "http://localhost:8080/api";

// Variabilă globală pentru a ține minte ce produs vrem să ștergem
let productToDeleteId = null; 

// --- 1. INITIALIZARE ---
document.addEventListener("DOMContentLoaded", () => {
    if (!productId) {
        if(container) container.innerHTML = "<p style='text-align:center; color:red;'>Produsul nu a fost specificat.</p>";
    } else {
        loadProductDetails();
        loadSuggestions();
        loadReviews(productId);
        checkLoginStatusForReviews(); 
    }

    // --- CONFIGURARE POPUP ȘTERGERE ---
    setupDeletePopup();
});

// --- FUNCȚIE NOUĂ: LOGICA PENTRU POPUP ---
function setupDeletePopup() {
    const popup = document.getElementById("delete-popup");
    const confirmBtn = document.getElementById("confirm-delete");
    const cancelBtn = document.getElementById("cancel-delete");

    // 1. Butonul "NU" (Ascunde popup-ul)
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            popup.style.display = "none";
            productToDeleteId = null; // Resetăm ID-ul
        });
    }

    // 2. Butonul "DA" (Execută ștergerea)
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (productToDeleteId) {
                performDelete(productToDeleteId);
            }
        });
    }
}

// --- MODIFICARE: FUNCȚIA APELATĂ DIN HTML ---
// Aceasta doar DESCHIDE popup-ul, nu șterge nimic încă
function deleteProduct(id) {
    productToDeleteId = id; // Salvăm ID-ul ca să știm ce ștergem când apasă "DA"
    const popup = document.getElementById("delete-popup");
    if (popup) {
        popup.style.display = "flex"; // Arătăm popup-ul tău custom
    }
}

// --- FUNCȚIE NOUĂ: ȘTERGEREA EFECTIVĂ (AXIOS) ---
function performDelete(id) {
    const token = localStorage.getItem("userToken");
    const popup = document.getElementById("delete-popup");

    axios.delete(`${API_BASE}/product/${id}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        // Succes
        popup.style.display = "none"; // Ascundem popup
        alert("Produs șters cu succes!");
        window.location.href = "index.html"; // Redirect la home
    })
    .catch(err => {
        console.error(err);
        popup.style.display = "none"; // Ascundem popup
        alert("Eroare la ștergere! Verifică dacă ai permisiuni.");
    });
}

// --- 2. LOGICA DE LOGIN (UI - Ascunde/Arată formularul) ---
function checkLoginStatusForReviews() {
    const token = localStorage.getItem("userToken");
    const formContainer = document.getElementById("review-form-container");
    const guestMessage = document.getElementById("guest-review-message");

    if (token) {
        if(formContainer) formContainer.style.display = "block";
        if(guestMessage) guestMessage.style.display = "none";
    } else {
        if(formContainer) formContainer.style.display = "none";
        if(guestMessage) guestMessage.style.display = "block";
    }
}

// --- 3. LOGICA DE NOTARE (STELE FORMULAR) ---
function setRating(n) {
    const input = document.getElementById("ratingValue");
    if(input) input.value = n;
    
    const stars = document.querySelectorAll(".star-rating .star");
    stars.forEach((star, index) => {
        star.style.color = (index < n) ? "#FFD700" : "#ccc";
    });
}

// --- 4. TRIMITE RECENZIA ---
function submitReview() {
    const token = localStorage.getItem("userToken");
    const userName = localStorage.getItem("userName") || "Anonim"; 

    if (!token) {
        alert("Trebuie să fii logat!");
        window.location.href = "login.html";
        return;
    }

    const content = document.getElementById("reviewContent").value;
    const rating = document.getElementById("ratingValue").value;

    if(!content.trim()) {
        alert("Te rugăm să scrii un mesaj!");
        return;
    }

    const data = {
        productId: parseInt(productId),
        content: content,
        rating: parseInt(rating),
        name: userName 
    };

    axios.post(`${API_BASE}/reviews/add`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        alert("Recenzie adăugată!");
        location.reload(); 
    })
    .catch(err => {
        console.error("Eroare postare:", err);
        alert("Eroare la trimiterea recenziei.");
    });
}

function checkIfFavorite(id) {
    const token = localStorage.getItem("userToken");
    if (!token) return; 

    axios.get(`${API_BASE}/favorites/check/${id}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (res.data === true) {
            const icon = document.getElementById(`fav-icon-${id}`);
            if (icon) icon.classList.add("active"); 
        }
    })
    .catch(console.error);
}

function toggleFavorite(event, id, iconElement) {
    event.stopPropagation(); 
    event.preventDefault();

    const token = localStorage.getItem("userToken");
    if (!token) {
        alert("Trebuie să fii logat pentru a salva produse!");
        return;
    }

    // Mică animație
    iconElement.style.transform = "scale(0.8)";
    setTimeout(() => iconElement.style.transform = "scale(1)", 200);

    axios.post(`${API_BASE}/favorites/toggle/${id}`, {}, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (res.data === "Added") {
            iconElement.classList.add("active"); 
        } else {
            iconElement.classList.remove("active"); 
        }
    })
    .catch(err => {
        console.error(err);
        alert("Eroare la salvare.");
    });
}


// --- 5. ÎNCĂRCARE DETALII PRODUS (CU BUTOANE DE ADMIN) ---
function loadProductDetails() {
    const imageUrl = `${API_BASE}/product/${productId}/image`;

    axios.get(`${API_BASE}/product/${productId}`)
        .then(response => {
            const p = response.data;
            const quantity = p.quantity ?? 0;
            const isAvailable = (p.available === true) && (quantity > 0);

            // Verificăm rolul
            const role = localStorage.getItem("userRole");
            let adminButtons = "";

            // Dacă e admin, folosim CLASE CSS, nu stiluri inline
            if (role === "ROLE_ADMIN") {
                // NOTA: Aici butonul delete apelează deleteProduct(ID), care acum deschide POPUP-ul
                adminButtons = `
                    <div class="admin-actions-container">
                        <span class="admin-label">Admin Zone:</span>
                        <a href="updateProduct.html?id=${p.productId}" class="btn-update-product">
                            <i class="fas fa-edit"></i> Editează Produsul
                        </a>
                        <button onclick="deleteProduct(${p.productId})" class="btn-delete-product">
                            <i class="fas fa-trash-alt"></i> Șterge Produsul
                        </button>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="singleprod-wrapper">
                    <div class="singleprod-left" style="position: relative;"> 
                        
                        <i class="fas fa-heart heart-icon" 
                           style="top: 20px; right: 20px; font-size: 2rem;"
                           onclick="toggleFavorite(event, ${p.productId}, this)" 
                           id="fav-icon-${p.productId}">
                        </i>

                        <img src="${imageUrl}" alt="${p.productName}" class="singleprod-img" onerror="this.src='placeholder.jpg'">
                    </div>
                    <div class="singleprod-right">
                        <h1 class="singleprod-title">${p.productName}</h1>
                        <p class="singleprod-desc">${p.productDescription}</p>
                        <h2 class="singleprod-price">${p.productPrice} RON</h2>
                        <p class="singleprod-stock">Stoc disponibil: <strong>${quantity}</strong></p>
                        
                        <div class="singleprod-action">
                            ${isAvailable 
                                ? `<button class="singleprod-btn-add" onclick="addToCart(${p.productId})">Adaugă în coș</button>` 
                                : `<button class="singleprod-btn-out" disabled>Stoc epuizat</button>`
                            }
                        </div>

                        ${adminButtons}
                    </div>
                </div>
            `;

            checkIfFavorite(p.productId);
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = `<p style="color:red; text-align:center;">Produsul nu a fost găsit.</p>`;
        });
}

// --- 7. ÎNCĂRCARE LISTA RECENZII ---
function loadReviews(prodId) {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    const currentUser = localStorage.getItem("userName");
    const role = localStorage.getItem("userRole");

    axios.get(`${API_BASE}/reviews/product/${prodId}`)
        .then(response => {
            const reviews = response.data;
            list.innerHTML = '';

            if (reviews.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:#777;">Fii primul care lasă o recenzie!</p>';
                return;
            }

            reviews.forEach(r => {
                let displayStars = '';
                for (let i = 1; i <= 5; i++) {
                    displayStars += i <= r.rating ? '&#9733;' : '&#9734;';
                }

                let editStarsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    let colorStyle = i <= r.rating ? 'color: #FFD700;' : 'color: #ccc;';
                    editStarsHtml += `<span class="star edit-star-${r.id}" style="cursor:pointer; font-size:24px; ${colorStyle}" onclick="setEditRating(${r.id}, ${i})">&#9733;</span>`;
                }

                const dateString = r.createdAt ? new Date(r.createdAt).toLocaleDateString("ro-RO") : "";

                const isOwner = (currentUser && r.reviewerName === currentUser);
                const isAdmin = (role === "ROLE_ADMIN");

                let actionButtons = "";
                
                if (isOwner || isAdmin) {
                    actionButtons = `
                        <div class="review-actions">
                            <button onclick="enableEditMode(${r.id})" class="btn-icon edit" title="Editează"><i class="fas fa-pen"></i></button>
                            <button onclick="deleteReview(${r.id})" class="btn-icon delete" title="Șterge"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }

                const item = `
                    <div class="review-card" id="review-card-${r.id}">
                        <div class="review-header">
                            <div>
                                <span class="review-author">${r.reviewerName || "Anonim"}</span>
                                <span class="review-stars" id="display-stars-${r.id}">${displayStars}</span>
                            </div>
                            ${actionButtons}
                        </div>
                        <div class="review-body">
                            <p id="content-text-${r.id}">${r.content}</p>
                            
                            <div id="edit-form-${r.id}" style="display: none;" class="inline-edit-box">
                                <div class="edit-stars-container">
                                    <label>Noua notă:</label> ${editStarsHtml}
                                    <input type="hidden" id="edit-rating-input-${r.id}" value="${r.rating}">
                                </div>
                                <textarea id="edit-input-${r.id}" style="width:100%; margin:10px 0;">${r.content}</textarea>
                                <div class="edit-buttons">
                                    <button onclick="saveEdit(${r.id})" class="btn-small save">Salvează</button>
                                    <button onclick="cancelEdit(${r.id})" class="btn-small cancel">Anulează</button>
                                </div>
                            </div>
                        </div>
                        <small class="review-date">${dateString}</small>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', item);
            });
        })
        .catch(err => console.error(err));
}

// --- 8. SUGGESTIONS, EDITARE RECENZII & CART ---
// (Restul funcțiilor au rămas neschimbate, le poți păstra pe cele din codul anterior 
// sau pot adăuga tot blocul dacă ai nevoie, dar modificarea principală este mai sus la deleteProduct și setupDeletePopup)

function loadSuggestions() {
    const suggestionsContainer = document.getElementById("suggestions-section");
    if (suggestionsContainer) {
        axios.get(`${API_BASE}/product/${productId}/suggestions`)
            .then(response => {
                const suggestions = response.data;
                if (suggestions.length === 0) return;
                let htmlContent = `<h3><span style="background:#f4f6f9; padding:0 15px;">S-ar putea să îți placă:</span></h3><div class="suggestions-grid">`;
                suggestions.forEach(s => {
                    htmlContent += `
                        <a href="product.html?id=${s.productId}" class="suggestion-card">
                            <div class="suggestion-img-wrapper"><img src="${API_BASE}/product/${s.productId}/image" onerror="this.src='placeholder.jpg'"></div>
                            <div class="suggestion-info"><h4>${s.productName}</h4><p>${s.productPrice} RON</p></div>
                        </a>`;
                });
                htmlContent += `</div>`;
                suggestionsContainer.innerHTML = htmlContent;
            }).catch(e => console.error(e));
    }
}

function deleteReview(reviewId) {
    if (confirm("Ești sigur că vrei să ștergi această recenzie?")) {
        const token = localStorage.getItem("userToken"); 
        axios.delete(`${API_BASE}/reviews/delete/${reviewId}`, {
             headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(() => {
            const card = document.getElementById(`review-card-${reviewId}`);
            if (card) card.remove();
        })
        .catch(err => alert("Eroare la ștergere (Nu ai permisiunea sau a apărut o eroare)."));
    }
}

function enableEditMode(id) {
    document.getElementById(`content-text-${id}`).style.display = 'none';
    document.getElementById(`edit-form-${id}`).style.display = 'block';
}

function cancelEdit(id) {
    document.getElementById(`content-text-${id}`).style.display = 'block';
    document.getElementById(`edit-form-${id}`).style.display = 'none';
}

function setEditRating(reviewId, value) {
    const input = document.getElementById(`edit-rating-input-${reviewId}`);
    if (input) input.value = value;
    const stars = document.querySelectorAll(`.edit-star-${reviewId}`);
    stars.forEach((star, index) => {
        star.style.color = (index + 1 <= value) ? '#FFD700' : '#ccc';
    });
}

function saveEdit(id) {
    const token = localStorage.getItem("userToken");
    const newContent = document.getElementById(`edit-input-${id}`).value;
    const newRating = document.getElementById(`edit-rating-input-${id}`).value;

    const data = {
        content: newContent,
        rating: parseInt(newRating),
        productId: 0, 
        name: ""
    };

    axios.put(`${API_BASE}/reviews/update/${id}`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        loadReviews(productId); 
    })
    .catch(err => {
        console.error(err);
        alert("Eroare la actualizare!");
    });
}

function addToCart(id) {
    console.log("Add to cart:", id);
    alert("Adăugat în coș!");
}