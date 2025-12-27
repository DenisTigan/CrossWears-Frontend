const container = document.getElementById("product-container");
const addProductPageUrl = "addProduct.html";
const API_BASE = "http://localhost:8080/api";

// 1. FUNCȚIA DE FILTRARE ȘI CĂUTARE
function fetchProducts() {
    // Luăm valorile din input-uri (asigură-te că ID-urile coincid cu cele din HTML)
    const keyword = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
    const minPrice = document.getElementById("min-price") ? document.getElementById("min-price").value : 0;
    const maxPrice = document.getElementById("max-price") ? document.getElementById("max-price").value : 1000000;

    // Apelăm endpoint-ul de search creat anterior
    axios.get(`${API_BASE}/products/search`, {
        params: {
            keyword: keyword,
            minPrice: minPrice || 0,
            maxPrice: maxPrice || 1000000
        }
    })
    .then(response => {
        const products = response.data;
        renderProducts(products); // Apelăm funcția de randare
    })
    .catch(err => {
        console.error("Eroare la filtrare:", err);
        container.innerHTML = "<p style='color:red;'>Eroare la preluarea produselor.</p>";
    });
}

// 2. FUNCȚIA DE RANDARE (Curăță și reconstruiește grid-ul)
function renderProducts(products) {
    container.innerHTML = ""; // Curățăm ce era înainte

    products.forEach(p => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        const imageUrl = `${API_BASE}/product/${p.productId}/image`;
        const isAvailable = p.available === true && p.quantity > 0;

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
                    ? `<button class="btn-add-cart" onclick="addToCart(${p.productId})">Adaugă în coș</button>`
                    : `<button class="btn-out-of-stock" disabled>Stoc epuizat</button>`
                }
            </div>
        `;

        container.appendChild(card);
        checkIfFavorite(p.productId);
    });

    // Păstrăm logica de Admin: Adăugăm cardul de "Produs Nou" la final
    const role = localStorage.getItem("userRole");
    if (role === "ROLE_ADMIN") {
        const addCard = document.createElement("a");
        addCard.classList.add("add-product-card");
        addCard.href = addProductPageUrl;
        addCard.innerHTML = `
            <i class="fas fa-plus"></i>
            <p>Adaugă Produs Nou</p>
        `;
        container.appendChild(addCard);
    }
}

// 3. EVENT LISTENERS PENTRU FILTRE
document.addEventListener("DOMContentLoaded", () => {
    fetchProducts(); // Încărcare inițială a tuturor produselor

    // Căutare live pe măsură ce tastezi
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", fetchProducts);
    }

    // Filtrare la click pe buton
    const filterBtn = document.getElementById("btn-filter");
    if (filterBtn) {
        filterBtn.addEventListener("click", fetchProducts);
    }
});

// --- FUNCȚII NOI PENTRU FAVORITE ---

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
    if (!token) {
        alert("Trebuie să fii logat pentru a salva produse!");
        return;
    }

    // Mică animație
    iconElement.style.transform = "scale(0.8)";
    setTimeout(() => iconElement.style.transform = "scale(1)", 200);

    axios.post(`${API_BASE}/favorites/toggle/${productId}`, {}, {
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






function addToCart(id) {
    // Aici vei implementa logica de coș mai târziu
    alert("Produs adăugat în coș! ID: " + id);
}