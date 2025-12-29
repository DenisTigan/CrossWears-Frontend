const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const container = document.getElementById("product-details");
const API_BASE = "http://localhost:8080/api";

// Starea Globală
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let productToDeleteId = null;

const PLACEHOLDER = "https://placehold.co/600x700?text=CrossWears";

// =========================================================
// 1. INIȚIALIZARE
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!productId) {
        if(container) container.innerHTML = "<p style='text-align:center; padding:50px;'>Produs nespecificat.</p>";
    } else {
        loadProductDetails();
        loadSuggestions();
        loadReviews(productId);
        checkLoginStatusForReviews(); 
    }
    setupDeletePopup(); // Configurează Popup-ul tău de confirmare
});

function loadProductDetails() {
    axios.get(`${API_BASE}/product/${productId}`)
        .then(res => {
            currentProduct = res.data;
            renderProductUI();
            checkIfFavorite(currentProduct.productId);
        })
        .catch(err => console.error("Eroare la încărcare:", err));
}

// =========================================================
// 2. RANDARE UI (Integrat cu Variante și Admin)
// =========================================================
function renderProductUI() {
    const p = currentProduct;
    const role = localStorage.getItem("userRole");
    // Extragem culorile unice
    const uniqueColors = [...new Set(p.variants.map(v => v.color))];

    let adminButtons = "";
    if (role === "ROLE_ADMIN") {
        adminButtons = `
            <div class="admin-control-panel">
                <div class="admin-panel-header"><i class="fas fa-shield-alt"></i> Panou Administrator</div>
                <div class="admin-actions-flex">
                    <a href="updateProduct.html?id=${p.productId}" class="btn-admin btn-admin-edit">
                        <i class="fas fa-edit"></i> Editează Datele
                    </a>
                    <button onclick="deleteProduct(${p.productId})" class="btn-admin btn-admin-delete">
                        <i class="fas fa-trash-alt"></i> Șterge Produsul
                    </button>
                </div>
            </div>`;
    }

    container.innerHTML = `
        <div class="singleprod-wrapper">
            <div class="singleprod-left"> 
                <div class="heart-icon" onclick="toggleFavorite(event, ${p.productId}, this)" id="fav-icon-${p.productId}"><i class="fas fa-heart"></i></div>
                <div class="main-image-container"><img id="main-product-img" src="${PLACEHOLDER}" class="singleprod-img"></div>
                <div id="product-thumbnails" class="thumbnails-flex"></div>
            </div>
            
            <div class="singleprod-right">
                <h1 class="singleprod-title">${p.productName}</h1>
                <p class="singleprod-desc">${p.productDescription}</p>
                <h2 class="singleprod-price">${p.productPrice} RON</h2>
                
                <div class="selection-container">
                    <p class="select-label">Alege Culoarea:</p>
                    <div class="options-grid">
                        ${uniqueColors.map(c => `<button class="variant-btn color-option" onclick="handleColorSelect('${c}', this)">${c}</button>`).join('')}
                    </div>
                    <p class="select-label">Alege Mărimea:</p>
                    <div id="size-options-container" class="options-grid">
                        <span style="font-size:13px; color:#999;">Selectează culoarea mai întâi...</span>
                    </div>
                </div>

                <button id="add-to-cart-btn" class="singleprod-btn-add" onclick="processAddToCart()" disabled>Selectează Opțiunile</button>
                ${adminButtons}
            </div>
        </div>`;

    if(uniqueColors.length > 0) handleColorSelect(uniqueColors[0], document.querySelector('.color-option'));
}

// =========================================================
// 3. LOGICĂ VARIANTE (GALERIE ȘI STOC)
// =========================================================
function handleColorSelect(color, btn) {
    selectedColor = color;
    selectedSize = null; 
    document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // FIX: Normalizăm culorile pentru a ignora majusculele
    const normalizedTarget = color.toLowerCase();

    // Filtrare: Căutăm poze care coincid SAU sunt 'GENERAL'
    const colorImages = currentProduct.images.filter(img => {
        const imgColor = (img.color || "").toLowerCase();
        return imgColor === normalizedTarget || imgColor === 'general';
    });

    const mainImg = document.getElementById('main-product-img');
    const thumbContainer = document.getElementById('product-thumbnails');

    if(colorImages.length > 0) {
        mainImg.src = `${API_BASE}/product/image/${colorImages[0].imageId}`;
        thumbContainer.innerHTML = colorImages.map(img => `
            <img src="${API_BASE}/product/image/${img.imageId}" onclick="document.getElementById('main-product-img').src=this.src" class="thumb-img-item">
        `).join('');
    } else {
        mainImg.src = PLACEHOLDER; // Fallback dacă nu există poze deloc
    }

    // Update Mărimi
    const sizes = currentProduct.variants.filter(v => v.color.toLowerCase() === normalizedTarget && v.quantity > 0);
    const sizeContainer = document.getElementById('size-options-container');
    
    if(sizes.length > 0) {
        sizeContainer.innerHTML = sizes.map(v => `<button class="variant-btn size-option" onclick="handleSizeSelect('${v.size}', this)">${v.size}</button>`).join('');
    } else {
        sizeContainer.innerHTML = '<p class="out-of-stock-msg">Stoc epuizat pentru această culoare.</p>';
    }
    updateCartButton();
}

