import os
import json
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

load_dotenv()

# ==========================
# CONFIGURAÇÃO
# ==========================

DATABASE_URL = os.getenv("SUPABASE_DB_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "Defina SUPABASE_DB_URL no .env ou ajuste diretamente no script."
    )

OUTPUT_FILE = "supabase_schema_full.json"

# ==========================
# HELPERS
# ==========================

def mask_database_url(url: str) -> str:
    """
    Mascara usuário e senha da URL, mantendo host e database visíveis.
    """
    try:
        prefix, rest = url.split("://", 1)
        auth, rest2 = rest.split("@", 1)
        user, _ = auth.split(":", 1)
        return f"{prefix}://{user}:***@{rest2}"
    except:
        return url

# ==========================
# COLETORES DE METADADOS
# ==========================

def list_tables(conn):
    query = """
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def list_views(conn):
    query = """
        SELECT table_schema, table_name
        FROM information_schema.views
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def list_matviews(conn):
    query = """
        SELECT schemaname AS table_schema,
               matviewname AS table_name
        FROM pg_matviews
        ORDER BY schemaname, matviewname;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def list_columns(conn, schema, table):
    query = """
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = %s
          AND table_name = %s
        ORDER BY ordinal_position;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query, (schema, table))
        return cur.fetchall()

def list_primary_keys(conn, schema, table):
    query = """
        SELECT a.attname AS column_name
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

def list_foreign_keys(conn, schema, table):
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

def list_enums(conn):
    query = """
        SELECT
            n.nspname AS enum_schema,
            t.typname AS enum_name,
            e.enumlabel AS enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY enum_schema, enum_name, e.enumsortorder;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

def list_view_definitions(conn):
    query = """
        SELECT schemaname, viewname, definition
        FROM pg_views
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, viewname;
    """
    with conn.cursor(cursor_factory=DictCursor) as cur:
        cur.execute(query)
        return cur.fetchall()

# ==========================
# EXPORTAÇÃO
# ==========================

def export_schema():
    print("🔌 Conectando ao banco Supabase...")
    conn = psycopg2.connect(DATABASE_URL)

    try:
        schema = {
            "database_url_masked": mask_database_url(DATABASE_URL),
            "tables": [],
            "views": [],
            "materialized_views": [],
            "enums": [],
        }

        # ========= TABELAS =========
        print("📦 Lendo tabelas...")
        tables = list_tables(conn)

        for t in tables:
            schema_name = t["table_schema"]
            table_name = t["table_name"]

            cols = list_columns(conn, schema_name, table_name)
            pks = list_primary_keys(conn, schema_name, table_name)
            fks = list_foreign_keys(conn, schema_name, table_name)

            schema["tables"].append({
                "schema": schema_name,
                "name": table_name,
                "columns": [dict(c) for c in cols],
                "primary_key": pks,
                "foreign_keys": [dict(fk) for fk in fks],
            })

        # ========= VIEWS =========
        print("🔍 Lendo views...")
        views = list_views(conn)
        view_defs = { (v["schemaname"], v["viewname"]): v["definition"]
                      for v in list_view_definitions(conn) }

        for v in views:
            schema_name = v["table_schema"]
            view_name = v["table_name"]

            cols = list_columns(conn, schema_name, view_name)

            schema["views"].append({
                "schema": schema_name,
                "name": view_name,
                "columns": [dict(c) for c in cols],
                "definition": view_defs.get((schema_name, view_name)),
            })

        # ========= MATERIALIZED VIEWS =========
        print("🔍 Lendo materialized views...")
        matviews = list_matviews(conn)

        for mv in matviews:
            schema_name = mv["table_schema"]
            mv_name = mv["table_name"]

            cols = list_columns(conn, schema_name, mv_name)

            schema["materialized_views"].append({
                "schema": schema_name,
                "name": mv_name,
                "columns": [dict(c) for c in cols],
            })

        # ========= ENUMS =========
        print("🎨 Lendo tipos ENUM...")
        enums = list_enums(conn)
        for e in enums:
            schema["enums"].append(dict(e))

        # ========= SALVAR =========
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Schema completo exportado com sucesso → {OUTPUT_FILE}")

    finally:
        conn.close()
        print("🔌 Conexão encerrada.")


# ==========================
# MAIN
# ==========================

if __name__ == "__main__":
    export_schema()
