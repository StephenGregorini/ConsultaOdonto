# Dockerfile na raiz do projeto (onde está o main.py)

FROM python:3.11-slim

WORKDIR /app

# Copia requirements e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código
COPY . .

# Porta padrão do Railway é via $PORT
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Sobe o FastAPI com Uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
