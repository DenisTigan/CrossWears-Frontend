const API_BASE_URL = `${API_URL}/api/auth`;

// --- LOGICA PENTRU SIGNUP (ÎNREGISTRARE) ---
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Oprește reîncărcarea paginii

        // 1. Luăm datele din input-uri
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // 2. Le trimitem la server (Java)
        axios.post(`${API_BASE_URL}/register`, {
            fullName: fullName,
            email: email,
            password: password
        })
        .then(response => {
            // SUCCES
            alert("Cont creat cu succes! Te rugăm să te loghezi.");
            window.location.href = "login.html"; // Redirecționăm la login
        })
        .catch(error => {
            // EROARE
            console.error(error);
            if (error.response && error.response.data) {
                alert("Eroare: " + error.response.data); // Mesajul de la Java (ex: Email existent)
            } else {
                alert("A apărut o eroare la server.");
            }
        });
    });
}

// --- LOGICA PENTRU LOGIN (AUTENTIFICARE) ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        axios.post(`${API_BASE_URL}/login`, {
            email: email,
            password: password
        })
        .then(response => {
            // SUCCES - Primim Token-ul JWT
            const data = response.data;
            
            console.log("Login reușit:", data);

            // 3. SALVĂM TOKENUL ÎN BROWSER (localStorage)
            // Asta e "Ecusonul" de care vorbeam
            localStorage.setItem("userToken", data.token);
            localStorage.setItem("userId", data.id);
            localStorage.setItem("userEmail", data.email);
            localStorage.setItem("userName", data.fullName);
            localStorage.setItem("userRole", data.role); // Important pentru Admin Panel

            alert("Bine ai venit, " + data.fullName + "!");
            
            // Redirecționăm la pagina principală
            window.location.href = "index.html";
        })
        .catch(error => {
            console.error(error);
            alert("Email sau parolă incorectă!");
        });
    });
}