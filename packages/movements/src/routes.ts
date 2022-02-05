import { IndexController } from './controllers/IndexController';
import { Application, Router } from 'express';

const routeLists: [string, Router][] = [
  ['/', IndexController]
];

export const routes = (app: Application) => {
  routeLists.forEach(route => {
    const [url, controller] = route;
    app.use(url, controller);
  });
};
