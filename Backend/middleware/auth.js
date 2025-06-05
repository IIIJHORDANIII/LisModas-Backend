const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('Iniciando autenticação...');
    console.log('Headers:', req.headers);

    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.log('Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Formato de token inválido:', authHeader);
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    // Get token without 'Bearer ' prefix
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído:', token.substring(0, 20) + '...');

    // Verify token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está definido nas variáveis de ambiente');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    console.log('Verificando token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    
    // Find user by ID
    console.log('Buscando usuário:', decoded.id);
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Usuário não encontrado');
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    console.log('Usuário encontrado:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    // Add user info to request
    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role
    };
    
    console.log('Autenticação concluída com sucesso');
    next();
  } catch (error) {
    console.error('Erro detalhado na autenticação:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    res.status(401).json({ error: 'Por favor, faça login novamente' });
  }
};

module.exports = auth; 