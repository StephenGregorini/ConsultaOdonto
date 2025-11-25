import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from processor import processar_excel

# -------------------------------------------------------------------
# FASTAPI CONFIG
# -------------------------------------------------------------------

app = FastAPI(
    title="API de Importação — Controle Odonto",
    description="Recebe planilhas Excel, processa e envia para o Supabase.",
    version="1.0.0"
)

# -------------------------------------------------------------------
# CORS (padrão) — mantém para compatibilidade
# -------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # liberar tudo no DEV
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# CORS CUSTOM — override necessário para Railway
# Railway força um header próprio, então sobrescrevemos manualmente
# -------------------------------------------------------------------

class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)

        # CORS total liberado para uso local + Vercel
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"

        return response

app.add_middleware(ForceCORSMiddleware)

# -------------------------------------------------------------------
# ROTAS
# -------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def raiz():
    """Redireciona para a documentação"""
    return RedirectResponse(url="/docs")


@app.get("/status", tags=["Status"])
async def status():
    """Health check básico"""
    return {"status": "ok", "message": "API funcionando!"}


# -------------------------------------------------------------------
# UPLOAD + PROCESSAMENTO PRINCIPAL
# -------------------------------------------------------------------

@app.post("/upload", summary="Upload de arquivo Excel", tags=["Importação"])
async def upload_excel(file: UploadFile = File(...)):
    """
    Recebe um arquivo .xlsx, processa e envia registros ao Supabase.
    """

    # valida formato
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie um arquivo .xlsx ou .xls."
        )

    try:
        # lê bytes do arquivo
        contents = await file.read()

        # processa excel → parser → Supabase
        resultado = processar_excel(contents)

        return JSONResponse(
            status_code=200,
            content={
                "arquivo": file.filename,
                "mensagem": "Processado com sucesso",
                **resultado
            }
        )

    except Exception as e:
        # Captura geral
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar o arquivo: {str(e)}"
        )
