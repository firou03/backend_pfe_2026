var express = require('express');
var router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middlewares/uploadfile');
const logMiddleware = require('../middlewares/LogMiddleware');

/* GET users listing. */

router.get('/GetAllUsers', logMiddleware, userController.getAllUsers);

router.get('/GetUserById/:id', userController.getUserById);

router.post('/CreateUser', upload.single('permis'), userController.createUser);

router.post('/CreateUserWithImage', upload.single('user_image'), logMiddleware, userController.createUserWithImage);

router.post('/CreateUserAdmin', userController.createUserAdmin);

router.post('/CreateUserModerateur', userController.createUserModerateur);

router.delete('/deleteUser/:id', userController.deleteUser);

router.put('/updateUser/:id', userController.updateUser);


module.exports = router;