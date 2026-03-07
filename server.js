require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// banco de dados
const db = new sqlite3.Database("./database.db");

// criar tabela se não existir
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1
)
`);

// middleware de autenticação
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token inválido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }

    req.user = user;
    next();
  });
}

//
// REGISTER
//
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "username, email e password são obrigatórios" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email, hashedPassword],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "Usuário já existe" });
      }

      res.json({
        message: "Usuário registrado com sucesso",
        userId: this.lastID,
      });
    }
  );
});

//
// LOGIN
//
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  });
});

//
// PERFIL (ROTA PROTEGIDA)
//
app.get("/perfil", autenticarToken, (req, res) => {
  db.get(
    "SELECT id, username, xp, level FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json(user);
    }
  );
});

//
// LISTA DE USUÁRIOS
//
app.get("/users", (req, res) => {
  db.all("SELECT id, username, xp, level FROM users", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao buscar usuários" });
    }

    res.json(rows);
  });
});

//
// LEADERBOARD
//
app.get("/leaderboard", (req, res) => {
  db.all(
    "SELECT username, xp, level FROM users ORDER BY xp DESC LIMIT 10",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao buscar ranking" });
      }

      res.json(rows);
    }
  );
});

//
// START SERVER
//
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
