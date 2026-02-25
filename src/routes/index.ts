import { Router } from 'express';
import { CheckpointController } from '../controllers/CheckpointController.js';
import { CheckinController } from '../controllers/CheckinController.js';
import { ProgressController } from '../controllers/ProgressController.js';
import { CertificateController } from '../controllers/CertificateController.js';
import { ProfileController } from '../controllers/ProfileController.js'; 

const routes = Router();
const checkpointController = new CheckpointController();
const checkinController = new CheckinController();
const progressController = new ProgressController();
const certificateController = new CertificateController();
const profileController = new ProfileController();

routes.get('/', (req, res) => {
  res.json({ mensagem: 'Bem-vindo à API do Passaporte da Ciclorota! 🚴‍♂️' });
});

routes.get('/checkpoints', checkpointController.index);
routes.post('/checkins', checkinController.store);
routes.get('/progress/:userId', progressController.show);
routes.post('/certificates', certificateController.store);
routes.get('/profiles/:userId', profileController.show);
routes.put('/profiles/:userId', profileController.update);

export default routes;