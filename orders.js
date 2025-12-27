document.addEventListener("DOMContentLoaded", () => {
    loadMyOrders();
});

function loadMyOrders() {
    const token = localStorage.getItem("userToken");
    const tbody = document.getElementById("my-orders-tbody");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Endpoint-ul creat la Pasul 1
    axios.get("http://localhost:8080/api/my-orders", {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => {
        const orders = res.data;
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Nu ai făcut nicio comandă încă.</td></tr>";
            return;
        }

        // Sortăm să apară cele mai noi primele
        orders.sort((a, b) => b.id - a.id);

        orders.forEach(order => {
            const tr = document.createElement("tr");
            
            // Formatare dată
            const dateStr = new Date(order.orderDate).toLocaleDateString('ro-RO');

            // Stilizare status (culori)
            let statusBadge = "";
            if (order.status === "PAID") {
                statusBadge = `<span class="badge paid">Finalizată</span>`;
            } else if (order.status === "CANCELLED") {
                statusBadge = `<span class="badge cancelled">Anulată</span>`;
            } else {
                statusBadge = `<span class="badge pending">În procesare</span>`;
            }

            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>${dateStr}</td>
                <td style="font-weight:bold;">${order.totalAmount} RON</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error("Eroare la încărcarea comenzilor:", err);
        tbody.innerHTML = "<tr><td colspan='4' style='color:red; text-align:center;'>Sesiune expirată. Te rugăm să te reloghezi.</td></tr>";
    });
}