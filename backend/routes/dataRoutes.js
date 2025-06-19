// backend/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const verifyToken = require('../middlewares/verifyToken');

// Rota genérica para buscar dados de tabelas permitidas
const ALLOWED_TABLES = ['products', 'branches', 'orders', 'expeditions', 'deliveries', 'invoices'];

router.get('/advanced-reports/:reportType', verifyToken, async (req, res) => {
    const { reportType } = req.params;
    const { startDate, endDate, region } = req.query;

    try {
        let reportData;
        
        switch(reportType) {
            case 'customer-ltv':
                reportData = await calculateCustomerLTV(startDate, endDate);
                break;
                
            case 'product-performance':
                reportData = await analyzeProductPerformance(startDate, endDate, region);
                break;
                
            case 'delivery-efficiency':
                reportData = await analyzeDeliveryEfficiency(startDate, endDate);
                break;
                
            default:
                return res.status(400).json({ message: 'Tipo de relatório inválido.' });
        }
        
        res.json(reportData);
    } catch (error) {
        console.error(`Erro no relatório ${reportType}:`, error);
        res.status(500).json({ message: `Erro ao gerar relatório ${reportType}.` });
    }
});

async function calculateCustomerLTV(startDate, endDate) {
    const [results] = await pool.query(`
        SELECT 
            b.branch_id,
            b.branch_name,
            COUNT(DISTINCT o.order_id) as total_orders,
            SUM(i.total_value) as total_revenue,
            SUM(i.total_value)/COUNT(DISTINCT o.order_id) as avg_order_value,
            DATEDIFF(MAX(o.order_date), MIN(o.order_date)) as customer_tenure_days,
            SUM(i.total_value)/NULLIF(DATEDIFF(MAX(o.order_date), MIN(o.order_date)), 1) * 365 as estimated_ltv
        FROM branches b
        JOIN orders o ON b.branch_id = o.branch_id
        JOIN invoices i ON o.order_id = i.order_id
        WHERE o.order_date BETWEEN ? AND ?
        GROUP BY b.branch_id
        ORDER BY estimated_ltv DESC
    `, [startDate, endDate]);
    
    return {
        metrics: ['LTV Estimado', 'Receita Total', 'Pedidos', 'Valor Médio'],
        data: results
    };
}

async function analyzeProductPerformance(startDate, endDate, region) {
    const queryParams = [startDate, endDate];
    let regionFilter = '';
    
    if (region) {
        regionFilter = ' AND b.state = ?';
        queryParams.push(region);
    }
    
    const [results] = await pool.query(`
        SELECT 
            p.product_id,
            p.product_name,
            p.category,
            SUM(oi.quantity) as units_sold,
            SUM(oi.quantity * oi.unit_price) as gross_revenue,
            SUM(oi.quantity * (oi.unit_price - p.cost_price)) as gross_profit,
            COUNT(DISTINCT o.branch_id) as unique_customers,
            SUM(oi.quantity * oi.unit_price)/SUM(oi.quantity) as avg_unit_price
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o ON oi.order_id = o.order_id
        JOIN branches b ON o.branch_id = b.branch_id
        WHERE o.order_date BETWEEN ? AND ? ${regionFilter}
        GROUP BY p.product_id
        ORDER BY gross_profit DESC
    `, queryParams);
    
    return {
        metrics: ['Lucro Bruto', 'Receita', 'Unidades', 'Clientes', 'Preço Médio'],
        data: results
    };
}

module.exports = router;