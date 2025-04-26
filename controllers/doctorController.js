const User = require('./../models/userModel');
// const Appointment = require('./../models/appointmentModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const generateTimeSlots = require('./../utils/slotGenerator');

exports.getAvailableSlots = catchAsync(async (req, res, next) => {
  const doctor = await User.findById(req.params.id);

  if (!doctor || doctor.role !== 'doctor') {
    return next(new AppError('Doctor not found', 404));
  }

  const availableDays = doctor.profile.availability;
  const duration = doctor.profile.consultationDuration;

  const fullSlots = availableDays.map((dayEntry) => {
    const slots = generateTimeSlots(
      dayEntry.from || '09:00',
      dayEntry.to || '17:00',
      duration,
    );
    return {
      day: dayEntry.day,
      slots,
    };
  });

  res.status(200).json({
    status: 'success',
    data: fullSlots,
  });
});

exports.searchDoctors = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return next(new AppError('Search query is required', 400));
  }

  const keyword = q.trim();

  const doctors = await User.find({
    role: 'doctor',
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { 'profile.specialty': { $regex: keyword, $options: 'i' } },
      { 'profile.subSpecialty': { $regex: keyword, $options: 'i' } },
    ],
  }).select(
    '-clinicCode -__v -nationalId -doctorsManaged -role -active -createdAt -updatedAt',
  ); 

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: doctors,
  });
});

exports.getDoctorById = catchAsync(async (req, res, next) => {
  const doctor = await User.findById(req.params.id).select(
    '-clinicCode -__v -nationalId -doctorsManaged -createdAt -updatedAt',
  );

  if (!doctor || doctor.role !== 'doctor') {
    return next(new AppError('Doctor not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
});
