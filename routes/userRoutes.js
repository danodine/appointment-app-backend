const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const doctorController = require('./../controllers/doctorController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.get('/search', authController.restrictTo('patient', 'admin'), doctorController.searchDoctors);
router.get('/doctor/:id', authController.restrictTo('patient', 'clinic', 'admin'), doctorController.getDoctorById);

router.get(
  '/doctors/:id/slots',
  doctorController.getAvailableSlots,
  authController.restrictTo('doctor', 'admin')
);
router.get(
  '/doctors',
  userController.getDoctors,
  authController.restrictTo('doctor', 'admin')
);
router.patch(
  '/clinic-code',
  authController.protect,
  userController.regenerateClinicCode,
  authController.restrictTo('doctor', 'admin')
);

// clinic add doctor
router.post(
  '/add-doctor',
  authController.protect,
  userController.addDoctorToClinic,
  authController.restrictTo('clinic', 'admin')
);
router.get(
  '/my-doctors',
  authController.protect,
  authController.restrictTo('clinic'),
  userController.getMyDoctors
);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

router.patch('/:id/reactivate', userController.reactivateUser);

module.exports = router;
