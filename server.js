require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// Rota teste
app.get("/", (req, res) => {
  res.json({ status: "The Circle API running" });
});

// Rota login
app.post("/login", (req, res) => {
  console.log("BODY RECEBIDO:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatórios" });
  }

  if (email === "teste@email.com" && password === "123456") {
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "segredo_teste",
      { expiresIn: "1h" }
    );

    return res.json({ token });
  }

  return res.status(401).json({ error: "Credenciais inválidas" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
