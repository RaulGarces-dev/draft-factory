require('dotenv').config();
const express = require('express');
const cors = require('cors');
const generatorRoutes = require('./routes/generator.routes');
const constructorRoutes = require('./routes/constructor.routes');
const jobsRoutes = require('./routes/jobs.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    exposedHeaders: ['x-total-rows']
}));
app.use(express.json());

app.use('/api/generator', generatorRoutes);
app.use('/api/constructor', constructorRoutes);
app.use('/api/jobs', jobsRoutes);

// Importar el servicio de colas para asegurar que se registre y se mantenga en memoria
require('./services/queue.service');


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

