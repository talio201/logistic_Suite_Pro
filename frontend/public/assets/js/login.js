// login.js
document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault(); 

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessageDiv = document.getElementById("error-message");

    if (errorMessageDiv) {
        errorMessageDiv.classList.remove('is-visible');
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value,
            }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Usuário ou senha inválidos.");
        }

        if (data.auth) {
            localStorage.setItem("token", data.token);

            if (data.role === "comum") {
                window.location.href = "/dashboard_comum.html";
            } else if (data.role === "gerencial") {
                window.location.href = '/painel_gerencial_avancado.html';
            } else {
                window.location.href = "/";
            }
        }
    } catch (error) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.classList.add('is-visible');
        } else {
            alert(error.message);
        }
    }
});