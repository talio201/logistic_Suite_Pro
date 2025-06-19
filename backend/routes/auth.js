const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db'); 
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// Middleware para verificar se o usuário tem o perfil 'gerencial'
const isManager = (req, res, next) => {
    // A role vem do token decodificado pelo middleware verifyToken
    if (req.userRole !== 'gerencial') {
        return res.status(403).send({ message: "Acesso negado. Apenas usuários gerenciais podem executar esta ação." });
    }
    next();
};

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
      return res.status(400).send({ message: "Usuário e senha são obrigatórios."});
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(404).send({ message: 'Usuário não encontrado.' });
    }

    const user = users[0];
    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).send({ auth: false, token: null, message: 'Senha inválida.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 horas
    });

    res.status(200).send({ auth: true, token: token, role: user.role });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send({ message: 'Erro interno ao realizar o login.' });
  }
});

// ROTA DE REGISTRO DE RH AUTORIZADO (PARA GERENTES)
router.post('/register-authorized', verifyToken, isManager, async (req, res) => {
    const { fullName, username, phone, education, password, role } = req.body;

    if (!fullName || !username || !password || !role) {
        return res.status(400).send({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        
        const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).send({ message: 'Este nome de usuário (e-mail) já está em uso.' });
        }

        const query = 'INSERT INTO users (full_name, username, phone, education, password, role) VALUES (?, ?, ?, ?, ?, ?)';
        await pool.query(query, [fullName, username, phone, education, hashedPassword, role]);

        res.status(201).send({ message: 'Novo colaborador cadastrado com sucesso!' });

    } catch (error) {
        console.error('Erro no servidor ao registrar:', error);
        res.status(500).send({ message: 'Erro interno ao registrar o novo colaborador.' });
    }
});


module.exports = router;