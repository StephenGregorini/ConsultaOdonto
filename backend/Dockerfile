FROM python:3.11-slim

# Define o diretório de trabalho para a aplicação
WORKDIR /app

# Copia apenas o arquivo de requisitos primeiro para aproveitar o cache do Docker
# Assumindo que o contexto do build é a raiz do projeto, e o arquivo está em 'backend/requirements.txt'
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código da aplicação
# Copia o conteúdo da pasta 'backend' do seu repositório para o diretório de trabalho atual (/app) na imagem
COPY backend/ .

# Expõe a porta que o uvicorn usará
EXPOSE 8000

# Comando para iniciar a aplicação
# Usa gunicorn para rodar uvicorn, uma prática recomendada para produção.
# O Gunicorn gerenciará os processos do Uvicorn. A variável de ambiente PORT é fornecida pela Railway.
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]