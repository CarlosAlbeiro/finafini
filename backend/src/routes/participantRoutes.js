const express = require('express');
const router = express.Router();
const { inviteParticipant, getMyInvitations, respondInvitation } = require('../controllers/participantController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/invite', inviteParticipant);
router.get('/my-invitations', getMyInvitations);
router.post('/invitations/:id/respond', respondInvitation);

module.exports = router;
