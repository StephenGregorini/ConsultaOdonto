# Dockerfile na raiz do repo (Programa/)

FROM python:3.11-slim

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia o requirements do backend
COPY backend/requirements.txt .

# Instala dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do backend para dentro do container
COPY backend .

# Define variáveis de ambiente padrão
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Sobe o FastAPI
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
