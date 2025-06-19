const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const verifyToken = require('../middlewares/verifyToken');

// Rota de visão geral continua a mesma
router.get('/overview', verifyToken, async (req, res) => {
    try {
        // KPIs estratégicos
        const [kpiData] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders) as totalPedidos,
                (SELECT COUNT(DISTINCT branch_id) FROM orders) as clientesAtivos,
                (SELECT SUM(total_value) FROM invoices WHERE billing_date >= DATE_FORMAT(NOW(), '%Y-%m-01')) as faturamentoMensal,
                (SELECT SUM(total_value) FROM invoices WHERE billing_date >= CURDATE() - INTERVAL 30 DAY) as faturamento30Dias,
                (SELECT COUNT(*) FROM products WHERE stock_quantity < minimum_stock) as produtosEstoqueBaixo,
                (SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'Entregue' AND delivery_datetime >= CURDATE() - INTERVAL 7 DAY) as entregues7Dias,
                (SELECT AVG(DATEDIFF(delivery_datetime, order_date)) FROM deliveries JOIN orders ON deliveries.order_id = orders.order_id WHERE delivery_status = 'Entregue') as tempoMedioEntrega
        `);

        // Análise temporal
        const [faturamentoPorMes] = await pool.query(`
            SELECT 
                DATE_FORMAT(billing_date, '%Y-%m') as mes, 
                SUM(total_value) as total,
                COUNT(DISTINCT invoices.order_id) as pedidos,
                SUM(total_value)/COUNT(DISTINCT invoices.order_id) as ticketMedio
            FROM invoices 
            WHERE billing_date >= CURDATE() - INTERVAL 12 MONTH 
            GROUP BY mes 
            ORDER BY mes ASC
        `);

        // Análise por segmento
        const [vendasPorCategoria] = await pool.query(`
            SELECT 
                p.category as categoria,
                SUM(oi.quantity) as quantidade,
                SUM(oi.quantity * oi.unit_price) as valorTotal
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.order_date >= CURDATE() - INTERVAL 3 MONTH
            GROUP BY p.category
            ORDER BY valorTotal DESC
        `);

        // Análise de eficiência
        const [eficienciaEntregas] = await pool.query(`
            SELECT 
                e.route_name as rota,
                COUNT(d.delivery_id) as entregas,
                AVG(TIMESTAMPDIFF(HOUR, e.expedition_date, d.delivery_datetime)) as tempoMedioHoras,
                SUM(CASE WHEN d.delivery_status = 'Entregue' THEN 1 ELSE 0 END)/COUNT(d.delivery_id) as taxaSucesso
            FROM expeditions e
            JOIN deliveries d ON e.expedition_id = d.expedition_id
            GROUP BY e.route_name
            ORDER BY taxaSucesso DESC
        `);

        res.json({
            kpis: kpiData[0],
            charts: {
                faturamentoMensal: {
                    labels: faturamentoPorMes.map(item => item.mes),
                    datasets: [
                        { label: 'Faturamento', values: faturamentoPorMes.map(item => item.total) },
                        { label: 'Pedidos', values: faturamentoPorMes.map(item => item.pedidos) },
                        { label: 'Ticket Médio', values: faturamentoPorMes.map(item => item.ticketMedio) }
                    ]
                },
                vendasPorCategoria: {
                    labels: vendasPorCategoria.map(item => item.categoria),
                    datasets: [
                        { label: 'Quantidade', values: vendasPorCategoria.map(item => item.quantidade) },
                        { label: 'Valor Total', values: vendasPorCategoria.map(item => item.valorTotal) }
                    ]
                },
                eficienciaEntregas: {
                    labels: eficienciaEntregas.map(item => item.rota),
                    datasets: [
                        { label: 'Taxa de Sucesso', values: eficienciaEntregas.map(item => item.taxaSucesso * 100) },
                        { label: 'Tempo Médio (horas)', values: eficienciaEntregas.map(item => item.tempoMedioHoras) }
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard.' });
    }
});

// Rota de tabelas totalmente reestruturada com consultas relacionais
router.get('/table/:tableName', verifyToken, async (req, res) => {
    const { tableName } = req.params;
    let query = '';
    let columns = [];

    switch (tableName) {
        case 'products':
            columns = ['Produto', 'Categoria', 'Código de Barras'];
            query = `SELECT product_name, category, barcode FROM products ORDER BY product_name ASC;`;
            break;

        case 'sales_by_product':
            columns = ['Produto', 'Unidades Vendidas', 'Nº de Pedidos', 'Receita Total (R$)'];
            query = `SELECT p.product_name, SUM(oi.quantity) AS total_units_sold, COUNT(DISTINCT oi.order_id) AS total_orders, FORMAT(SUM(oi.quantity * i.total_value / total_items.order_total_items), 2, 'de_DE') AS estimated_revenue FROM products p JOIN order_items oi ON p.product_id = oi.product_id JOIN orders o ON oi.order_id = o.order_id JOIN invoices i ON o.order_id = i.order_id JOIN (SELECT order_id, SUM(quantity) as order_total_items FROM order_items GROUP BY order_id) AS total_items ON o.order_id = total_items.order_id GROUP BY p.product_name ORDER BY SUM(oi.quantity * i.total_value / total_items.order_total_items) DESC;`;
            break;

        case 'orders':
            columns = ['Nº Pedido', 'Cliente', 'Cidade', 'Data do Pedido', 'Status', 'Valor (R$)'];
            query = `SELECT o.order_id, b.branch_name, b.city, DATE_FORMAT(i.billing_date, '%d/%m/%Y') as formatted_date, o.order_status, FORMAT(i.total_value, 2, 'de_DE') as total_value_formatted FROM orders o LEFT JOIN branches b ON o.branch_id = b.branch_id LEFT JOIN invoices i ON o.order_id = i.order_id ORDER BY i.billing_date DESC;`;
            break;

        // ADIÇÃO: Tabela de Faturamento
        case 'invoices':
            columns = ['Nº Nota Fiscal', 'Cliente', 'Data de Faturamento', 'Valor Total (R$)'];
            query = `SELECT i.invoice_number, b.branch_name, DATE_FORMAT(i.billing_date, '%d/%m/%Y') as formatted_date, FORMAT(i.total_value, 2, 'de_DE') as total_value_formatted FROM invoices i LEFT JOIN orders o ON i.order_id = o.order_id LEFT JOIN branches b ON o.branch_id = b.branch_id ORDER BY i.billing_date DESC;`;
            break;

        // ADIÇÃO: Tabela de Expedições mais completa
        case 'expeditions':
            columns = ['ID Expedição', 'Rota', 'Data', 'Placa do Veículo', 'Nº de Pedidos'];
            query = `SELECT e.expedition_id, e.route_name, DATE_FORMAT(e.expedition_date, '%d/%m/%Y') as formatted_date, e.vehicle_plate, COUNT(e.order_id) as order_count FROM expeditions e GROUP BY e.expedition_id, e.route_name, e.expedition_date, e.vehicle_plate ORDER BY e.expedition_date DESC;`;
            break;

        case 'deliveries':
             columns = ['ID Pedido', 'Cliente', 'Status', 'Data da Entrega', 'Recebido por'];
            query = `SELECT o.order_id, b.branch_name, d.delivery_status, DATE_FORMAT(d.delivery_datetime, '%d/%m/%Y %H:%i') as formatted_datetime, d.receiver_name FROM deliveries d LEFT JOIN orders o ON d.order_id = o.order_id LEFT JOIN branches b ON o.branch_id = b.branch_id ORDER BY d.delivery_datetime DESC;`;
            break;
            
        case 'customers':
            columns = ['Cliente', 'Tipo', 'Cidade', 'UF', 'Total de Pedidos'];
            query = `SELECT b.branch_name, b.destination_type, b.city, b.state, COUNT(o.order_id) as order_count FROM branches b LEFT JOIN orders o ON b.branch_id = o.branch_id GROUP BY b.branch_id, b.branch_name, b.destination_type, b.city, b.state ORDER BY order_count DESC;`;
            break;
            
        default:
            return res.status(400).json({ message: 'Tabela não permitida.' });
    }

    try {
        const [rows] = await pool.query(query);
        res.json({ headers: columns, rows: rows.map(row => Object.values(row)) });
    } catch (error) {
        console.error(`Erro ao buscar dados da tabela ${tableName}:`, error);
        res.status(500).json({ message: `Erro ao buscar dados.` });
    }
});

module.exports = router;