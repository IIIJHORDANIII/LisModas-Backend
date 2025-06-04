# Backend para Gerenciamento de Imagens com AWS S3

Este é um backend Node.js para upload, armazenamento e gerenciamento de imagens usando Amazon S3.

## Pré-requisitos

- Node.js (v16 ou superior)
- Conta AWS com acesso ao S3
- MongoDB (local ou Atlas)

## Configuração

1. Renomeie `.env.example` para `.env` e preencha com suas credenciais
2. Instale as dependências: `npm install`
3. Inicie o servidor: `npm start` (ou `npm run dev` para desenvolvimento)

## Rotas da API

- POST `/api/images/upload` - Upload de imagem
- GET `/api/images` - Listar todas as imagens
- GET `/api/images/:id` - Obter detalhes de uma imagem
- DELETE `/api/images/:id` - Deletar uma imagem

## Variáveis de Ambiente

- `AWS_ACCESS_KEY_ID` - Seu Access Key ID da AWS
- `AWS_SECRET_ACCESS_KEY` - Seu Secret Access Key da AWS
- `AWS_REGION` - Região do bucket S3 (ex: sa-east-1)
- `S3_BUCKET_NAME` - Nome do bucket S3 (ex: lismodas)
- `S3_BUCKET_FOLDER` - Pasta dentro do bucket (ex: imagens/)
- `MONGODB_URI` - URL de conexão do MongoDB# Backend para Gerenciamento de Imagens com AWS S3

Este é um backend Node.js para upload, armazenamento e gerenciamento de imagens usando Amazon S3.

## Pré-requisitos

- Node.js (v16 ou superior)
- Conta AWS com acesso ao S3
- MongoDB (local ou Atlas)

## Configuração

1. Renomeie `.env.example` para `.env` e preencha com suas credenciais
2. Instale as dependências: `npm install`
3. Inicie o servidor: `npm start` (ou `npm run dev` para desenvolvimento)

## Rotas da API

- POST `/api/images/upload` - Upload de imagem
- GET `/api/images` - Listar todas as imagens
- GET `/api/images/:id` - Obter detalhes de uma imagem
- DELETE `/api/images/:id` - Deletar uma imagem

## Variáveis de Ambiente

- `AWS_ACCESS_KEY_ID` - Seu Access Key ID da AWS
- `AWS_SECRET_ACCESS_KEY` - Seu Secret Access Key da AWS
- `AWS_REGION` - Região do bucket S3 (ex: sa-east-1)
- `S3_BUCKET_NAME` - Nome do bucket S3 (ex: lismodas)
- `S3_BUCKET_FOLDER` - Pasta dentro do bucket (ex: imagens/)
- `MONGODB_URI` - URL de conexão do MongoDB