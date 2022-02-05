import express, { Application } from 'express';
import { routes } from './routes';

// Boot express
export const app: Application = express();

app.use('/static', express.static('./public/static'));

// Application routing
routes(app);
