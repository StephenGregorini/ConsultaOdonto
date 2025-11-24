FROM python:3.11-slim

WORKDIR /app

# Define o diretório de trabalho para o código da aplicação
WORKDIR /app/backend

# Copia apenas o arquivo de requisitos primeiro para aproveitar o cache do Docker
# O contexto do build é a raiz do repo, então o caminho é backend/requirements.txt
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código da aplicação
# Copia o conteúdo da pasta 'backend' do seu repo para o diretório de trabalho atual na imagem
COPY backend/ .

# Expõe a porta que o uvicorn usará
EXPOSE 8000

# Comando para iniciar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/app/backend"]