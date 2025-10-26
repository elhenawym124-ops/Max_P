const express = require('express');
const router = express.Router();
const facebookIntegration = require('../controller/facebookIntegration');
const verifyToken = require('../utils/verifyToken');

router.get('/facebook/connected', verifyToken.authenticateToken, facebookIntegration.getConnectedFacebookPages);
router.get('/facebook/page/:pageId',verifyToken.authenticateToken, facebookIntegration.getSpecificFacebookPageDetails);
router.get('/facebook/config', verifyToken.authenticateToken, facebookIntegration.getFacebookAppConfig);
router.post('/facebook/test', verifyToken.authenticateToken, facebookIntegration.testFacebookPageToken);
router.post('/facebook/connect', verifyToken.authenticateToken, facebookIntegration.connectFacebookPage);
router.get('/facebook/diagnostics', verifyToken.authenticateToken, facebookIntegration.facebookDiagnostics);
router.delete('/facebook/:pageId', verifyToken.authenticateToken, facebookIntegration.disconnectFacebookPage);
router.put('/facebook/:pageId', verifyToken.authenticateToken, facebookIntegration.updateFacebookPageSettings);
router.get('/facebook/:pageId', verifyToken.authenticateToken, facebookIntegration.getFacebookPageDetails);

module.exports = router;