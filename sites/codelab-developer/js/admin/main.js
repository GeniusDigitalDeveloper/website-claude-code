import { bootAdmin } from './shell.js';
import * as P from './pages.js';
const page = document.body.dataset.page;
bootAdmin(page, (state) => P[page](state));
