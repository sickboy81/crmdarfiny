# Usar uma imagem Node.js estável
FROM node:20-slim

# Instalar dependências necessárias para o Sharp e outras libs nativas se houver
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (apenas produção para economizar espaço)
RUN npm install

# Copiar o restante do código (incluindo a pasta server)
COPY . .

# Expor a porta que o servidor usa
EXPOSE 3001

# Definir a variável de ambiente para produção
ENV NODE_ENV=production

# Comando para rodar o servidor
CMD ["npm", "run", "whatsapp-server"]
