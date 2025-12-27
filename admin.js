const API_BASE = "http://localhost:8080/api";
const CHAT_API = `${API_BASE}/chat`;

// --- VARIABILE PENTRU CHAT (NU LE ATINGEM) ---
let selectedClientId = null;
let adminChatInterval = null;

// =========================================================
// 1. LOGICA PENTRU COMENZI (NOUĂ)
// =========================================================

// Funcția care aduce comenzile din server
function loadOrders() {
    const token = localStorage.getItem("userToken");
    const tbody = document.getElementById("orders-tbody");
    
    // Resetăm tabelul
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Se actualizează lista...</td></tr>";

    axios.get(`${API_BASE}/admin/all`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const orders = res.data;
        tbody.innerHTML = ""; // Golim mesajul de încărcare

        if (orders.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Nu există comenzi.</td></tr>";
            return;
        }

        // Sortăm comenzile: cele mai noi primele (după ID descrescător)
        orders.sort((a, b) => b.id - a.id);

        orders.forEach(order => {
            const tr = document.createElement("tr");
            
            // Formatare dată (dacă orderDate e string ISO)
            const dateObj = new Date(order.orderDate);
            const dateStr = dateObj.toLocaleDateString('ro-RO') + " " + dateObj.toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'});

            // Status Styling
            let statusClass = "pending";
            if (order.status === "PAID") statusClass = "paid"; // Verde (din CSS-ul tau)
            if (order.status === "CANCELLED") statusClass = "cancelled"; // Roșu

            // Butoanele apar doar dacă comanda nu e deja Finalizată/Anulată
            // Sau le lăsăm mereu active dacă vrei să te răzgândești
            let actionsHtml = '';
            if (order.status !== 'PAID' && order.status !== 'CANCELLED') {
                 actionsHtml = `
                    <button class="btn-small" style="background-color:#28a745; margin-right:5px;" onclick="updateOrderStatus(${order.id}, 'PAID')">Acceptă</button>
                    <button class="btn-small delete" style="background-color:#dc3545;" onclick="updateOrderStatus(${order.id}, 'CANCELLED')">Refuză</button>
                 `;
            } else {
                actionsHtml = `<span style="color:#888; font-size:12px;">Finalizat</span>`;
            }

            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.userEmail}</td>
                <td>${order.totalAmount} RON</td>
                <td>${dateStr}</td>
                <td><span class="badge ${statusClass}">${order.status}</span></td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error("Eroare comenzi:", err);
        tbody.innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>Eroare la încărcarea comenzilor (Verifică consola).</td></tr>";
    });
}

// Funcția care trimite statusul nou la server
function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem("userToken");
    
    // Întrebare de siguranță
    let confirmMsg = newStatus === 'PAID' ? "Acepți comanda?" : "Refuzi comanda?";
    if (!confirm(confirmMsg)) return;

    axios.put(`${API_BASE}/admin/${orderId}/status`, 
        { status: newStatus },
        { headers: { 'Authorization': 'Bearer ' + token } }
    )
    .then(res => {
        // Reîncărcăm tabelul ca să vedem modificarea
        loadOrders();
    })
    .catch(err => {
        alert("Eroare la actualizarea statusului!");
        console.error(err);
    });
}

// =========================================================
// 2. LOGICA PENTRU CHAT (EXISTENTĂ - NEMODIFICATĂ)
// =========================================================

function initMessagesSection() {
    loadClientsList();
}

function loadClientsList() {
    const token = localStorage.getItem("userToken");
    const list = document.getElementById("clients-list");

    axios.get(`${CHAT_API}/list-clients`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const clients = res.data;
        list.innerHTML = "";

        if (clients.length === 0) {
            list.innerHTML = "<li style='padding:15px; text-align:center;'>Niciun mesaj încă.</li>";
            return;
        }

        clients.forEach(client => {
            const li = document.createElement("li");
            li.classList.add("chat-user-item");
            li.onclick = () => selectClient(client.id, client.fullName || client.email, li);
            
            const initials = (client.fullName || client.email).substring(0, 2).toUpperCase();

            li.innerHTML = `
                <div class="user-avatar-placeholder">${initials}</div>
                <div>
                    <div style="font-weight:bold;">${client.fullName || "Fără Nume"}</div>
                    <div style="font-size:12px; color:#666;">${client.email}</div>
                </div>
            `;
            list.appendChild(li);
        });
    })
    .catch(err => console.error("Eroare lista clienți:", err));
}

