const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Rota de login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação dos campos
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário pelo email e incluir o campo senha
    const user = await User.findOne({ email }).select('+senha');
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha usando o método do modelo
    const isPasswordValid = await user.comparePassword(senha);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Gerar token JWT
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está definido');
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (exceto senha) e token
    const userResponse = {
      id: user._id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };

    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de registro
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, nascimento, cpf } = req.body;

    // Validação dos campos
    if (!nome || !email || !senha || !nascimento || !cpf) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o email já está em uso
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Verificar se o CPF já está em uso
    const existingCPF = await User.findOne({ cpf });
    if (existingCPF) {
      return res.status(400).json({ error: 'CPF já está em uso' });
    }

    // Criar novo usuário
    const user = new User({
      nome,
      email,
      senha,
      nascimento,
      cpf,
      role: 'user' // Papel padrão
    });

    await user.save();

    // Gerar token JWT
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está definido');
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar dados do usuário (exceto senha) e token
    const userResponse = {
      id: user._id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };

    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 