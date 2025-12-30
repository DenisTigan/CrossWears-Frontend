// --- CONSTANTE GLOBALE ---
const API_BASE_GENERAL = `${API_URL}/api`;
const CHAT_API = `${API_URL}/api/chat`;

// ==========================================
// 1. LOGICA DE INIȚIALIZARE (Login/Logout/UI)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Luăm elementele din HTML
    const loginBtn = document.getElementById("nav-login-btn");
    const profileSection = document.getElementById("nav-profile-section");
    const adminLink = document.getElementById("admin-link");
    const logoutBtn = document.getElementById("logout-btn");

    // 2. Verificăm "buzunarul" (LocalStorage)
    const token = localStorage.getItem("userToken");
    const role = localStorage.getItem("userRole"); // "ROLE_USER" sau "ROLE_ADMIN"

   const chatBtn = document.getElementById("chat-toggle-btn");

    if (token) {
        // --- UTILIZATOR LOGAT ---
        if(loginBtn) loginBtn.style.display = "none";
        if(profileSection) profileSection.style.display = "block";

        if (role === "ROLE_ADMIN" && adminLink) {
            adminLink.style.display = "flex"; 
            
            // AM SCOS ASCUNDEREA! ACUM VEZI CHATUL ȘI CA ADMIN
            if(chatBtn) chatBtn.style.display = "flex"; 

        } else if (adminLink) {
            adminLink.style.display = "none"; 
        }

    } else {
        // --- VIZITATOR (NE-LOGAT) ---
        if(loginBtn) loginBtn.style.display = "block";     // Arătăm butonul Login
        if(profileSection) profileSection.style.display = "none"; // Ascundem Profilul
        
        // Dacă nu e logat, ascundem butonul de chat (Opțional, dacă vrei)
        const chatBtn = document.getElementById("chat-toggle-btn");
        if(chatBtn) chatBtn.style.display = "none";
    }

    // 3. Logica de Logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Ștergem tot din memorie
            localStorage.removeItem("userToken");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userName");
            localStorage.removeItem("userId");

            alert("Te-ai deconectat cu succes!");
            window.location.href = "login.html"; // Redirecționăm la login
        });
    }
    
    // Re-inițializare iconițe Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});


// ==========================================
// 2. LOGICA DE CHAT (TREBUIE SĂ FIE GLOBALĂ)
// ==========================================
// Aceste funcții sunt în afara 'DOMContentLoaded' ca să poată fi apelate de HTML (onclick="")

let chatInterval = null;
let isChatOpen = false;

// A. DESCHIDE / ÎNCHIDE FEREASTRA
function toggleChatWindow() {
    const chatWindow = document.getElementById("chat-window");
    const token = localStorage.getItem("userToken");

    if (!isChatOpen) {
        // Deschidem
        if (!token) {
            alert("Te rugăm să te loghezi pentru a discuta cu noi!");
            window.location.href = "login.html";
            return;
        }
        
        chatWindow.style.display = "flex"; 
        isChatOpen = true;
        
        // Încărcăm imediat și pornim ceasul (Polling)
        loadMessages();
        startPolling();
    } else {
        // Închidem
        chatWindow.style.display = "none";
        isChatOpen = false;
        stopPolling();
    }
}

// B. PORNIRE / OPRIRE REFRESH AUTOMAT
function startPolling() {
    if (!chatInterval) {
        chatInterval = setInterval(loadMessages, 3000); // Verifică la fiecare 3 secunde
        console.log("Chat: Polling pornit.");
    }
}

function stopPolling() {
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
        console.log("Chat: Polling oprit.");
    }
}

// C. TRIMITE MESAJ
function sendMessage() {
    const input = document.getElementById("chat-input");
    const content = input.value.trim();
    const token = localStorage.getItem("userToken");

    if (!content) return;

    const data = {
        content: content,
        receiverId: null // Suntem Client, trimitem la Admin (null)
    };

    axios.post(`${CHAT_API}/send`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        input.value = ""; // Golim inputul
        loadMessages(); // Reîncărcăm imediat
        setTimeout(scrollToBottom, 100); // Scroll jos
    })
    .catch(err => console.error("Eroare trimitere:", err));
}

// Permite trimiterea cu ENTER
function handleEnter(e) {
    if (e.key === "Enter") sendMessage();
}

