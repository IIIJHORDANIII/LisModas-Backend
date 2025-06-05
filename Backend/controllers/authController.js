const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Criar usuário admin inicial
const createInitialAdmin = async () => {
  try {
    console.log('Verificando usuário admin...');
    const adminExists = await User.findOne({ email: 'pastorello_jhordan@icloud.com' });
    
    if (!adminExists) {
      console.log('Criando usuário admin...');
      const admin = await User.create({
        nome: 'Admin',
        email: 'pastorello_jhordan@icloud.com',
        cpf: '00000000000',
        nascimento: new Date('1990-01-01'),
        senha: 'jhordan',
        role: 'admin'
      });
      console.log('Usuário admin criado com sucesso:', admin.email);
    } else {
      console.log('Usuário admin já existe:', adminExists.email);
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
};

// Criar admin ao iniciar o servidor
createInitialAdmin();

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log('Tentativa de login para:', email);
    console.log('Dados recebidos:', { email, senha });

    if (!email || !senha) {
      console.log('Email ou senha não fornecidos');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({ email }).select('+senha');
    console.log('Resultado da busca:', user ? 'Usuário encontrado' : 'Usuário não encontrado');

    if (!user) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    console.log('Usuário encontrado, verificando senha...');
    const isPasswordValid = await user.comparePassword(senha);
    console.log('Resultado da validação da senha:', isPasswordValid ? 'Senha válida' : 'Senha inválida');

    if (!isPasswordValid) {
      console.log('Senha inválida para:', email);
      return res.status(401).json({ error: 'Senha inválida' });
    }

    console.log('Login bem-sucedido para:', email);
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    user.senha = undefined;
    res.json({ user, token });
  } catch (error) {
    console.error('Erro detalhado ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

exports.register = async (req, res) => {
  try {
    const { nome, email, cpf, nascimento, senha } = req.body;
    console.log('Dados recebidos para cadastro:', { nome, email, cpf, nascimento });

    // Verificar se o email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email já cadastrado:', email);
      return res.status(400).json({ 
        error: 'Email já cadastrado',
        details: {
          email: existingUser.email,
          id: existingUser._id
        }
      });
    }

    // Verificar se o CPF já existe
    const existingCPF = await User.findOne({ cpf });
    if (existingCPF) {
      console.log('CPF já cadastrado:', cpf);
      return res.status(400).json({ 
        error: 'CPF já cadastrado',
        details: {
          cpf: existingCPF.cpf,
          id: existingCPF._id
        }
      });
    }

    // Criar novo usuário
    const user = await User.create({
      nome,
      email,
      cpf,
      nascimento: new Date(nascimento),
      senha
    });

    console.log('Usuário criado com sucesso:', user.email);
    user.senha = undefined;

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Erro detalhado ao fazer cadastro:', error);
    res.status(500).json({ 
      error: 'Erro ao fazer cadastro',
      details: error.message
    });
  }
}; 