function handleSizeSelect(size, btn) {
    selectedSize = size;
    document.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCartButton();
}

function updateCartButton() {
    const btn = document.getElementById('add-to-cart-btn');
    if (!btn) return;

    // 1. Verificăm dacă produsul a fost marcat ca indisponibil din Admin
    if (currentProduct.available === false) {
        btn.disabled = true;
        btn.innerText = "Stoc epuizat";
        btn.classList.remove('ready');
        btn.style.opacity = "0.6"; // Opțional, pentru feedback vizual
        return;
    }

    // 2. Dacă este disponibil, verificăm dacă utilizatorul a ales opțiunile
    if (selectedColor && selectedSize) {
        btn.disabled = false;
        btn.innerText = "Adaugă în coș";
        btn.classList.add('ready');
        btn.style.opacity = "1";
    } else {
        btn.disabled = true;
        btn.innerText = "Alege mărimea";
        btn.classList.remove('ready');
        btn.style.opacity = "1";
    }
}


// =========================================================
// 4. LOGICĂ RECENZII (FIX ANIMAȚIE ȘI ȘTERGERE)
// =========================================================
function setRating(n) {
    document.getElementById("ratingValue").value = n;
    const stars = document.querySelectorAll(".star-rating .star");
    stars.forEach(s => s.classList.remove("selected"));
    
    // FIX INDEX: n=5 -> index 0 (datorită row-reverse)
    const targetIndex = 5 - n; 
    if(stars[targetIndex]) stars[targetIndex].classList.add("selected");
}

function loadReviews(prodId) {
    const list = document.getElementById('reviews-list');
    const currentUser = localStorage.getItem("userName");
    const role = localStorage.getItem("userRole");

    axios.get(`${API_BASE}/reviews/product/${prodId}`).then(res => {
        const reviews = res.data;
        list.innerHTML = reviews.length === 0 ? '<p style="text-align:center; color:#999;">Fii primul care lasă o recenzie!</p>' : '';
        
        reviews.forEach(r => {
            let starsStr = '&#9733;'.repeat(r.rating) + '&#9734;'.repeat(5 - r.rating);
            const isOwner = (currentUser && r.reviewerName === currentUser);
            const isAdmin = (role === "ROLE_ADMIN");

            list.insertAdjacentHTML('beforeend', `
                <div class="review-card" id="review-card-${r.id}">
                    <div class="review-header">
                        <div>
                            <span class="review-author">${r.reviewerName || "Utilizator"}</span>
                            <span style="color:#FFD700; margin-left:10px;">${starsStr}</span>
                        </div>
                        ${(isOwner || isAdmin) ? `
                        <div class="review-actions">
                            <button onclick="enableEditMode(${r.id})" class="btn-icon edit" title="Editează"><i class="fas fa-pen"></i></button>
                            <button onclick="deleteReview(${r.id})" class="btn-icon delete" title="Șterge"><i class="fas fa-trash"></i></button>
                        </div>` : ''}
                    </div>
                    <div class="review-body">
                        <p id="content-text-${r.id}">${r.content}</p>
                        <div id="edit-form-${r.id}" style="display:none; margin-top:10px;" class="inline-edit-box">
                            <textarea id="edit-input-${r.id}" style="width:100%; border-radius:8px; padding:10px; height:80px;">${r.content}</textarea>
                            <div style="display:flex; gap:10px; margin-top:10px;">
                                <button onclick="saveEdit(${r.id})" class="btn-admin btn-admin-edit" style="padding:5px 15px; font-size:12px;">Salvează</button>
                                <button onclick="cancelEdit(${r.id})" class="btn-admin btn-admin-delete" style="padding:5px 15px; font-size:12px;">Anulează</button>
                            </div>
                        </div>
                    </div>
                    <small class="review-date">${r.createdAt ? new Date(r.createdAt).toLocaleDateString("ro-RO") : ""}</small>
                </div>`);
        });
    });
}

