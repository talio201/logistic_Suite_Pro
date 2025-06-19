# gerar_sql_final.py

import pandas as pd
import numpy as np

SOURCE_EXCEL_FILE = 'centro_distribuicao_detalhado1.xlsx'

# --- CONFIGURAÇÃO FINAL E SINCRONIZADA ---
# Mapeia as colunas do Excel (chave) para as colunas do Banco de Dados (valor)
CONFIGS = [
    {
        'sheet_name': 'Produtos', 'sql_table': 'products',
        'column_map': { 'id': 'product_id', 'nome': 'product_name', 'categoria': 'category', 'codigo_barras': 'barcode'}
    },
    {
        'sheet_name': 'Filiais', 'sql_table': 'branches',
        'column_map': { 'id': 'branch_id', 'nome': 'branch_name', 'tipo_destino': 'destination_type', 'cidade': 'city', 'uf': 'state' }
    },
    {
        'sheet_name': 'Separacoes', 'sql_table': 'orders',
        'column_map': { 'pedido_id': 'order_id', 'separador': 'separation_user', 'status': 'order_status'}
    },
    {
        'sheet_name': 'Expedicoes', 'sql_table': 'expeditions',
        'column_map': { 'id': 'expedition_id', 'pedido_id': 'order_id', 'data_expedicao': 'expedition_date', 'veiculo_placa': 'vehicle_plate', 'rota_id': 'route_name'}
    },
    {
        'sheet_name': 'Entregas', 'sql_table': 'deliveries',
        'column_map': { 'id': 'delivery_id', 'pedido_id': 'order_id', 'status': 'delivery_status', 'data_entrega': 'delivery_datetime', 'loja_destino': 'receiver_name'}
    },
    {
        'sheet_name': 'Faturamentos', 'sql_table': 'invoices',
        'column_map': { 'id': 'invoice_id', 'pedido_compra_id': 'order_id', 'data_faturamento': 'billing_date', 'valor_total': 'total_value', 'nota_fiscal': 'invoice_number'}
    }
]

def generate_sql_from_excel_sheet(config, excel_file):
    sheet = config['sheet_name']
    table_name = config['sql_table']
    column_map = config['column_map']
    output_file = f"inserir_{table_name}.sql"
    try:
        print(f"--- Processando aba: '{sheet}' para a tabela: '{table_name}' ---")
        df = pd.read_excel(excel_file, sheet_name=sheet, dtype=str)
        df.columns = [str(col).strip().lower() for col in df.columns]
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"USE logispro;\nSET FOREIGN_KEY_CHECKS=0;\n\n")
            f.write(f"INSERT IGNORE INTO `{table_name}` ({', '.join([f'`{v}`' for v in column_map.values()])})\nVALUES\n")
            
            values_list = []
            for index, row in df.iterrows():
                vals = []
                for excel_col, sql_col in column_map.items():
                    if excel_col in row and pd.notna(row[excel_col]):
                        val = str(row[excel_col]).replace("'", "''")
                        vals.append(f"'{val}'")
                    else:
                        vals.append("NULL")
                values_list.append(f"    ({', '.join(vals)})")

            f.write(',\n'.join(values_list))
            f.write(";\n\nSET FOREIGN_KEY_CHECKS=1;\n")
        print(f"[SUCESSO] Arquivo '{output_file}' gerado.")
    except Exception as e:
        print(f"[ERRO] Falha ao processar '{sheet}'. Detalhes: {e}")

if __name__ == "__main__":
    print("Iniciando geração de scripts SQL a partir do arquivo Excel...")
    for config in CONFIGS:
        generate_sql_from_excel_sheet(config, SOURCE_EXCEL_FILE)
    print("\nProcesso concluído.")