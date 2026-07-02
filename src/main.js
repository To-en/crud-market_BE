import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import router from './routes/index.js';
import sequelize from './sequelize.js'
import makeLogger from './logger.js'
import morgan from 'morgan';
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

const app = express();
const PORT = process.env.PORT || 3000;
const logger = makeLogger(import.meta.url);
logger.info("─".repeat(20) + " SERVER START " + "─".repeat(20));
const httpLogger = morgan(
  (tokens, req, res) => JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    length: tokens.res(req, res, 'content-length'),
    ms: Number(tokens['response-time'](req, res)),
  }),
  { stream: { write: (msg) => logger.http(msg.trim()) } },
);

// npm run start --sync-db or -s 
// force alter actual db to match sequelized definition of model
const argv = yargs(hideBin(process.argv))
  .option("sync-db", {
    alias: "s",
    description: "Synchronize the database",
    type: "boolean",
  })
  .help()
  .alias("help", "h").argv;
  if (argv.syncDb) {
    logger.info("Synchronizing database...");
    await sequelize.sync({ alter: { drop: false } });
    logger.info("Database synchronized");
    await sequelize.close();
}

// --- Server Bootstraps 

app.use(cors(
  // Allow these (Except the rest)
  // Excecpt these (Allow the rest)
));
app.set("query parser", "extended");



app.use(httpLogger);   // mount before routes, after express.json()
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/", (_req, res) => { res.send("Ingredient Market API"); });
app.get("/health", (_req, res) => res.json({ status: "ok", ingredients: ingredients.length })); // health check should return health things
app.get("/log", (_req,res) => { })
app.use("/api", router); // API Endpoint routes
app.listen(PORT, () => {
  logger.info(`--Listening on http://localhost:${PORT}`);
  logger.info(`--Swagger UI at http://localhost:${PORT}/api-docs`);
});




