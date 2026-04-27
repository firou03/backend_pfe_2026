var express = require('express');
var router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middlewares/uploadfile');
const logMiddleware = require('../middlewares/LogMiddleware');

/* GET users listing. */

router.get('/getAllUsers', logMiddleware, userController.getAllUsers);

// router.get('/getUserById/:id', userController.getUserById); // DISABLED - Profile viewing access removed

router.post('/createUser', upload.single('permis'), userController.createUser);

router.post('/createUserWithImage', upload.single('user_image'), logMiddleware, userController.createUserWithImage);

router.post('/createUserAdmin', userController.createUserAdmin);

router.post('/createUserModerateur', userController.createUserModerateur);

router.delete('/deleteUser/:id', userController.deleteUser);

router.put('/updateUser/:id', userController.updateUser);

router.put('/updateProfilePicture/:id', upload.single('user_image'), userController.updateUserProfilePicture);


module.exports = router;