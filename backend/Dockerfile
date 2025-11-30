# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Como o root do build é a pasta "backend",
# o Docker enxerga "requirements.txt" direto aqui:
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o conteúdo da pasta backend
COPY . .

# Porta que o Vercel injeta via env PORT
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
