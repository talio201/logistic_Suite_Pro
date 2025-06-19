# gerar_sql_diagnostico.py

import pandas as pd

# O nome do seu único arquivo Excel
SOURCE_EXCEL_FILE = 'centro_distribuicao_detalhado1.xlsx'

# Configuração de todas as suas abas e tabelas
CONFIGS = [
    {'sheet_name': 'Produtos', 'sql_table': 'products'},
    {'sheet_name': 'Filiais', 'sql_table': 'branches'},
    {'sheet_name': 'Separacoes', 'sql_table': 'orders'},
    {'sheet_name': 'Expedicoes', 'sql_table': 'expeditions'},
    {'sheet_name': 'Entregas', 'sql_table': 'deliveries'},
    {'sheet_name': 'Faturamentos', 'sql_table': 'invoices'}
]

def run_diagnostics(config, excel_file):
    """
    Função de diagnóstico que lê uma aba e imprime os nomes das colunas.
    """
    sheet = config['sheet_name']
    table_name = config['sql_table']
    
    print(f"--- Diagnóstico para a aba: '{sheet}' (Tabela: '{table_name}') ---")
    
    try:
        # Tenta ler a aba do arquivo Excel
        df = pd.read_excel(excel_file, sheet_name=sheet)
        
        # A LINHA MAIS IMPORTANTE: Imprime os nomes das colunas exatamente como foram lidos
        print("Colunas encontradas nesta aba:")
        print(df.columns.tolist())
        print("-" * (len(sheet) + 30))
        print("\n")

    except FileNotFoundError:
        print(f"[ERRO] Arquivo Excel '{excel_file}' não foi encontrado.\n")
    except ValueError as e:
        # Erro comum se a aba não for encontrada
        print(f"[ERRO] Não foi possível encontrar a aba '{sheet}'. Verifique se o nome está escrito exatamente igual no seu arquivo Excel.\n")
    except Exception as e:
        print(f"[ERRO] Falha inesperada ao ler a aba '{sheet}'. Detalhes: {e}\n")


# Executa o diagnóstico para todas as configurações
if __name__ == "__main__":
    print("Iniciando diagnóstico do arquivo Excel...\n")
    for config in CONFIGS:
        run_diagnostics(config, SOURCE_EXCEL_FILE)
    print("Diagnóstico concluído.")