// gerar-senha.js
const bcrypt = require('bcryptjs');

// Pega a senha a partir do terceiro argumento do comando no terminal.
// Ex: node gerar-senha.js MINHA_SENHA_AQUI
const senha = process.argv[2];

if (!senha) {
    console.log("Uso: node gerar-senha.js <senha>");
    process.exit(1); // Sai se nenhuma senha for fornecida
}

const salt = bcrypt.genSaltSync(8);
const hash = bcrypt.hashSync(senha, salt);

console.log("Sua senha em texto plano: ", senha);
console.log("Seu HASH (para colar no SQL):", hash);