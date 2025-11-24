import os
import json
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv   
load_dotenv()                    


# ==========================
# CONFIGURAÇÃO
# ==========================

# Opção 1: usar variável de ambiente SUPABASE_DB_URL
DATABASE_URL = os.getenv("SUPABASE_DB_URL")

# Opção 2: colar aqui diretamente (menos seguro, mas rápido para teste)
# DATABASE_URL = "postgres://usuario:senha@host:5432/postgres"

if not DATABASE_URL:
    raise RuntimeError(
        "Defina a variável de ambiente SUPABASE_DB_URL "
        "ou preencha a DATABASE_URL diretamente no script."
    )

OUTPUT_FILE = "supabase_schema.json"


# ==========================
# FUNÇÕES DE COLETA
# ==========================

def get_tables(conn):
    """
    Retorna lista de tabelas (schema, nome) ignorando schemas de sistema.
    """
    query = """
        SELECT
            table_schema,
            table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()


def get_columns(conn, schema, table):
    """
    Retorna colunas de uma tabela com tipo, nullability e default.
    """
    query = """
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
        FROM information_schema.columns
        WHERE table_schema = %s
          AND table_name = %s
        ORDER BY ordinal_position;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query, (schema, table))
        return cur.fetchall()


def get_primary_keys(conn, schema, table):
    """
    Retorna as colunas que fazem parte da primary key de uma tabela.
    """
    query = """
        SELECT
            a.attname AS column_name
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = i.indrelid
                           AND a.attnum = ANY(i.indkey)
        WHERE i.indisprimary
          AND n.nspname = %s
          AND c.relname = %s
        ORDER BY a.attnum;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query, (schema, table))
        rows = cur.fetchall()
        return [r["column_name"] for r in rows]


def get_foreign_keys(conn, schema, table):
    """
    Retorna foreign keys de uma tabela, com colunas locais e de referência.
    """
    query = """
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name   AS foreign_table_name,
            ccu.column_name  AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = %s
          AND tc.table_name = %s
        ORDER BY tc.constraint_name, kcu.ordinal_position;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query, (schema, table))
        return cur.fetchall()


# ==========================
# MAIN
# ==========================

def export_schema():
    print("Conectando ao banco Supabase...")
    conn = psycopg2.connect(DATABASE_URL)

    try:
        print("Lendo lista de tabelas...")
        tables = get_tables(conn)

        schema_info = {
            "database_url_masked": mask_database_url(DATABASE_URL),
            "tables": []
        }

        for t in tables:
            schema_name = t["table_schema"]
            table_name = t["table_name"]
            print(f"Processando {schema_name}.{table_name}...")

            cols = get_columns(conn, schema_name, table_name)
            pks = get_primary_keys(conn, schema_name, table_name)
            fks = get_foreign_keys(conn, schema_name, table_name)

            table_dict = {
                "schema": schema_name,
                "table": table_name,
                "columns": [],
                "primary_key": pks,
                "foreign_keys": []
            }

            # Colunas
            for c in cols:
                col = {
                    "name": c["column_name"],
                    "data_type": c["data_type"],
                    "is_nullable": c["is_nullable"],
                    "default": c["column_default"],
                    "char_max_length": c["character_maximum_length"],
                    "numeric_precision": c["numeric_precision"],
                    "numeric_scale": c["numeric_scale"],
                }
                table_dict["columns"].append(col)

            # Foreign keys
            for fk in fks:
                fk_dict = {
                    "constraint_name": fk["constraint_name"],
                    "column": fk["column_name"],
                    "foreign_table_schema": fk["foreign_table_schema"],
                    "foreign_table": fk["foreign_table_name"],
                    "foreign_column": fk["foreign_column_name"],
                }
                table_dict["foreign_keys"].append(fk_dict)

            schema_info["tables"].append(table_dict)

        # Salvar em JSON
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(schema_info, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Exportação concluída! Arquivo gerado: {OUTPUT_FILE}")

    finally:
        conn.close()
        print("Conexão encerrada.")


def mask_database_url(url: str) -> str:
    """
    Mascara usuário e senha da URL, mantendo host e database visíveis,
    só para referência rápida.
    """
    # Formatos tipo: postgres://user:pass@host:port/db
    try:
        prefix, rest = url.split("://", 1)
        auth, rest2 = rest.split("@", 1)
        user, _ = auth.split(":", 1)
        return f"{prefix}://{user}:***@{rest2}"
    except Exception:
        # Se der ruim, só não mascara
        return url


if __name__ == "__main__":
    export_schema()
