const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const authMiddleware = require('../middlewares/verifyToken');

// Rota protegida - apenas administradores (accessLevel foi trocado por role)
router.get('/users', authMiddleware, async (req, res) => {
  // VERIFICAÇÃO DE ROLE - Adicionada para garantir que apenas gerentes acessem
  if (req.userRole !== 'gerencial') {
      return res.status(403).send({ message: "Acesso negado. Apenas usuários gerenciais podem visualizar." });
  }

  try {
    // CORREÇÃO: Trocado 'name' por 'full_name' e 'access_level' por 'role'.
    const [rows] = await pool.query('SELECT id, full_name, username, role, phone, position FROM users');
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error); // Log detalhado do erro no servidor
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

module.exports = router;