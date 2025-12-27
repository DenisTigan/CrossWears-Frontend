const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

const form = document.getElementById("update-form"); 
const msg = document.getElementById("responseMsg");
const API_BASE = "http://localhost:8080/api";

// 1️⃣ Preluăm datele produsului la încărcare
if (productId) {
    axios.get(`${API_BASE}/product/${productId}`)
        .then(res => {
            const p = res.data;

            document.getElementById("productName").value = p.productName;
            document.getElementById("productDescription").value = p.productDescription;
            document.getElementById("productPrice").value = p.productPrice;
            document.getElementById("quantity").value = p.quantity;
            
            const availInput = document.getElementById("available");
            if(availInput) availInput.value = p.available;
        })
        .catch(err => {
            if(msg) msg.innerHTML = "<span style='color:red;'>Produsul nu există.</span>";
        });
}

// 2️⃣ Trimiterea UPDATE-ului
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // A. VERIFICARE TOKEN
        const token = localStorage.getItem("userToken");
        if (!token) {
            if(msg) {
                msg.innerHTML = "<span style='color:red;'>Sesiune expirată. Te rugăm să te loghezi.</span>";
            } else {
                alert("Sesiune expirată!");
            }
            setTimeout(() => window.location.href = "login.html", 2000);
            return;
        }

        const formData = new FormData();

        // JSON-ul produsului
        const productJson = {
            productName: document.getElementById("productName").value,
            productDescription: document.getElementById("productDescription").value,
            productPrice: document.getElementById("productPrice").value,
            quantity: document.getElementById("quantity").value,
            available: document.getElementById("available").value === "true"
        };

        formData.append("product", new Blob([JSON.stringify(productJson)], { type: "application/json" }));

        // Imaginea – doar dacă este selectată
        const file = document.getElementById("imageFile").files[0];
        if (file) {
            formData.append("imageFile", file);
        } else {
            // Trimitem un Blob gol ca să nu avem erori în Java
            formData.append("imageFile", new Blob([], { type: "application/octet-stream" }), "empty.jpg");
        }

        try {
            await axios.put(
                `${API_BASE}/product/${productId}`,
                formData,
                { 
                    headers: { 
                        "Content-Type": "multipart/form-data",
                        "Authorization": "Bearer " + token 
                    } 
                }
            );

            // AICI AM MODIFICAT: Doar afișăm mesajul în pagină, fără alertă
            if(msg) msg.innerHTML = "<span style='color:green; font-weight:bold;'>Produs actualizat cu succes! ✅</span>";
            
            // Opțional: Poți face redirect automat după 2 secunde înapoi la produs
            // setTimeout(() => window.location.href = `product.html?id=${productId}`, 2000);
            
        } catch (err) {
            console.error(err);
            let errorText = "Eroare la actualizare.";
            
            if (err.response && err.response.status === 403) {
                errorText = "Nu ai drepturi de Admin!";
            }
            
            if(msg) msg.innerHTML = `<span style='color:red;'>${errorText}</span>`;
        }
    });
}