// test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Tentando conectar ao banco de dados com as seguintes credenciais:');
    console.log({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD ? '******' : '(vazio)' // Não mostre a senha no log
    });

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        });
        
        console.log('\n[SUCESSO] Conexão com o banco de dados MySQL foi bem-sucedida!');
        
        const [rows] = await connection.execute('SELECT COUNT(*) as total_users FROM users');
        console.log(`[SUCESSO] Query de teste executada. Total de usuários na tabela: ${rows[0].total_users}`);

    } catch (error) {
        console.error('\n[ERRO] Falha ao conectar ou executar a query no banco de dados.');
        console.error('Detalhes do Erro:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nConexão com o banco de dados foi fechada.');
        }
    }
}

testConnection();