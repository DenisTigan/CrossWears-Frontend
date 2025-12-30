// Funcție pentru a adăuga rânduri noi de imagini în formular
function addImageRow() {
    const container = document.getElementById("imageInputsContainer");
    const div = document.createElement("div");
    div.className = "image-upload-row";
    div.style.marginBottom = "10px";
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.alignItems = "center";
    
    div.innerHTML = `
        <input type="file" class="image-file-input" accept="image/*" required>
        <select class="image-color-select">
            <option value="Alb">Culoare: Alb</option>
            <option value="Negru">Culoare: Negru</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="background:red; color:white; border:none; padding:2px 7px; border-radius:50%; cursor:pointer;">x</button>
    `;
    container.appendChild(div);
}

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    const token = localStorage.getItem("userToken");

    if (!token) {
        msg.textContent = "Sesiune expirată! Relogați-vă.";
        msg.style.color = "red";
        return;
    }

    // 1. Colectăm Variantele de stoc (S, M, L, XL)
    const variants = [];
    document.querySelectorAll(".stock-input").forEach(input => {
        variants.push({
            size: input.getAttribute("data-size"),
            color: input.getAttribute("data-color"),
            quantity: parseInt(input.value) || 0
        });
    });

    // 2. Colectăm imaginile și culorile lor
    const imageFiles = [];
    const imageColors = [];
    document.querySelectorAll(".image-upload-row").forEach(row => {
        const fileInput = row.querySelector(".image-file-input");
        const colorSelect = row.querySelector(".image-color-select");
        
        if (fileInput.files[0]) {
            imageFiles.push(fileInput.files[0]);
            imageColors.push(colorSelect.value);
        }
    });

    // 3. Construim obiectul ProductDTO
    const productDTO = {
        productName: document.getElementById("productName").value,
        productDescription: document.getElementById("productDescription").value,
        productPrice: document.getElementById("productPrice").value,
        available: document.getElementById("available").value === "true",
        variants: variants,      // Lista de mărimi și stocuri
        imageColors: imageColors // Lista de culori (indexată la fel ca imaginile)
    };

    // 4. Pregătim FormData pentru trimitere
    const formData = new FormData();
    // Partea de JSON (trebuie trimisă ca Blob cu tip application/json)
    formData.append("product", new Blob([JSON.stringify(productDTO)], { type: "application/json" }));
    
    // Adăugăm fișierele de imagine
    imageFiles.forEach(file => {
        formData.append("imageFiles", file);
    });

    try {
        msg.textContent = "Se trimit datele...";
        msg.style.color = "orange";

        const response = await axios.post(
            `${API_URL}/api/product`,
            formData,
            { 
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Authorization": "Bearer " + token 
                } 
            }
        );

        msg.textContent = "Produsul cu variante a fost adăugat cu succes!";
        msg.style.color = "lightgreen";
        e.target.reset();
        
        // Curățăm rândurile extra de imagini dacă există
        document.getElementById("imageInputsContainer").innerHTML = `
            <div class="image-upload-row" style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
                <input type="file" class="image-file-input" accept="image/*" required>
                <select class="image-color-select">
                    <option value="Alb">Culoare: Alb</option>
                    <option value="Negru">Culoare: Negru</option>
                </select>
            </div>
        `;

    } catch (err) {
        console.error(err);
        msg.textContent = "Eroare la salvare! Verifică consola.";
        msg.style.color = "red";
    }
});