function deleteReview(id) {
    if (!confirm("Ești sigur că vrei să ștergi această recenzie?")) return;
    const token = localStorage.getItem("userToken");
    axios.delete(`${API_BASE}/reviews/delete/${id}`, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(() => document.getElementById(`review-card-${id}`).remove())
        .catch(err => alert("Nu ai permisiunea de a șterge această recenzie."));
}

function enableEditMode(id) {
    document.getElementById(`content-text-${id}`).style.display = 'none';
    document.getElementById(`edit-form-${id}`).style.display = 'block';
}

function cancelEdit(id) {
    document.getElementById(`content-text-${id}`).style.display = 'block';
    document.getElementById(`edit-form-${id}`).style.display = 'none';
}

async function saveEdit(id) {
    const token = localStorage.getItem("userToken");
    const newContent = document.getElementById(`edit-input-${id}`).value;
    if(!newContent.trim()) return alert("Mesajul nu poate fi gol.");

    try {
        await axios.put(`${API_BASE}/reviews/update/${id}`, 
            { content: newContent, rating: 5, productId: productId }, 
            { headers: { 'Authorization': 'Bearer ' + token } }
        );
        loadReviews(productId); 
    } catch (err) { alert("Eroare la salvare."); }
}

// =========================================================
// 5. POPUP ȘTERGERE PRODUS (ADMIN)
// =========================================================
function setupDeletePopup() {
    const popup = document.getElementById("delete-popup");
    const confirmBtn = document.getElementById("confirm-delete");
    const cancelBtn = document.getElementById("cancel-delete");

    if (cancelBtn) cancelBtn.onclick = () => { popup.style.display = "none"; productToDeleteId = null; };
    if (confirmBtn) confirmBtn.onclick = () => { if (productToDeleteId) performDelete(productToDeleteId); };
}

function deleteProduct(id) {
    productToDeleteId = id;
    const popup = document.getElementById("delete-popup");
    if (popup) popup.style.display = "flex";
}

function performDelete(id) {
    const token = localStorage.getItem("userToken");
    axios.delete(`${API_BASE}/product/${id}`, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(() => {
            alert("Produs șters cu succes!");
            window.location.href = "shop.html";
        })
        .catch(err => alert("Eroare la ștergere! Verifică permisiunile de admin."));
}

// =========================================================
// 6. FAVORITE, CART & SUGESTII
// =========================================================
function submitReview() {
    const token = localStorage.getItem("userToken");
    const content = document.getElementById("reviewContent").value;
    const rating = document.getElementById("ratingValue").value;

    if (!token) return alert("Trebuie să fii logat!");
    if (!content.trim()) return alert("Scrie un mesaj!");

    const data = {
        productId: parseInt(productId),
        content: content,
        rating: parseInt(rating),
        name: localStorage.getItem("userName") || "Anonim"
    };

    axios.post(`${API_BASE}/reviews/add`, data, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(() => location.reload())
        .catch(err => alert("Eroare la trimiterea recenziei."));
}

async function processAddToCart() {
    const token = localStorage.getItem("userToken");

    if (!token) {
        alert("Trebuie să fii logat pentru a adăuga produse în coș!");
        window.location.href = "login.html";
        return;
    }

    if (!selectedColor || !selectedSize) {
        alert("Te rugăm să selectezi culoarea și mărimea.");
        return;
    }

    const cartRequest = {
        productId: currentProduct.productId,
        quantity: 1,
        color: selectedColor,
        size: selectedSize
    };

    try {
        await axios.post("http://localhost:8080/api/cart/add", cartRequest, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        alert("Produsul a fost adăugat în coș!");
        // Opțional: update badge navbar
        if (typeof updateCartPopupData === 'function') updateCartPopupData();
        
    } catch (error) {
        console.error("Eroare la adăugarea în coș:", error);
        alert("Eroare la server. Încearcă din nou.");
    }
}
function loadSuggestions() {
    const container = document.getElementById("suggestions-section");
    if (!container) return;
    axios.get(`${API_BASE}/product/${productId}/suggestions`)
        .then(response => {
            const suggestions = response.data;
            if (suggestions.length === 0) return;
            let html = `<h3 style="text-align:center; margin-top:50px;">S-ar putea să îți placă</h3><div class="suggestions-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:25px; padding:20px;">`;
            suggestions.forEach(s => {
                const thumbId = (s.images && s.images.length > 0) ? s.images[0].imageId : null;
                html += `
                    <a href="product.html?id=${s.productId}" class="suggestion-card" style="text-decoration:none; color:inherit; text-align:center;">
                        <img src="${thumbId ? API_BASE+'/product/image/'+thumbId : PLACEHOLDER}" style="width:100%; height:250px; object-fit:cover; border-radius:10px;">
                        <h4 style="margin:10px 0;">${s.productName}</h4>
                        <p style="font-weight:bold; color:#00a6ff;">${s.productPrice} RON</p>
                    </a>`;
            });
            container.innerHTML = html + `</div>`;
        });
}

function toggleFavorite(event, id, icon) {
    event.stopPropagation();
    const token = localStorage.getItem("userToken");
    if (!token) return alert("Loghează-te pentru favorite!");
    axios.post(`${API_BASE}/favorites/toggle/${id}`, {}, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => res.data === "Added" ? icon.classList.add("active") : icon.classList.remove("active"));
}

function checkIfFavorite(id) {
    const token = localStorage.getItem("userToken");
    if (!token) return; 
    axios.get(`${API_BASE}/favorites/check/${id}`, { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => { if (res.data === true) document.getElementById(`fav-icon-${id}`)?.classList.add("active"); });
}

function checkLoginStatusForReviews() {
    const token = localStorage.getItem("userToken");
    const form = document.getElementById("review-form-container");
    const msg = document.getElementById("guest-review-message");
    if (token) { if(form) form.style.display = "block"; if(msg) msg.style.display = "none"; } 
    else { if(form) form.style.display = "none"; if(msg) msg.style.display = "block"; }
}