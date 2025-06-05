const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('Erro: ADMIN_TOKEN não definido no arquivo .env');
  process.exit(1);
}

console.log('Configurações:');
console.log('API_URL:', API_URL);
console.log('Token presente:', !!ADMIN_TOKEN);

async function clearAllImages() {
  try {
    console.log('Iniciando limpeza de todas as imagens...');
    
    const response = await axios.delete(`${API_URL}/api/images/clear-all`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('Resposta do servidor:', response.data);
    
    const { results } = response.data;
    console.log('\nResumo da limpeza:');
    console.log('-------------------');
    console.log(`Total de imagens: ${results.total}`);
    console.log(`Deletadas do S3: ${results.deletedFromS3}`);
    console.log(`Deletadas do banco: ${results.deletedFromDB}`);
    
    if (results.errors.length > 0) {
      console.log('\nErros encontrados:');
      results.errors.forEach(error => {
        console.log(`- ID ${error.id}: ${error.error}`);
      });
    }

    console.log('\nLimpeza concluída!');
  } catch (error) {
    console.error('Erro ao limpar imagens:');
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor');
      console.error('Request:', error.request);
    } else {
      // Erro ao configurar a requisição
      console.error('Erro:', error.message);
    }
    console.error('Configuração completa:', error.config);
    process.exit(1);
  }
}

clearAllImages(); 