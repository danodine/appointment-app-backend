const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const doctorController = require('./../controllers/doctorController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// not in use
router.post('/forgotPassword', authController.forgotPassword);
// not in use
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

// not in use
router.patch('/updateMyPassword', authController.updatePassword);
// not in use
router.get('/me', userController.getMe, userController.getUser);
// not in use
router.patch('/updateMe', userController.updateMe);
// not in use
router.delete('/deleteMe', userController.deleteMe);

router.get(
  '/search',
  authController.restrictTo('patient', 'admin'),
  doctorController.searchDoctors,
);
router.get(
  '/doctor/:id',
  authController.restrictTo('patient', 'clinic', 'admin'),
  doctorController.getDoctorById,
);

router.get(
  '/doctors/:id/slots',
  authController.restrictTo('doctor', 'admin'),
  doctorController.getAvailableSlots,
);
// not in use
router.get(
  '/doctors',
  authController.restrictTo('doctor', 'admin'),
  doctorController.getDoctors,
);
// not in use
router.patch(
  '/clinic-code',
  authController.protect,
  authController.restrictTo('doctor', 'admin'),
  doctorController.regenerateClinicCode,
);

// clinic add doctor
router.post(
  '/add-doctor',
  authController.protect,
  authController.restrictTo('clinic', 'admin'),
  doctorController.addDoctorToClinic,
);
// not in use
router.get(
  '/my-doctors',
  authController.protect,
  authController.restrictTo('clinic'),
  userController.getMyDoctors,
);
// not in use
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