function selectClient(clientId, clientName, liElement) {
    selectedClientId = clientId;
    document.querySelectorAll(".chat-user-item").forEach(item => item.classList.remove("active"));
    liElement.classList.add("active");

    document.getElementById("chat-conversation-header").innerHTML = `<span>Conversație cu: <strong>${clientName}</strong></span>`;
    document.getElementById("admin-input-container").style.display = "flex";

    if (adminChatInterval) clearInterval(adminChatInterval);
    loadConversation(clientId);
    adminChatInterval = setInterval(() => loadConversation(clientId), 3000);
}

function loadConversation(clientId) {
    const token = localStorage.getItem("userToken");
    const container = document.getElementById("admin-messages-box");

    axios.get(`${CHAT_API}/history?userId=${clientId}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const messages = res.data;
        container.innerHTML = "";

        if (messages.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#999;'>Începe conversația...</p>";
            return;
        }

        messages.forEach(msg => {
            const div = document.createElement("div");
            div.classList.add("msg-bubble");
            const isMe = (msg.sender && msg.sender.role === "ROLE_ADMIN");

            if (isMe) {
                div.classList.add("msg-admin");
            } else {
                div.classList.add("msg-client");
            }

            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            div.innerHTML = `${msg.content} <div style="font-size:10px; text-align:right; opacity:0.7;">${time}</div>`;
            container.appendChild(div);
        });
    })
    .catch(err => console.error(err));
}

function sendAdminMessage() {
    const input = document.getElementById("admin-msg-input");
    const content = input.value.trim();
    const token = localStorage.getItem("userToken");

    if (!content || !selectedClientId) return;

    const data = {
        content: content,
        receiverId: selectedClientId
    };

    axios.post(`${CHAT_API}/send`, data, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        input.value = "";
        loadConversation(selectedClientId);
    })
    .catch(err => alert("Eroare la trimitere!"));
}

// =========================================================
// 3. NAVIGARE (showSection) - MODIFICAT SĂ INCLUDĂ COMENZILE
// =========================================================

function showSection(sectionId, element) {
    // 1. Ascunde toate secțiunile
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.style.display = 'none');

    // 2. Afișează secțiunea selectată
    const activeSection = document.getElementById(sectionId);
    if(activeSection) {
        activeSection.style.display = 'block';
    }

    // 3. Actualizează clasa 'active' în sidebar
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    
    if(element) {
        element.classList.add('active');
    }

    // --- LOGICA DE ÎNCĂRCARE DATE ---
    if (sectionId === 'dashboard') {
        updateDashboard(); // <--- Aceasta încarcă statisticile (0 RON, etc)
    }
    if (sectionId === 'messages') {
        initMessagesSection();
    }
    if (sectionId === 'orders') {
        loadOrders(); 
    }
    if (sectionId === 'products') {
        loadProducts();
    }
    if (sectionId === 'users') {
        loadUsers();
    }
    if (sectionId === 'newsletter') {
    loadNewsletterHistory(); // Fără această linie, tabelul nu se va popula niciodată!
}
}


// =========================================================
// 4. LOGICA PENTRU PRODUSE (NOUĂ)
// =========================================================


function loadProducts() {
    const tbody = document.getElementById("products-tbody");
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Se actualizează lista...</td></tr>";

    const token = localStorage.getItem("userToken");

    axios.get(`${API_BASE}/products`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const products = res.data;
        tbody.innerHTML = "";

        if (products.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Nu există produse.</td></tr>";
            return;
        }

        // Sortare: cele mai noi sus
        products.sort((a, b) => b.productId - a.productId);

        products.forEach(product => {
            const tr = document.createElement("tr");

            // 1. URL Imagine
            const imageUrl = `${API_BASE}/product/${product.productId}/image`;

            // 2. Link către pagina publică (Folosim "id")
            const publicLink = `product.html?id=${product.productId}`;

            // 3. Link către pagina de Update
            const updateLink = `updateProduct.html?id=${product.productId}`;

            tr.innerHTML = `
                <td>#${product.productId}</td>
                <td>
                    <a href="${publicLink}">
                        <img src="${imageUrl}" 
                             alt="${product.productName}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;"
                             onerror="this.src='https://via.placeholder.com/50?text=No+Img'">
                    </a>
                </td>
                <td>
                    <a href="${publicLink}" style="text-decoration: none; color: #333; font-weight: bold;">
                        ${product.productName}
                    </a>
                </td>
                <td>${product.productPrice} RON</td>
                <td>${product.quantity} buc.</td>
                <td>
                    <a href="${updateLink}" class="btn-small" style="background-color: #00ff4cff; color: white; text-decoration: none; display:inline-block; margin-right:5px; padding: 6px 12px; border-radius: 4px;">
                        Editează
                    </a>
                    <button class="btn-small delete" style="background-color: #dc3545;" onclick="deleteProduct(${product.productId})">
                        Șterge
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error("Eroare produse:", err);
        tbody.innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>Eroare la încărcare.</td></tr>";
    });
}

