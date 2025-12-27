document.addEventListener("DOMContentLoaded", () => {
    loadCart();
});

async function loadCart() {
    const token = localStorage.getItem("userToken");
    
    // Selectăm elementele din DOM
    const cartContainer = document.getElementById("cart-container");
    const emptyMsg = document.getElementById("empty-cart-msg");
    const guestMsg = document.getElementById("guest-msg"); 
    const tbody = document.getElementById("cart-items-body");
    const totalPriceEl = document.getElementById("cart-total-price");

    // --- 1. VERIFICARE: UTILIZATOR NELOGAT ---
    if (!token) {
        // Ascundem tabelul și mesajul de coș gol
        if (cartContainer) cartContainer.style.display = "none";
        if (emptyMsg) emptyMsg.style.display = "none";
        
        // Afișăm mesajul de "Te rog loghează-te"
        if (guestMsg) guestMsg.style.display = "block";
        
        return; // Opriri execuția aici (nu mai facem request la server)
    }

    // Dacă ajungem aici, userul e logat. Ascundem mesajul de guest.
    if (guestMsg) guestMsg.style.display = "none";

    try {
        // --- 2. CERERE CĂTRE SERVER ---
        const response = await axios.get("http://localhost:8080/api/cart", {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const cart = response.data;
        tbody.innerHTML = "";

        // --- 3. VERIFICARE: COȘ GOL (User logat, dar fără produse) ---
        if (!cart.items || cart.items.length === 0) {
            if (cartContainer) cartContainer.style.display = "none";
            if (emptyMsg) emptyMsg.style.display = "block";
            return;
        }

        // --- 4. AFIȘARE PRODUSE (User logat + produse) ---
        // Ne asigurăm că tabelul e vizibil și mesajele de gol sunt ascunse
        if (cartContainer) cartContainer.style.display = "block";
        if (emptyMsg) emptyMsg.style.display = "none";

        cart.items.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${item.product.productName}</div>
                </td>
                <td>${item.price} RON</td>
                <td>
                    <span style="background: #f0f2f5; padding: 4px 10px; border-radius: 12px;">
                        ${item.quantity}
                    </span>
                </td>
                <td style="font-weight: bold;">${(item.price * item.quantity).toFixed(2)} RON</td>
                <td>
                    <button class="btn-delete-cart" onclick="removeFromCart(${item.id})">
                        Elimină
                    </button>                
                </td>
            `;
            tbody.appendChild(row);
        });

        if (totalPriceEl) {
            totalPriceEl.innerText = cart.totalPrice.toFixed(2);
        }

    } catch (error) {
        console.error("Eroare la încărcarea coșului:", error);
        
        // Opțional: Dacă token-ul a expirat (eroare 403), putem forța delogarea
        if (error.response && error.response.status === 403) {
            alert("Sesiunea a expirat. Te rugăm să te loghezi din nou.");
            localStorage.removeItem("userToken");
            window.location.href = "login.html";
        }
    }
}

async function removeFromCart(itemId) {
    const token = localStorage.getItem("userToken");

    try {
        await axios.delete(`http://localhost:8080/api/cart/remove/${itemId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        // 1. Reîncărcăm tabelul din pagina curentă
        loadCart(); 

        // 2. Reîncărcăm bulina și mini-cart-ul din navbar (funcția din general.js)
        if (typeof updateCartPopupData === 'function') {
            await updateCartPopupData();
        }

    } catch (error) {
        console.error("Eroare la ștergere:", error);
    }
}

function proceedToCheckout() {
    window.location.href = "checkout.html";
}