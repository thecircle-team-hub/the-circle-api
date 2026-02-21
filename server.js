require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "segredo_teste";

/* ==============================
   ROTA RAIZ
============================== */
app.get("/", (req, res) => {
  res.json({ status: "API rodando 🚀" });
});

/* ==============================
   LOGIN
============================== */
app.post("/login", (req, res) => {
  const { email, password, twitterUsername } = req.body;

  if (!email || !password || !twitterUsername) {
  return res.status(400).json({ 
    error: "Email, senha e twitterUsername são obrigatórios" 
  });
  }

  if (email === "teste@email.com" && password === "123456") {
    const token = jwt.sign(
      { email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  }

  return res.status(401).json({ error: "Credenciais inválidas" });
});

/* ==============================
   MIDDLEWARE DE AUTENTICAÇÃO
============================== */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

/* ==============================
   ROTA PROTEGIDA
============================== */
app.get("/perfil", authMiddleware, (req, res) => {
  res.json({
    message: "Acesso autorizado 🔐",
    usuario: req.user
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