// Funcția de ștergere produs
function deleteProduct(productId) {
    const token = localStorage.getItem("userToken");
    
    if(!confirm("Ești sigur că vrei să ștergi acest produs? Această acțiune este ireversibilă!")) return;

    // Conform Security Config-ul tău, DELETE este pe /api/product/{id} (singular)
    axios.delete(`${API_BASE}/product/${productId}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        alert("Produs șters cu succes!");
        loadProducts(); // Reîncărcăm tabelul
    })
    .catch(err => {
        console.error(err);
        alert("Eroare la ștergerea produsului! Verifică dacă ai drepturi de Admin.");
    });
}

// =========================================================
// 5. LOGICA PENTRU UTILIZATORI (NOUĂ)
// =========================================================

function loadUsers() {
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Se actualizează lista...</td></tr>";

    const token = localStorage.getItem("userToken");

    // Apelăm noul endpoint creat la Pasul 1
    axios.get(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const users = res.data;
        tbody.innerHTML = "";

        if (users.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nu există utilizatori.</td></tr>";
            return;
        }

        users.forEach(user => {
            const tr = document.createElement("tr");

            // Verificăm dacă e Admin sau User simplu pentru stilizare
            const isMyAccount = (user.email === localStorage.getItem("userEmail")); // Dacă vrei să marchezi contul tău
            const roleStyle = user.role === 'ADMIN' || user.role === 'ROLE_ADMIN' 
                              ? '<span style="color:#00a6ff; font-weight:bold;">ADMIN</span>' 
                              : 'USER';

            // Butonul de ștergere apare doar dacă NU e admin (ca să nu te ștergi pe tine sau alți admini)
            // Sau poți pune condiția: if (!isMyAccount)
            let actionBtn = '-';
            if (user.role !== 'ADMIN' && user.role !== 'ROLE_ADMIN') {
                actionBtn = `
                    <button class="btn-small delete" style="background-color: #dc3545;" onclick="deleteUser(${user.id})">
                        Șterge / Block
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.fullName || "Fără nume"}</td>
                <td>${user.email}</td>
                <td>${roleStyle}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error("Eroare utilizatori:", err);
        tbody.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Eroare la încărcare (403/500).</td></tr>";
    });
}

