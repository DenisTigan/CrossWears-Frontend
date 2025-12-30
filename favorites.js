const container = document.getElementById("favorites-container");
const emptyMsg = document.getElementById("empty-msg");
const API_BASE = `${API_URL}/api`;

document.addEventListener("DOMContentLoaded", () => {
    loadFavorites();
});

function loadFavorites() {
    const token = localStorage.getItem("userToken");
    
    if (!token) {
        container.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1;">
                <p>Trebuie să fii autentificat pentru a vedea favoritele.</p>
                <a href="login.html" style="color: blue; text-decoration: underline;">Loghează-te aici</a>
            </div>`;
        return;
    }

    axios.get(`${API_BASE}/favorites/my-list`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        const products = response.data;
        container.innerHTML = "";

        if (products.length === 0) {
            container.style.display = "none";
            emptyMsg.style.display = "block";
            return;
        }

        container.style.display = "grid";
        emptyMsg.style.display = "none";

        products.forEach(p => {
            const card = document.createElement("div");
            card.classList.add("product-card");
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";

            // --- LOGICĂ NOUĂ IMAGINE ---
            // Luăm prima imagine din galerie pentru thumbnail
            const thumbId = (p.images && p.images.length > 0) ? p.images[0].imageId : null;
            const imageUrl = thumbId ? `${API_BASE}/product/image/${thumbId}` : 'placeholder.jpg';

            // --- LOGICĂ NOUĂ DISPONIBILITATE ---
            // Produsul e disponibil doar dacă flag-ul e true ȘI există cel puțin o variantă cu stoc > 0
            const hasStock = p.variants && p.variants.some(v => v.quantity > 0);
            const isAvailable = p.available === true && hasStock;

            card.innerHTML = `
                <div class="product-img-container">
                    <i class="fas fa-heart heart-icon active" 
                        onclick="removeFavoriteFromList(event, ${p.productId}, this)">
                    </i>
                    
                    <a href="product.html?id=${p.productId}" class="product-link">
                        <img class="product-img" src="${imageUrl}" alt="${p.productName}" onerror="this.src='placeholder.jpg'">
                    </a>
                </div>

                <div class="product-content">
                    <h3 class="product-title">${p.productName}</h3>
                    <strong class="product-price">${p.productPrice} RON</strong>
                </div>
            
                <div class="product-actions">
                    ${
                        isAvailable
                        ? `<button class="btn-add-cart" onclick="openVariantModal(${p.productId})">Adaugă în coș</button>`
                        : `<button class="btn-out-of-stock" disabled>Stoc epuizat</button>`
                    }
                </div>
            `;

            container.appendChild(card);
        });
    })
    .catch(err => {
        console.error(err);
        container.innerHTML = "<p style='color:red; text-align:center; grid-column: 1/-1;'>Eroare la încărcarea favoritelor.</p>";
    });
}

// Folosim aceeași funcție de toggle de pe Shop/Product pentru a șterge
function removeFavoriteFromList(event, productId, iconElement) {
    event.stopPropagation();
    const card = iconElement.closest(".product-card");
    const token = localStorage.getItem("userToken");

    card.style.opacity = "0";
    card.style.transform = "scale(0.9)";

    axios.post(`${API_BASE}/favorites/toggle/${productId}`, {}, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        setTimeout(() => {
            card.remove();
            if (container.children.length === 0) {
                container.style.display = "none";
                emptyMsg.style.display = "block";
            }
        }, 300);
    })
    .catch(err => {
        card.style.opacity = "1";
        card.style.transform = "scale(1)";
        alert("Eroare la eliminare.");
    });
}

// Notă: Funcția openVariantModal(productId) trebuie să fie disponibilă global 
// (mut-o în general.js sau asigură-te că shop.js este inclus)