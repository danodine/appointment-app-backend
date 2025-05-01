const express = require('express');
const appointmentController = require('./../controllers/appointmentController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Create appointment
router.post(
  '/new',
  authController.restrictTo('patient', 'doctor', 'clinic'),
  authController.ownsDoctor,
  appointmentController.createAppointment,
);

// Get all (admin only)
router.get(
  '/all',
  authController.restrictTo('admin', 'clinic'),
  appointmentController.getAllAppointments,
);

// 📖 Get all by user (user or admin/clinic)
router.get(
  '/user/upcoming/:userId',
  authController.restrictTo('admin', 'clinic', 'patient'),
  appointmentController.getUpcomingAppointmentsByUser,
);
router.get(
  '/user/past/:userId',
  authController.restrictTo('admin', 'clinic', 'patient'),
  appointmentController.getPastAppointmentsByUser,
);

// 📖 Get all by doctor — secured by ownsDoctor
router.get(
  '/doctor/:doctorId',
  authController.ownsDoctor,
  appointmentController.getAppointmentsByDoctor,
);

router.get(
  '/available-dates/:doctorId/:location',
  authController.restrictTo('admin', 'patient', 'clinic'),
  appointmentController.getAvailableDates,
);
router.get(
  '/available-times/:doctorId/:date/:location',
  authController.restrictTo('admin', 'patient', 'clinic'),
  appointmentController.getAvailableTimesForDate,
);

// Get appointments for a user
// router.get('/user/:userId', appointmentController.getAppointmentsByUser);

// Get appointments for a doctor
// router.get('/doctor/:doctorId', appointmentController.getAppointmentsByDoctor);

router.patch('/:appointmentId/cancel', appointmentController.cancelAppointment);

router.get(
  '/filter',
  authController.restrictTo('admin', 'clinic', 'doctor'),
  appointmentController.getFilteredAppointments,
);

module.exports = router;
