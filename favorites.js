const container = document.getElementById("favorites-container");
const emptyMsg = document.getElementById("empty-msg");
const API_BASE = "http://localhost:8080/api";

document.addEventListener("DOMContentLoaded", () => {
    loadFavorites();
});

function loadFavorites() {
    const token = localStorage.getItem("userToken");
    
    // Verificăm dacă e logat
    if (!token) {
        container.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1;">
                <p>Trebuie să fii autentificat pentru a vedea favoritele.</p>
                <a href="login.html" style="color: blue; text-decoration: underline;">Loghează-te aici</a>
            </div>`;
        return;
    }

    // Cerem lista de la Backend
    axios.get(`${API_BASE}/favorites/my-list`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        const products = response.data;

        // Dacă lista e goală, arătăm mesajul "Nu ai produse"
        if (products.length === 0) {
            container.style.display = "none";
            emptyMsg.style.display = "block";
            return;
        }

        // Randăm produsele
        products.forEach(p => {
            const card = document.createElement("div");
            card.classList.add("product-card");
            // Adăugăm o tranziție CSS pentru efectul de ștergere
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";

            const imageUrl = `${API_BASE}/product/${p.productId}/image`;
            const isAvailable = p.available === true && p.quantity > 0;

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
                        ? `<button class="btn-add-cart" onclick="addToCart(${p.productId})">Adaugă în coș</button>`
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

// --- FUNCȚIA DE ȘTERGERE DIN LISTĂ ---
function removeFavoriteFromList(event, productId, iconElement) {
    event.stopPropagation(); // Nu intra pe pagina produsului
    
    // 1. Efect vizual rapid (Optimistic UI)
    const card = iconElement.closest(".product-card");
    
    // Facem cardul transparent și îl micșorăm puțin
    card.style.opacity = "0";
    card.style.transform = "scale(0.9)";

    // După 300ms (cât durează animația), îl scoatem de tot din HTML
    setTimeout(() => {
        card.remove();

        // Verificăm dacă a rămas lista goală după ștergere
        if (container.children.length === 0) {
            container.style.display = "none";
            emptyMsg.style.display = "block";
        }
    }, 300);

    // 2. Trimitem cererea la server în fundal
    const token = localStorage.getItem("userToken");
    axios.post(`${API_BASE}/favorites/toggle/${productId}`, {}, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        console.log("Produs șters din favorite (Server confirm)");
    })
    .catch(err => {
        console.error("Eroare la ștergere:", err);
        alert("A apărut o eroare la ștergere. Dă refresh.");
    });
}

function addToCart(id) {
    // Logica de cart (placeholder)
    alert("Produs adăugat în coș! ID: " + id);
}