const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spin@spin.com.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Aluc4rd32004';
const USUARIOS_AUTORIZADOS = {
  [ADMIN_EMAIL]: ADMIN_PASSWORD
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET nao configurado no servidor.' });
  }

  if (USUARIOS_AUTORIZADOS[email] && USUARIOS_AUTORIZADOS[email] === password) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  }

  return res.status(401).json({ message: 'Credenciais invalidas.' });
};

exports.verifyToken = (req, res) => {
  res.status(200).json({
    message: 'Token valido.',
    user: req.user
  });
};
