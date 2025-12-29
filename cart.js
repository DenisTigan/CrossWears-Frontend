document.addEventListener("DOMContentLoaded", () => {
    loadCart();
});

// În fișierul cart.js

async function loadCart() {
    const token = localStorage.getItem("userToken");
    const cartContainer = document.getElementById("cart-container");
    const emptyMsg = document.getElementById("empty-cart-msg");
    const guestMsg = document.getElementById("guest-msg"); 
    const tbody = document.getElementById("cart-items-body");
    const totalPriceEl = document.getElementById("cart-total-price");

    if (!token) {
        if (cartContainer) cartContainer.style.display = "none";
        if (emptyMsg) emptyMsg.style.display = "none";
        if (guestMsg) guestMsg.style.display = "block";
        return;
    }

    if (guestMsg) guestMsg.style.display = "none";

    try {
        const response = await axios.get("http://localhost:8080/api/cart", {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const cart = response.data;
        tbody.innerHTML = "";

        if (!cart.items || cart.items.length === 0) {
            if (cartContainer) cartContainer.style.display = "none";
            if (emptyMsg) emptyMsg.style.display = "block";
            return;
        }

        if (cartContainer) cartContainer.style.display = "block";
        if (emptyMsg) emptyMsg.style.display = "none";

        cart.items.forEach(item => {
            const selectedColorLower = (item.color || "").toLowerCase();
            let colorImg = item.product.images.find(img => (img.color || "").toLowerCase() === selectedColorLower);

            if (!colorImg) {
                colorImg = item.product.images.find(img => (img.color || "").toLowerCase() === 'general');
            }

            if (!colorImg && item.product.images.length > 0) {
                colorImg = item.product.images[0];
            }

            const imgUrl = colorImg ? `http://localhost:8080/api/product/image/${colorImg.imageId}` : 'placeholder.jpg';

            const row = document.createElement("tr");
            
            // --- MODIFICARE MAJORĂ AICI: Am scos stilurile inline și am pus clase ---
          // În interiorul buclei cart.items.forEach din cart.js:
                row.innerHTML = `
                    <td data-label="Produs">
                        <div class="cart-product-wrapper">
                            <img src="${imgUrl}" class="cart-product-img">
                            <div class="cart-item-info">
                                <div class="cart-item-title">${item.product.productName}</div>
                                <div class="cart-item-details">${item.color} | ${item.size}</div>
                            </div>
                        </div>
                    </td>
                    <td data-label="Preț">${item.price} RON</td>
                    <td data-label="Cantitate"><span class="qty-badge">${item.quantity}</span></td>
                    <td data-label="Subtotal" class="text-bold">${(item.price * item.quantity).toFixed(2)} RON</td>
                    <td data-label="Acțiuni">
                        <button class="btn-delete-cart" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i> Elimină
                        </button>
                    </td>
                `;
            tbody.appendChild(row);
        });

        if (totalPriceEl) {
            totalPriceEl.innerText = cart.totalPrice.toFixed(2);
        }
        if (window.lucide) lucide.createIcons();

    } catch (error) {
        console.error("Eroare la încărcarea coșului:", error);
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