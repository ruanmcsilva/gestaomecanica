# Usa a imagem do Node.js
FROM node:20

WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o código
COPY . .

# Expõe a porta padrão do React/Vite
EXPOSE 5173

# Comando para iniciar o front
CMD ["npm", "run", "dev", "--", "--host"]