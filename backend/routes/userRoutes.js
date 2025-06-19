// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const verifyToken = require('../middlewares/verifyToken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

//-- ADIÇÃO: Configuração do Multer para upload de imagem em memória
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas JPEG, PNG e GIF são permitidos.'), false);
        }
    }
});

//-- ROTA EXISTENTE: Obter dados do usuário logado
router.get('/me', verifyToken, async (req, res) => {
    try {
        // Removida a busca da imagem daqui para otimizar. A imagem será buscada em uma rota separada.
        const [users] = await pool.query('SELECT id, full_name, username, role, phone, position, education, birth_date, id_document, employee_id, vehicle_plate FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados do usuário.' });
    }
});

//-- ROTA EXISTENTE: Atualizar perfil (dados de texto)
router.put('/me', verifyToken, async (req, res) => {
    try {
        const { full_name, phone, position, education, birth_date, id_document, employee_id, vehicle_plate, username } = req.body;
        await pool.query(
            'UPDATE users SET full_name = ?, phone = ?, position = ?, education = ?, birth_date = ?, id_document = ?, employee_id = ?, vehicle_plate = ?, username = ? WHERE id = ?',
            [full_name, phone, position, education, birth_date, id_document, employee_id, vehicle_plate, username, req.userId]
        );
        res.json({ message: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ message: 'Erro ao atualizar o perfil.' });
    }
});

//-- ROTA EXISTENTE: Alterar senha
router.put('/me/password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.userId]);
        const user = users[0];

        const passwordIsValid = await bcrypt.compare(currentPassword, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Senha atual incorreta.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 8);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.userId]);
        
        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ message: 'Erro ao alterar a senha.' });
    }
});

//-- ADIÇÃO: Nova rota para fazer upload da foto de perfil
router.post('/me/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Nenhum arquivo de imagem enviado.' });
    }
    try {
        // O arquivo está em req.file.buffer
        const imageBuffer = req.file.buffer;
        await pool.query('UPDATE users SET profile_image = ? WHERE id = ?', [imageBuffer, req.userId]);
        res.status(200).send({ message: 'Avatar atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar avatar:', error);
        res.status(500).send({ message: 'Erro interno ao salvar o avatar.' });
    }
});

//-- ADIÇÃO: Nova rota para servir a imagem de perfil de qualquer usuário
router.get('/avatar/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [users] = await pool.query('SELECT profile_image FROM users WHERE id = ?', [userId]);

        if (users.length === 0 || !users[0].profile_image) {
            // Se não houver imagem, podemos enviar uma imagem padrão ou um 404
            return res.status(404).send({ message: 'Imagem não encontrada.' });
        }
        
        // Define o tipo de conteúdo como imagem e envia o buffer
        res.setHeader('Content-Type', 'image/jpeg'); // Assumindo jpeg, pode ser dinâmico
        res.send(users[0].profile_image);

    } catch (error) {
        console.error('Erro ao buscar avatar:', error);
        res.status(500).send({ message: 'Erro ao buscar imagem.' });
    }
});

module.exports = router;