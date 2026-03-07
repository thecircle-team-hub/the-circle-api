require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "segredo_teste";

/* ==============================
   DATABASE
============================== */

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {

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

});

/* ==============================
   ROOT
============================== */

app.get("/", (req, res) => {
  res.json({
    status: "API rodando 🚀",
    service: "The Circle API"
  });
});

/* ==============================
   REGISTER
============================== */

app.post("/register", async (req, res) => {

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: "username, email e password são obrigatórios"
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (username,email,password) VALUES (?,?,?)`,
    [username, email, hashedPassword],
    function (err) {

      if (err) {
        return res.status(400).json({
          error: "Usuário ou email já existe"
        });
      }

      res.json({
        message: "Usuário registrado com sucesso",
        userId: this.lastID
      });

    }
  );

});

/* ==============================
   LOGIN
============================== */

app.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, user) => {

      if (!user) {
        return res.status(401).json({
          error: "Usuário não encontrado"
        });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(401).json({
          error: "Senha inválida"
        });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });

    }
  );

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
      error: "Token inválido"
    });

  }

}

/* ==============================
   PERFIL
============================== */

app.get("/perfil", authMiddleware, (req, res) => {

  db.get(
    `SELECT id,username,xp,level FROM users WHERE id = ?`,
    [req.user.id],
    (err, user) => {

      res.json(user);

    }
  );

});

/* ==============================
   USERS
============================== */

app.get("/users", (req, res) => {

  db.all(
    `SELECT id,username,xp,level FROM users`,
    [],
    (err, rows) => {

      res.json(rows);

    }
  );

});

/* ==============================
   LEADERBOARD
============================== */

app.get("/leaderboard", (req, res) => {

  db.all(
    `SELECT id,username,xp as score,
    RANK() OVER (ORDER BY xp DESC) as rank
    FROM users`,
    [],
    (err, rows) => {

      res.json(rows);

    }
  );

});

/* ==============================
   NODES (MOCK POR ENQUANTO)
============================== */

app.get("/nodes", (req, res) => {

  res.json([
    { id: "1", country: "Brazil", status: "active", activity: 80 },
    { id: "2", country: "USA", status: "active", activity: 75 },
    { id: "3", country: "Japan", status: "stable", activity: 65 }
  ]);

});

/* ==============================
   SERVER
============================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log("Servidor rodando na porta " + PORT);

});
