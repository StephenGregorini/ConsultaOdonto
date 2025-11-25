import requests
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from processor import processar_excel, SUPABASE_URL, HEADERS

app = FastAPI(
    title="API de Importação — MedSimples / Controle Odonto",
    version="1.0.0",
)

# CORS liberado para uso local (frontend em localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em produção você pode restringir
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def raiz():
    return RedirectResponse(url="/docs")


@app.get("/status")
async def status():
    return {"status": "ok"}


@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    """
    Recebe um arquivo Excel (.xlsx), processa e grava no Supabase.
    """
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie um arquivo .xlsx ou .xls.",
        )

    try:
        contents = await file.read()
        resultado = processar_excel(contents, arquivo_nome=file.filename)

        return JSONResponse(
            status_code=200,
            content={
                "arquivo": file.filename,
                **resultado,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar o arquivo: {str(e)}",
        )


@app.get("/historico")
async def listar_historico():
    """
    Lista o histórico de importações registrado na tabela 'importacoes'.
    """
    url = f"{SUPABASE_URL}/rest/v1/importacoes?order=criado_em.desc"
    r = requests.get(url, headers=HEADERS)

    if r.status_code not in (200, 201):
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar histórico: {r.status_code} - {r.text}",
        )

    return r.json()
