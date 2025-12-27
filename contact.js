document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById('contactForm');
    
    // Funcție pentru precompletare (o refolosim și după reset)
    const fillUserData = () => {
        const savedName = localStorage.getItem("userName");
        const savedEmail = localStorage.getItem("userEmail");
        if (savedName) document.getElementById('name').value = savedName;
        if (savedEmail) document.getElementById('email').value = savedEmail;
    };

    fillUserData();

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); 

            const contactData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            axios.post('http://localhost:8080/api/contact/send', contactData)
                .then(response => {
                    // 1. Notificăm utilizatorul
                    alert("Mesajul tău a fost trimis cu succes! ✉️");
                    
                    // 2. GOLIREA CÂMPURILOR
                    contactForm.reset(); 
                    
                    // 3. RE-COMPLETARE (Opțional: punem datele userului înapoi dacă e logat)
                    fillUserData();
                })
                .catch(error => {
                    console.error("Eroare la trimitere:", error);
                    alert("A apărut o eroare la trimitere. Te rugăm să încerci mai târziu.");
                });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById('contactForm');
    // Identificăm butonul de trimitere din interiorul formularului
    const submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
    
    const fillUserData = () => {
        const savedName = localStorage.getItem("userName");
        const savedEmail = localStorage.getItem("userEmail");
        if (savedName) document.getElementById('name').value = savedName;
        if (savedEmail) document.getElementById('email').value = savedEmail;
    };

    fillUserData();

    if (contactForm && submitBtn) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); 

            // --- PAS 1: Vizual - Dezactivăm butonul ---
            submitBtn.disabled = true;
            submitBtn.innerText = "Se trimite...";
            submitBtn.classList.add("btn-sending");

            const contactData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            axios.post('http://localhost:8080/api/contact/send', contactData)
                .then(response => {
                    alert("Mesajul tău a fost trimis cu succes! ✉️");
                    contactForm.reset(); 
                    fillUserData();
                })
                .catch(error => {
                    console.error("Eroare la trimitere:", error);
                    alert("A apărut o eroare la trimitere.");
                })
                .finally(() => {
                    // --- PAS 2: Revenire la starea inițială ---
                    // .finally se execută indiferent dacă a fost succes sau eroare
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Trimite";
                    submitBtn.classList.remove("btn-sending");
                });
        });
    }
});
});