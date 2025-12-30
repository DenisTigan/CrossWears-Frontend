const container = document.getElementById("product-container");
const addProductPageUrl = "addProduct.html";
const API_BASE = `${API_URL}/api`;

// Variabile pentru gestionarea selecției în Modal
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;

// =========================================================
// 1. LOGICA DE FILTRARE ȘI CĂUTARE
// =========================================================

function fetchProducts() {
    const keyword = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
    const minPrice = document.getElementById("min-price") ? document.getElementById("min-price").value : 0;
    const maxPrice = document.getElementById("max-price") ? document.getElementById("max-price").value : 1000000;

    // Apelăm endpoint-ul de search adaptat pentru noile produse
    axios.get(`${API_BASE}/products/search`, {
        params: {
            keyword: keyword,
            minPrice: minPrice || 0,
            maxPrice: maxPrice || 1000000
        }
    })
    .then(response => {
        renderProducts(response.data);
    })
    .catch(err => {
        console.error("Eroare la filtrare:", err);
        container.innerHTML = "<p style='color:red;'>Eroare la preluarea produselor.</p>";
    });
}

// =========================================================
// 2. LOGICA DE RANDARE (Grid Produse)
// =========================================================

function renderProducts(products) {
    // 1. Curățăm containerul
    container.innerHTML = ""; 

    // 2. VERIFICARE DE SIGURANȚĂ: Prevenim eroarea "forEach is not a function"
    // Dacă backend-ul trimite o eroare (obiect) în loc de listă, afișăm un mesaj prietenos
    if (!Array.isArray(products)) {
        console.error("Eroare: Backend-ul nu a trimis o listă de produse. Date primite:", products);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px;">
                <p style="color:orange; font-weight: bold;">Se încarcă produsele sau serverul se trezește...</p>
                <p style="font-size: 12px; color: #666;">Dacă durează mai mult de 1 minut, verifică conexiunea la baza de date.</p>
            </div>
        `;
        return; // Oprim execuția aici pentru a nu mai ajunge la .forEach
    }

    // 3. LOGICA DE RANDARE (doar dacă avem o listă validă)
    products.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        // Luăm prima imagine disponibilă pentru thumbnail
        const thumbId = (p.images && p.images.length > 0) ? p.images[0].imageId : null;
        const imageUrl = thumbId ? `${API_BASE}/product/image/${thumbId}` : 'placeholder.jpg';

        // Verificăm stocul și disponibilitatea
        const hasStock = p.variants && p.variants.some(v => v.quantity > 0);
        const isAvailable = p.available === true && hasStock;

        card.innerHTML = `
            <div class="product-img-container">
                <i class="fas fa-heart heart-icon" 
                   onclick="toggleFavorite(event, ${p.productId}, this)" 
                   id="fav-icon-${p.productId}">
                </i>
                <a href="product.html?id=${p.productId}" class="product-link">
                    <img class="product-img" src="${imageUrl}" alt="${p.productName}" onerror="this.src='placeholder.jpg'">
                </a>
            </div>

            <div class="product-content">
                <h3 class="product-title">${p.productName}</h3>
                <p class="product-description">${p.productDescription}</p>
                <strong class="product-price">${p.productPrice} RON</strong>
            </div>
        
            <div class="product-actions">
                ${isAvailable
                    ? `<button class="btn-add-cart" onclick="openVariantModal(${p.productId})">Adaugă în coș</button>`
                    : `<button class="btn-out-of-stock" disabled>Stoc epuizat</button>`
                }
            </div>
        `;

        container.appendChild(card);
        checkIfFavorite(p.productId);
    });

    // 4. Card special pentru Admin
    const role = localStorage.getItem("userRole");
    if (role === "ROLE_ADMIN") {
        const addCard = document.createElement("a");
        addCard.classList.add("add-product-card");
        addCard.href = addProductPageUrl;
        addCard.innerHTML = `<i class="fas fa-plus"></i><p>Adaugă Produs Nou</p>`;
        container.appendChild(addCard);
    }
}
// =========================================================
// 3. LOGICA POP-UP (MODAL) PENTRU SELECȚIE
// =========================================================

async function openVariantModal(productId) {
    try {
        const res = await axios.get(`${API_BASE}/product/${productId}`);
        currentProduct = res.data;

        // Resetăm selecțiile anterioare
        selectedSize = null;
        selectedColor = null;

        // Populăm datele de bază în modal
        document.getElementById("modal-title").innerText = currentProduct.productName;
        document.getElementById("modal-price").innerText = `${currentProduct.productPrice} RON`;
        
        // Imaginea principală
        const mainImg = document.getElementById("modal-main-img");
        if(currentProduct.images && currentProduct.images.length > 0) {
            mainImg.src = `${API_BASE}/product/image/${currentProduct.images[0].imageId}`;
        }

        // Generăm butoanele de culori unice
        const colors = [...new Set(currentProduct.variants.map(v => v.color))];
        const colorContainer = document.getElementById("modal-colors");
        colorContainer.innerHTML = colors.map(c => 
            `<button class="btn-color-select" onclick="selectColorInModal('${c}', this)">${c}</button>`
        ).join("");

        // Mesaj de așteptare pentru mărime
        document.getElementById("modal-sizes").innerHTML = "<p style='font-size:12px; color:#888;'>Alege o culoare pentru a vedea mărimile.</p>";
        
        // Afișăm modalul
        document.getElementById("variant-modal").style.display = "flex";

    } catch (err) {
        console.error("Eroare la deschiderea modalului:", err);
        alert("Nu s-au putut încărca detaliile produsului.");
    }
}

function selectColorInModal(color, btn) {
    selectedColor = color;
    selectedSize = null; 

    document.querySelectorAll(".btn-color-select").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Normalizăm pentru a asigura potrivirea (ex: "Negru" cu "NEGRU")
    const normalizedColor = color.toLowerCase();

    // --- FILTRARE IMAGINE MODAL ---
    let colorImg = currentProduct.images.find(img => 
        (img.color || "").toLowerCase() === normalizedColor
    );

    if (!colorImg) {
        colorImg = currentProduct.images.find(img => 
            (img.color || "").toLowerCase() === 'general'
        );
    }

    const mainImg = document.getElementById("modal-main-img");
    if (colorImg) {
        mainImg.src = `${API_BASE}/product/image/${colorImg.imageId}`;
    } else if (currentProduct.images.length > 0) {
        mainImg.src = `${API_BASE}/product/image/${currentProduct.images[0].imageId}`;
    }

    // --- FILTRARE MĂRIMI MODAL ---
    const availableSizes = currentProduct.variants.filter(v => 
        v.color.toLowerCase() === normalizedColor && v.quantity > 0
    );

    const sizeContainer = document.getElementById("modal-sizes");
    if (availableSizes.length > 0) {
        sizeContainer.innerHTML = availableSizes.map(v => 
            `<button class="btn-size-select" onclick="selectSizeInModal('${v.size}', this)">${v.size}</button>`
        ).join("");
    } else {
        sizeContainer.innerHTML = "<p style='color:red; font-size:12px;'>Stoc epuizat pentru această culoare.</p>";
    }
}

function selectSizeInModal(size, btn) {
    selectedSize = size;
    document.querySelectorAll(".btn-size-select").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

async function confirmAddToCart() {
    const token = localStorage.getItem("userToken");

    if (!token) {
        alert("Autentifică-te pentru a cumpăra!");
        window.location.href = "login.html";
        return;
    }

    if(!selectedColor || !selectedSize) {
        alert("Te rugăm să alegi culoarea și mărimea!");
        return;
    }

    try {
        await axios.post(`${API_BASE}/cart/add`, {
            productId: currentProduct.productId,
            quantity: 1,
            color: selectedColor,
            size: selectedSize
        }, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        alert("Adăugat cu succes!");
        closeVariantModal();
        if (typeof updateCartBadge === 'function') updateCartBadge();
        
    } catch (error) {
        alert("Eroare la adăugarea în coș.");
    }
}

function closeVariantModal() {
    document.getElementById("variant-modal").style.display = "none";
}

// =========================================================
// 4. FAVORITE ȘI EVENT LISTENERS
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();

    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.addEventListener("input", fetchProducts);

    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) filterBtn.addEventListener("click", fetchProducts);
});

function checkIfFavorite(productId) {
    const token = localStorage.getItem("userToken");
    if (!token) return; 

    axios.get(`${API_BASE}/favorites/check/${productId}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (res.data === true) {
            const icon = document.getElementById(`fav-icon-${productId}`);
            if (icon) icon.classList.add("active"); 
        }
    })
    .catch(console.error);
}

function toggleFavorite(event, productId, iconElement) {
    event.stopPropagation(); 
    event.preventDefault();
    const token = localStorage.getItem("userToken");
    if (!token) { alert("Loghează-te pentru favorite!"); return; }

    axios.post(`${API_BASE}/favorites/toggle/${productId}`, {}, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        if (res.data === "Added") iconElement.classList.add("active"); 
        else iconElement.classList.remove("active"); 
    })
    .catch(err => console.error(err));
}