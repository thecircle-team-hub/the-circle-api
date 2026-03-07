require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fetch = require("node-fetch");
const querystring = require("querystring");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const BACKEND_URL = process.env.BACKEND_URL; // Ex: https://the-circle-api.onrender.com
const TWITTER_CLIENT_ID = DgHDw43bCyBhYil0zQUb7egPY;
const TWITTER_CLIENT_SECRET = fkCCzw3arHscZlrJkDjN2R53otLZFs3IRjYRap8P1oSWw257gF;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL; // Ex: https://the-circle-api.onrender.com/auth/twitter/callback

// -----------------------------
// BANCO DE DADOS
// -----------------------------
const db = new sqlite3.Database("./database.db");

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  twitterHandle TEXT,
  twitterName TEXT,
  twitterAvatar TEXT
)
`);

// Middleware JWT
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token inválido" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// -----------------------------
// REGISTER
// -----------------------------
app.post("/register", async (req, res) => {
  const { username, email, password, twitterHandle, twitterName, twitterAvatar } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email e password são obrigatórios" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, email, password, twitterHandle, twitterName, twitterAvatar) VALUES (?, ?, ?, ?, ?, ?)",
    [username, email, hashedPassword, twitterHandle || null, twitterName || null, twitterAvatar || null],
    function (err) {
      if (err) return res.status(400).json({ error: "Usuário já existe" });

      res.json({
        message: "Usuário registrado com sucesso",
        userId: this.lastID,
      });
    }
  );
});

// -----------------------------
// LOGIN
// -----------------------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: "Usuário não encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Senha inválida" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  });
});

// -----------------------------
// PERFIL
// -----------------------------
app.get("/perfil", autenticarToken, (req, res) => {
  db.get(
    "SELECT id, username, xp, level, twitterHandle, twitterName, twitterAvatar FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: "Usuário não encontrado" });
      res.json(user);
    }
  );
});

// -----------------------------
// LISTA DE USUÁRIOS
// -----------------------------
app.get("/users", (req, res) => {
  db.all("SELECT id, username, xp, level FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar usuários" });
    res.json(rows);
  });
});

// -----------------------------
// LEADERBOARD
// -----------------------------
app.get("/leaderboard", (req, res) => {
  db.all("SELECT username, xp, level FROM users ORDER BY xp DESC LIMIT 10", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar ranking" });
    res.json(rows);
  });
});

// -----------------------------
// NODES
// -----------------------------
app.get("/nodes", (req, res) => {
  db.all("SELECT id, country, status, activity FROM nodes", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar nodes" });
    res.json(rows);
  });
});

// ==============================
// TWITTER OAUTH
// ==============================

// Passo 1: redireciona para o Twitter
app.get("/auth/twitter", (req, res) => {
  const params = querystring.stringify({
    response_type: "code",
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_CALLBACK_URL,
    scope: "tweet.read users.read offline.access",
    state: "circle_state",
    code_challenge: "challenge",
    code_challenge_method: "plain",
  });
  res.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
});

// Passo 2: callback do Twitter
app.get("/auth/twitter/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Code não fornecido pelo Twitter");

  try {
    // 1️⃣ Troca code pelo access_token
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")
      },
      body: querystring.stringify({
        code,
        grant_type: "authorization_code",
        redirect_uri: TWITTER_CALLBACK_URL,
        code_verifier: "challenge"
      })
    });
    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    // 2️⃣ Buscar dados do usuário
    const userResponse = await fetch("https://api.twitter.com/2/users/me", {
      headers: { "Authorization": `Bearer ${access_token}` }
    });
    const userData = await userResponse.json();

    const twitterData = {
      twitterHandle: `@${userData.data.username}`,
      twitterName: userData.data.name,
      twitterAvatar: userData.data.profile_image_url
    };

    // 3️⃣ Retorna pro frontend
    res.json(twitterData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar OAuth Twitter" });
  }
});

// -----------------------------
// INICIO DO SERVIDOR
// -----------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