// Funcția de ștergere utilizator
function deleteUser(userId) {
    const token = localStorage.getItem("userToken");
    if(!confirm("Sigur vrei să ștergi acest utilizator?")) return;

    axios.delete(`${API_BASE}/admin/users/${userId}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(() => {
        alert("Utilizator șters!");
        loadUsers(); // Refresh la tabel
    })
    .catch(err => {
        alert("Eroare la ștergere.");
    });
}

// =========================================================
// 6. DASHBOARD DINAMIC (STATISTICI REALE)
// =========================================================

async function updateDashboard() {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    try {
        const [ordersRes, usersRes] = await Promise.all([
            axios.get(`${API_BASE}/admin/all`, { headers: { 'Authorization': 'Bearer ' + token } }),
            axios.get(`${API_BASE}/admin/users`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        // În interiorul try-ului din updateDashboard:
        const clientsRes = await axios.get(`${API_BASE}/chat/list-clients`, { 
        headers: { 'Authorization': 'Bearer ' + token } 
        });
document.getElementById("stat-messages").innerText = clientsRes.data.length;
        const orders = ordersRes.data;
        const users = usersRes.data;

        // DEBUG: Vedem în consolă ce date avem
        console.log("Comenzi primite:", orders);
        console.log("Utilizatori primiți:", users);

        // 1. Calculăm Vânzările 
        // Verificăm dacă ai scris "PAID", "Platit" sau altceva în DB
        const totalSales = orders
            .filter(o => o.status === "PAID" || o.status === "Finalizată") 
            .reduce((sum, o) => sum + o.totalAmount, 0);

        // 2. Comenzi Noi
        // Dacă în baza de date statusul e "PENDING", "Nouă" sau "In asteptare"
        const newOrders = orders.filter(o => o.status === "PENDING" || o.status === "In asteptare").length;

        // 3. Clienți Totali
        const totalUsers = users.length;

        // Actualizăm UI
        document.getElementById("stat-sales").innerText = `${totalSales.toFixed(2)} RON`;
        document.getElementById("stat-orders").innerText = newOrders;
        document.getElementById("stat-users").innerText = totalUsers;

    } catch (err) {
        console.error("Eroare Dashboard:", err);
    }
}


// Setăm Dashboard-ul ca default la încărcare
document.addEventListener("DOMContentLoaded", () => {
    // 1. Pornim automat pe Dashboard
    const dashboardLink = document.querySelector('.sidebar-menu li'); 
    showSection('dashboard', dashboardLink);
    
    // 2. Inițializăm iconițele Lucide (dacă le folosești)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 3. Logică Deconectare
    const logoutBtn = document.querySelector('.logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
});

function handleSendNewsletter() {
    const token = localStorage.getItem("userToken");
    const subject = document.getElementById("newsletter-subject").value;
    const message = document.getElementById("newsletter-content").value;

    if (!subject || !message) {
        alert("Completează subiectul și mesajul!");
        return;
    }

    if (!confirm("Sigur vrei să trimiți acest newsletter către TOȚI abonații?")) return;

    const btn = document.querySelector(".btn-send-newsletter");
    btn.innerText = "Se trimite...";
    btn.disabled = true;

    axios.post(`${API_BASE}/newsletter/admin/send`, 
        { subject: subject, message: message },
        { headers: { 'Authorization': 'Bearer ' + token } }
    )
    .then(res => {
        // Aici va apărea mesajul: "Newsletter trimis către X persoane!"
        alert(res.data);
        document.getElementById("newsletter-subject").value = "";
        document.getElementById("newsletter-content").value = "";
    })
    .catch(err => {
        console.error(err);
        alert("Eroare la trimitere! Verifică setările Gmail din application.properties.");
    })
    .finally(() => {
        btn.innerText = "Trimite la toți abonații";
        btn.disabled = false;
    });
}
function loadNewsletterHistory() {
    const token = localStorage.getItem("userToken");
    axios.get(`${API_BASE}/newsletter/admin/history`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const tbody = document.getElementById("newsletter-history-tbody");
        tbody.innerHTML = res.data.map(log => `
            <tr>
                <td>${new Date(log.sentAt).toLocaleString()}</td>
                <td>${log.subject}</td>
                <td>${log.recipientCount} persoane</td>
            </tr>
        `).join('');
    });
}

// Apelează loadNewsletterHistory() în showSection('newsletter')
if (sectionId === 'newsletter') {
    loadNewsletterHistory();
}