// D. ÎNCARCĂ ISTORICUL
function loadMessages() {
    const token = localStorage.getItem("userToken");
    const container = document.getElementById("chat-messages");
    
    // Verificăm dacă suntem pe pagină (ca să nu dea eroare dacă containerul lipsește)
    if(!container) return;

    axios.get(`${CHAT_API}/history`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const messages = res.data;
        const myEmail = localStorage.getItem("userEmail"); // Email-ul meu salvat la login

        // Dacă e gol
        if (messages.length === 0) {
            container.innerHTML = '<p class="chat-placeholder">Bună! Scrie-ne un mesaj.</p>';
            return;
        }

        container.innerHTML = ""; // Curățăm containerul

        messages.forEach(msg => {
            const div = document.createElement("div");
            div.classList.add("message-bubble");
            
            // Verificăm cine a scris (Eu sau Adminul)
            // msg.sender poate fi null uneori dacă backend-ul nu trimite tot obiectul, 
            // dar conform codului Java trimite obiectul User.
            const senderEmail = msg.sender ? msg.sender.email : "";
            const isMe = (senderEmail === myEmail);
            
            if (isMe) {
                div.classList.add("msg-me");
            } else {
                div.classList.add("msg-other");
            }

            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            div.innerHTML = `
                ${msg.content}
                <span class="msg-time">${time}</span>
            `;
            container.appendChild(div);
        });
    })
    .catch(err => {
        // Dacă tokenul a expirat sau e invalid, oprim polling-ul
        if(err.response && err.response.status === 403) {
            stopPolling();
        }
        console.error(err);
    });
}

function scrollToBottom() {
    const container = document.getElementById("chat-messages");
    if(container) {
        container.scrollTop = container.scrollHeight;
    }
}

// FUNCȚIE GLOBALĂ: Adaugă produs în coș
async function addToCart(productId) {
    const token = localStorage.getItem("userToken");

    if (!token) {
        alert("Te rugăm să te loghezi!");
        return;
    }

    try {
        const response = await axios.post(`${API_URL}/api/cart/add`, {
            productId: productId,
            quantity: 1
        }, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        // --- ACEASTA ESTE CHEIA ---
        // În loc de un simplu alert, chemăm funcția de update
        await updateCartPopupData(); 
        
        console.log("Produs adăugat! Coș actualizat instant.");
        
        // Opțional: un mesaj discret de succes
        showToast("Produs adăugat în coș!"); 

    } catch (error) {
        console.error("Eroare la adăugare:", error);
    }
}

// --- LOGICĂ MINI-CART ---
// Detectăm când mouse-ul intră pe coș pentru a actualiza datele
document.querySelector('.cart-wrapper').addEventListener('mouseenter', () => {
    if(localStorage.getItem("userToken")) {
        updateCartPopupData();
    }
});

async function updateCartPopupData() {
    const token = localStorage.getItem("userToken");
    const itemsContainer = document.getElementById("mini-cart-items");
    const totalPriceEl = document.getElementById("mini-cart-total-price");
    const badgeEl = document.getElementById("cart-count-badge");

    // Dacă nu avem token, nu încercăm să chemăm API-ul (previne erori 401/403)
    if (!token) return;

    try {
        const response = await axios.get(`${API_URL}/api/cart`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const cart = response.data;
        const items = cart.items || [];
        const itemCount = items.length;

        // --- LOGICĂ BADGE (BULINĂ) ---
        if (badgeEl) {
            if (itemCount > 0) {
                badgeEl.innerText = itemCount;
                badgeEl.classList.add("show-badge"); // Adaugă clasa pentru afișare
            } else {
                badgeEl.classList.remove("show-badge"); // Ascunde bulina
            }
        }

        // Curățăm containerul de produse
        if (itemsContainer) itemsContainer.innerHTML = "";

        // Verificăm dacă coșul este gol
        if (itemCount === 0) {
            if (itemsContainer) {
                itemsContainer.innerHTML = "<p style='font-size:12px; color:#999; text-align:center; padding: 10px;'>Coșul este gol.</p>";
            }
            if (totalPriceEl) totalPriceEl.innerText = "0";
            return;
        }

        // Populăm lista de produse
        items.forEach(item => {
            const div = document.createElement("div");
            div.className = "mini-item"; 
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";
            div.style.marginBottom = "10px";
            div.style.fontSize = "13px";
            div.style.padding = "5px 0";
            
            div.innerHTML = `
                <span style="color: #333;">${item.product.productName} <small style="color:#888;">(x${item.quantity})</small></span>
                <span style="font-weight:bold; color: #2c3e50;">${(item.quantity * item.price).toFixed(2)} RON</span>
            `;
            if (itemsContainer) itemsContainer.appendChild(div);
        });

        if (totalPriceEl) {
            totalPriceEl.innerText = cart.totalPrice.toFixed(2);
        }

    } catch (error) {
        console.error("Eroare la mini-cart:", error);
    }
}


// Actualizăm badge-ul și la pornirea paginii (fără pop-up)
document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem("userToken")) {
        updateCartPopupData();
    }
});
let cartTimeout;

