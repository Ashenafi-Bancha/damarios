import { Router } from 'express';
import { requireAuth } from '../../lib/auth';
import orders, { requests } from './orders';
import production from './production';
import inventory from './inventory';
import fashion from './fashion';
import people from './people';
import recruitment from './recruitment';
import finance from './finance';
import training from './training';
import system from './system';

const admin = Router();

// Every admin route needs a signed-in user; each section then checks its own module permission.
admin.use(requireAuth);
admin.use('/orders', orders);
admin.use('/requests', requests);
admin.use('/production', production);
admin.use('/inventory', inventory);
admin.use('/fashion', fashion);
admin.use('/people', people);
admin.use('/recruitment', recruitment);
admin.use('/finance', finance);
admin.use('/training', training);
admin.use('/', system);

export default admin;
