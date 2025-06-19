import warnings
warnings.filterwarnings('ignore', category=UserWarning)
import pandas as pd
from sqlalchemy import create_engine

# Conexão com o banco
db_config = {
    'host': 'localhost',
    'user': 'logispro_admin',
    'password': 'Appolo*@*@11',
    'database': 'logispro'
}

# Criar engine do SQLAlchemy
connection_string = f"mysql+mysqlconnector://{db_config['user']}:{db_config['password']}@{db_config['host']}/{db_config['database']}"
engine = create_engine(connection_string)

# Sua consulta SQL
query = """
SELECT 
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.IS_NULLABLE,
    c.COLUMN_KEY,
    c.COLUMN_DEFAULT,
    k.REFERENCED_TABLE_NAME,
    k.REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.TABLES t
JOIN 
    INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
LEFT JOIN 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON c.TABLE_SCHEMA = k.TABLE_SCHEMA 
    AND c.TABLE_NAME = k.TABLE_NAME 
    AND c.COLUMN_NAME = k.COLUMN_NAME
WHERE 
    t.TABLE_SCHEMA = 'logispro'
ORDER BY 
    t.TABLE_NAME, 
    c.ORDINAL_POSITION;
"""

# Executar a consulta
df = pd.read_sql(query, engine)

# Exportar para Excel
df.to_excel('estrutura_completa.xlsx', index=False)
print("Exportação concluída com sucesso!")