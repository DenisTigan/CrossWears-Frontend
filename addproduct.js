document.getElementById("addProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const msg = document.getElementById("msg");
    
    // 1. VERIFICARE TOKEN (Securitate)
    const token = localStorage.getItem("userToken");
    if (!token) {
        msg.textContent = "Trebuie să fii logat ca Admin!";
        msg.style.color = "red";
        setTimeout(() => window.location.href = "login.html", 2000);
        return;
    }

    const product = {
        productName: document.getElementById("productName").value,
        productDescription: document.getElementById("productDescription").value,
        productPrice: document.getElementById("productPrice").value,
        quantity: document.getElementById("quantity").value,
        available: document.getElementById("available").value === "true"
    };

    const imageFile = document.getElementById("imageFile").files[0];

    if (!imageFile) {
        msg.textContent = "Trebuie să selectezi o imagine!";
        msg.style.color = "red";
        return;
    }

    const formData = new FormData();
    formData.append("product", new Blob([JSON.stringify(product)], { type: "application/json" }));
    formData.append("imageFile", imageFile);

    try {
        const response = await axios.post(
            "http://localhost:8080/api/product",
            formData,
            { 
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Authorization": "Bearer " + token // <--- CHEIA MAGICĂ AICI
                } 
            }
        );

        msg.textContent = "Produs adăugat cu succes!";
        msg.style.color = "lightgreen";
        console.log(response.data);
        
        // Resetare formular opțională
        e.target.reset();

    } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 403) {
            msg.textContent = "Nu ai permisiunea de Admin!";
        } else {
            msg.textContent = "Eroare la adăugare!";
        }
        msg.style.color = "red";
    }
});