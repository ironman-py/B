const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['https://bk-beige.vercel.app'];

// Middleware
app.use(
    cors({
      origin: (origin, callback) => {
        // Verifica se a origem da requisição está na lista de origens permitidas
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'], // Métodos permitidos
      credentials: true, // Permite o envio de credenciais (cookies, headers de autenticação, etc.)
    })
  );
app.use(express.json());

// Conectar ao MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Definir o schema e modelo para os links
const linkSchema = new mongoose.Schema({
    full: {
        type: String,
        required: true,
    },
    short: {
        type: String,
        required: true,
        default: shortid.generate,
    },
    clicks: {
        type: Number,
        required: true,
        default: 0,
    },
});

const Link = mongoose.model('Link', linkSchema);

// Função para formatar a URL original
const formatUrl = (url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`; // Adiciona "http://" se não tiver
    }
    return url;
};

// Rota para encurtar um link
app.post('/shorten', async (req, res) => {
    const { fullUrl } = req.body;
    try {
        const formattedUrl = formatUrl(fullUrl); // Formata a URL original

        // Verifica se o link já foi encurtado antes
        const existingLink = await Link.findOne({ full: formattedUrl });
        if (existingLink) {
            return res.json(existingLink); // Retorna o link existente
        }

        // Cria um novo link encurtado
        const link = await Link.create({ full: formattedUrl });
        res.json(link);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao encurtar o link' });
    }
});

// Rota para redirecionar para a URL original
app.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;
    try {
        const link = await Link.findOne({ short: shortUrl });

        if (link) {
            link.clicks++;
            await link.save();
            res.redirect(link.full); // Redireciona para a URL original
        } else {
            res.status(404).json({ error: 'Link não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar o link' });
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});