const cartWrapper = document.querySelector('.cart-wrapper');
const miniCart = document.getElementById('mini-cart-popup');

if (cartWrapper) {
    cartWrapper.addEventListener('mouseenter', () => {
        clearTimeout(cartTimeout);
        if(localStorage.getItem("userToken")) {
            updateCartPopupData();
        }
    });

    cartWrapper.addEventListener('mouseleave', () => {
        cartTimeout = setTimeout(() => {
            // Logica de închidere dacă e cazul
        }, 300);
    });
}



function renderBadge(count) {
    const badgeEl = document.getElementById("cart-count-badge");
    if (!badgeEl) return;

    if (count > 0) {
        badgeEl.innerText = count;
        badgeEl.classList.remove("badge-hidden");
        badgeEl.style.display = "flex"; // Sau "block", depinde de designul tău
    } else {
        badgeEl.classList.add("badge-hidden");
    }
}

// Apoi, în interiorul updateCartPopupData, după ce primești 'cart' de la server:



// ========================================
//             cod pt newsletter
// ========================================
function subscribeNewsletter() {
    const emailInput = document.getElementById("footer-email");
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
        alert("Te rugăm să introduci o adresă de email validă!");
        return;
    }

    axios.post(`${API_URL}/api/newsletter/subscribe`, { email: email })
        .then(res => {
            alert("Te-ai abonat cu succes!");
            emailInput.value = "";
        })
        .catch(err => {
            alert(err.response?.data || "Eroare la abonare.");
        });
}
document.addEventListener("DOMContentLoaded", () => {
    const mobileBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.getElementById("mobile-sidebar");
    const closeBtn = document.getElementById("mobile-sidebar-close");
    const overlay = document.getElementById("sidebar-overlay");
    const sidebarLinks = document.getElementById("sidebar-links-container");

    // Deschidere sidebar
    if (mobileBtn) {
        mobileBtn.addEventListener("click", () => {
            populateSidebar();
            sidebar.classList.add("active");
            overlay.style.display = "block";
        });
    }

    // Închidere sidebar
    const closeMenu = () => {
        sidebar.classList.remove("active");
        overlay.style.display = "none";
    };

    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    if (overlay) overlay.addEventListener("click", closeMenu);

    function populateSidebar() {
    const token = localStorage.getItem("userToken");
    const role = localStorage.getItem("userRole");

    // Link-uri de bază (Home, Shop, Contact) cu iconițe Lucide
    let html = `
        <li><a href="index.html"><i data-lucide="home"></i> Home</a></li>
        <li><a href="shop.html"><i data-lucide="shopping-bag"></i> Shop</a></li>
        <li><a href="contact.html"><i data-lucide="mail"></i> Contact</a></li>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
    `;

    // Dacă e logat, adăugăm butoanele din dropdown în sidebar
    if (token) {
        html += `
            <li><a href="profile.html"><i data-lucide="user"></i> Contul meu</a></li>
            <li><a href="orders.html"><i data-lucide="package"></i> Comenzile mele</a></li>
            <li><a href="favorites.html"><i data-lucide="heart"></i> Favorite</a></li>
            ${role === "ROLE_ADMIN" ? '<li><a href="admin-dashboard.html" style="color:red;"><i data-lucide="shield-check" style="color:red;"></i> Admin Panel</a></li>' : ''}
            <li><a href="javascript:void(0)" id="mobile-logout-btn" style="color:#666;"><i data-lucide="log-out"></i> Deconectare</a></li>
        `;
    } else {
        html += `<li><a href="login.html"><i data-lucide="log-in"></i> Autentificare</a></li>`;
    }

    sidebarLinks.innerHTML = html;

    // IMPORTANT: Spunem librăriei Lucide să deseneze iconițele noi injectate
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Atașăm logout
    const mobileLogout = document.getElementById("mobile-logout-btn");
    if (mobileLogout) {
        mobileLogout.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}
});