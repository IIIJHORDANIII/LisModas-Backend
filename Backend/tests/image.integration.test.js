const request = require('supertest');
const app = require('../app'); // Certifique-se de exportar o app no seu app.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

describe('Integração: Upload de Imagem', () => {
  let token;

  beforeAll(async () => {
    // Gere ou obtenha um token de admin válido para autenticação
    // Exemplo: token = await gerarTokenAdmin();
    token = 'SEU_TOKEN_ADMIN_AQUI';
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('deve enviar imagem e campos corretamente e receber resposta completa', async () => {
    const imagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    const response = await request(app)
      .post('/api/images')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Imagem Teste')
      .field('description', 'Descrição de teste')
      .field('value', '123.45')
      .attach('image', imagePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'Imagem Teste');
    expect(response.body).toHaveProperty('description', 'Descrição de teste');
    expect(response.body).toHaveProperty('value', 123.45);
    expect(response.body).toHaveProperty('imagePath');
    expect(response.body).toHaveProperty('url');
    expect(response.body.imagePath).toMatch(/^https?:\/\//);
    expect(response.body.url).toBe(response.body.imagePath);
  });
}); 