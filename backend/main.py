from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.importar import processar_excel
import os

app = FastAPI()

# CORS – liberar acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "online"}


@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        result = processar_excel(contents)

        return {
            "status": "ok",
            **result
        }

    except Exception as e:
        return {
            "status": "error",
            "detail": str(e)
        }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
