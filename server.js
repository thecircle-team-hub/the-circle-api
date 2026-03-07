require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "segredo_teste";

/* ==============================
   ROOT / STATUS
============================== */
app.get("/", (req, res) => {
  res.json({
    status: "API rodando 🚀",
    service: "The Circle API",
    version: "1.0"
  });
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
      { email, twitterUsername },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  }

  return res.status(401).json({
    error: "Credenciais inválidas"
  });

});

/* ==============================
   AUTH MIDDLEWARE
============================== */
function authMiddleware(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não fornecido"
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      error: "Token inválido ou expirado"
    });

  }

}

/* ==============================
   PERFIL PROTEGIDO
============================== */
app.get("/perfil", authMiddleware, (req, res) => {

  res.json({
    message: "Acesso autorizado 🔐",
    usuario: req.user
  });

});

/* ==============================
   USERS
============================== */
app.get("/users", (req, res) => {

  const users = [
    {
      id: "1",
      username: "Leonardo",
      xp: 1200,
      level: 8
    },
    {
      id: "2",
      username: "Jordan",
      xp: 980,
      level: 7
    },
    {
      id: "3",
      username: "Ana",
      xp: 850,
      level: 6
    }
  ];

  res.json(users);

});

/* ==============================
   NODES (COMUNIDADES POR PAÍS)
============================== */
app.get("/nodes", (req, res) => {

  const nodes = [
    {
      id: "1",
      country: "Brazil",
      status: "active",
      activity: 87
    },
    {
      id: "2",
      country: "USA",
      status: "active",
      activity: 72
    },
    {
      id: "3",
      country: "Japan",
      status: "stable",
      activity: 65
    },
    {
      id: "4",
      country: "Nigeria",
      status: "growing",
      activity: 54
    }
  ];

  res.json(nodes);

});

/* ==============================
   LEADERBOARD
============================== */
app.get("/leaderboard", (req, res) => {

  const leaderboard = [
    {
      id: "1",
      username: "Leonardo",
      score: 1200,
      rank: 1
    },
    {
      id: "2",
      username: "Jordan",
      score: 980,
      rank: 2
    },
    {
      id: "3",
      username: "Ana",
      score: 850,
      rank: 3
    }
  ];

  res.json(leaderboard);

});

/* ==============================
   TELEGRAM BOT ENDPOINT
============================== */
app.post("/telegram", (req, res) => {

  const { message, user } = req.body;

  console.log("Mensagem recebida do Telegram:", message);

  res.json({
    reply: "Mensagem recebida pelo bot 🤖"
  });

});

/* ==============================
   SERVER START
============================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("Servidor rodando na porta " + PORT);

});
