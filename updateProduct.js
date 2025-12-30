const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const API_BASE = `${API_URL}/api`;
const msg = document.getElementById("responseMsg");

document.addEventListener("DOMContentLoaded", () => {
    if (!productId) return showError("ID lipsă!");
    
    // Setăm ID-ul vizual dacă elementul există
    const displayId = document.getElementById("display-id");
    if (displayId) displayId.innerText = productId;

    loadExistingProductData();
    
    // Verificăm dacă Lucide este disponibil înainte de a-l apela
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 1. Încărcăm datele existente ale produsului
async function loadExistingProductData() {
    try {
        const res = await axios.get(`${API_BASE}/product/${productId}`);
        const p = res.data;

        // Populare câmpuri de bază
        document.getElementById("productName").value = p.productName;
        document.getElementById("productDescription").value = p.productDescription;
        document.getElementById("productPrice").value = p.productPrice;
        document.getElementById("available").value = p.available.toString();

        // 1.1. Populare Variante (Mărime/Culoare/Stoc)
        const variantsContainer = document.getElementById("variants-container");
        if (variantsContainer) {
            variantsContainer.innerHTML = "";
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => addVariantRow(v.color, v.size, v.quantity, v.id));
            } else {
                addVariantRow(); // Un rând gol dacă nu are variante
            }
        }

        // 1.2. AFIȘARE GALERIE EXISTENTĂ PENTRU EDITARE/ȘTERGERE
        const galleryContainer = document.getElementById("existing-gallery-container");
        if (galleryContainer && p.images) {
            galleryContainer.innerHTML = p.images.map(img => `
                <div class="existing-img-card" id="img-wrapper-${img.imageId}">
                    <div class="img-preview-box">
                        <img src="${API_BASE}/product/image/${img.imageId}" alt="Product">
                        <div class="img-color-tag">${img.color || 'General'}</div>
                    </div>
                    <button type="button" class="btn-delete-img" onclick="deleteImage(${img.imageId})" title="Șterge imaginea">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Eroare la încărcare date:", err);
        showError("Nu am putut prelua datele produsului.");
    }
}

// --- 2. ȘTERGERE IMAGINE DIN GALERIE ---
function deleteImage(imageId) {
    if (!confirm("Ești sigur că vrei să elimini definitiv această imagine din galerie?")) return;
    
    const token = localStorage.getItem("userToken");
    
    // Apelăm endpoint-ul de DELETE din Backend
    axios.delete(`${API_BASE}/product/image/${imageId}`, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(() => {
        // Eliminăm cardul din interfață cu un efect vizual
        const el = document.getElementById(`img-wrapper-${imageId}`);
        if (el) {
            el.style.opacity = "0";
            el.style.transform = "scale(0.8)";
            setTimeout(() => el.remove(), 300);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Eroare: Nu s-a putut șterge imaginea. Verifică drepturile de admin.");
    });
}

// 2. Gestionare Rânduri Dinamice (Variante)
function addVariantRow(color = "", size = "", qty = 0, variantId = null) {
    const container = document.getElementById("variants-container");
    const div = document.createElement("div");
    div.className = "dynamic-row";
    div.innerHTML = `
        <input type="hidden" class="v-id" value="${variantId || ''}">
        <input type="text" class="form-input v-color" placeholder="Culoare (ex: Alb)" value="${color}" required>
        <input type="text" class="form-input v-size" placeholder="Mărime" value="${size}" required style="width:80px;">
        <input type="number" class="form-input v-qty" placeholder="Stoc" value="${qty}" min="0" required style="width:80px;">
        <button type="button" class="btn-danger" onclick="this.parentElement.remove()"><i data-lucide="trash-2"></i></button>
    `;
    container.appendChild(div);
    if (window.lucide) lucide.createIcons();
}

// 3. Gestionare Rânduri Dinamice (Imagini)
function addImageRow() {
    const container = document.getElementById("images-upload-container");
    const div = document.createElement("div");
    div.className = "dynamic-row image-upload-item"; // Clasă nouă pentru selectare
    div.innerHTML = `
        <input type="file" class="image-file-input" accept="image/*" required>
        <input type="text" class="form-input image-color-input" placeholder="Culoare asociată imaginii" required>
        <button type="button" class="btn-danger" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>
    `;
    container.appendChild(div);
    if (window.lucide) lucide.createIcons();
}

// Caută în fișierul tău partea care începe cu document.getElementById("update-form").addEventListener...
// Și înlocuiește TOT blocul cu acesta:

// Înlocuiește tot evenimentul de submit cu acesta:
document.getElementById("update-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("userToken");
    const submitBtn = document.querySelector('.btn-save');

    // 1. Colectăm variantele
    const variants = Array.from(document.querySelectorAll("#variants-container .dynamic-row")).map(row => ({
        id: row.querySelector(".v-id").value ? parseInt(row.querySelector(".v-id").value) : null,
        color: row.querySelector(".v-color").value.trim(),
        size: row.querySelector(".v-size").value.trim(),
        quantity: parseInt(row.querySelector(".v-qty").value) || 0
    }));

    // 2. Pregătim listele pentru imagini noi
    const imageUploadRows = document.querySelectorAll(".image-upload-item");
    let imageFiles = [];
    let imageColors = []; // Această listă trebuie să ajungă în DTO

    imageUploadRows.forEach(row => {
        const file = row.querySelector(".image-file-input").files[0];
        const color = row.querySelector(".image-color-input").value.trim();
        if (file) {
            imageFiles.push(file);
            imageColors.push(color || "General");
        }
    });

    // 3. Construim DTO-ul care să includă și culorile imaginilor
    const productDto = {
        productName: document.getElementById("productName").value.trim(),
        productDescription: document.getElementById("productDescription").value.trim(),
        productPrice: parseFloat(document.getElementById("productPrice").value),
        available: document.getElementById("available").value === "true",
        variants: variants,
        imageColors: imageColors // <--- ESENȚIAL: Service-ul Java citește de aici
    };

    const formData = new FormData();
    // Adăugăm obiectul de date ca un singur "part" numit "product"
    formData.append("product", new Blob([JSON.stringify(productDto)], { type: "application/json" }));

    // Adăugăm fișierele fizice sub numele "imageFiles"
    imageFiles.forEach(file => {
        formData.append("imageFiles", file);
    });

    // Trimitere Blob gol dacă nu avem poze, pentru a evita eroarea "MissingPart"
    if (imageFiles.length === 0) {
        formData.append("imageFiles", new Blob([], { type: "application/octet-stream" }));
    }

    try {
        submitBtn.disabled = true;
        await axios.put(`${API_BASE}/product/${productId}`, formData, {
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "multipart/form-data" 
            }
        });
        showSuccess("Produs actualizat! ✅");
        setTimeout(() => window.location.href = `product.html?id=${productId}`, 1500);
    } catch (err) {
        console.error(err);
        showError("Eroare la salvare: " + (err.response?.data || "Verifică consola"));
        submitBtn.disabled = false;
    }
});
function showError(m) { 
    msg.innerHTML = `<span style="color:red; font-weight:bold;">❌ ${m}</span>`; 
}
function showSuccess(m) { 
    msg.innerHTML = `<span style="color:green; font-weight:bold;">✅ ${m}</span>`; 
}