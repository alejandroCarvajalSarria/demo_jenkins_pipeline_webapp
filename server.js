const express = require('express');
const app = express();
app.get('/', (_req, res) => res.send('Hello from Alek v4 🚀'));
app.listen(3000, () => console.log('listening on 3000'));
