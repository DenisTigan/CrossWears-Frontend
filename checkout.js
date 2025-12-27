const API_URL = "http://localhost:8080/api";
let cartSubtotal = 0; // Reținem prețul produselor fără transport
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificăm dacă userul e logat
    const token = localStorage.getItem("userToken");
    if (!token) {
        alert("Trebuie să fii logat pentru a accesa checkout-ul!");
        window.location.href = "login.html";
        return;
    }

    // 2. Încărcăm datele profilului (Nume și Adresă)
    loadUserProfile();

    // 3. Încărcăm coșul pentru rezumat
    loadCart();

    // 4. Logica pentru afișarea câmpurilor de card
    setupPaymentToggle();
});

// FUNCȚIE NOUĂ: Încarcă Numele și Adresa direct din baza de date
async function loadUserProfile() {
    const token = localStorage.getItem("userToken");
    try {
        const res = await axios.get(`${API_URL}/user/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const user = res.data;
        
        // Completăm Numele
        const nameInput = document.getElementById('fullName');
        if (nameInput) nameInput.value = user.fullName || "";

        // REPARARE ID: Completăm Adresa folosind ID-ul corect din HTML (shippingAddress)
        const addressInput = document.getElementById('shippingAddress');
        if (addressInput && user.defaultAddress) {
            addressInput.value = user.defaultAddress;
            console.log("Adresa implicită a fost încărcată cu succes!");
        }
    } catch (error) {
        console.error("Eroare la încărcarea datelor de profil:", error);
    }
}

async function loadCart() {
    try {
        const response = await axios.get(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("userToken")}` }
        });

        const cart = response.data;
        const summaryDiv = document.getElementById('summaryItems');
        summaryDiv.innerHTML = '';

        cart.items.forEach(item => {
            summaryDiv.innerHTML += `
                <div class="summary-item">
                    <span>${item.product.productName} (x${item.quantity})</span>
                    <span>${(item.price * item.quantity).toFixed(2)} RON</span>
                </div>
            `;
        });

        // Salvăm subtotalul și îl afișăm
        cartSubtotal = cart.totalPrice;
        document.getElementById('subtotalPrice').innerText = `${cartSubtotal.toFixed(2)} RON`;
        
        // Calculăm totalul final (cu sau fără livrare)
        calculateFinalTotal();
    } catch (error) {
        console.error("Eroare la încărcare coș:", error);
    }
}

function setupPaymentToggle() {
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    const cardFields = document.getElementById('cardFields');

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 1. Logică vizibilitate câmpuri card
            if (e.target.value === 'CARD') {
                cardFields.classList.add('card-details-visible');
            } else {
                cardFields.classList.remove('card-details-visible');
            }

            // 2. Recalculăm totalul la fiecare schimbare
            calculateFinalTotal();
        });
    });
}

function calculateFinalTotal() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const shippingEl = document.getElementById('shippingPrice');
    const totalEl = document.getElementById('totalPrice');
    
    let shippingCost = 0;

    if (paymentMethod === 'CARD') {
        shippingCost = 0;
        shippingEl.innerText = "GRATUIT";
        shippingEl.style.color = "#2ecc71"; // Verde pentru gratuit
    } else {
        shippingCost = 20;
        shippingEl.innerText = "20.00 RON";
        shippingEl.style.color = "#333";
    }

    const finalTotal = cartSubtotal + shippingCost;
    totalEl.innerText = `${finalTotal.toFixed(2)} RON`;
}

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const orderData = {
        email: localStorage.getItem("userEmail"),
        shippingAddress: document.getElementById('shippingAddress').value,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        cardNumber: document.getElementById('cardNumber').value || null,
        cvv: document.getElementById('cvv').value || null
    };

    try {
        const response = await axios.post(`${API_URL}/checkout/place`, orderData, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem("userToken")}` }
        });

        alert("Comandă plasată cu succes! ID Comandă: " + response.data.orderId);
        window.location.href = "index.html";
    } catch (error) {
        const msg = error.response?.data?.message || "Eroare la server";
        alert("Eroare: " + msg);
    }
});