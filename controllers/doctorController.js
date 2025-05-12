const User = require('./../models/userModel');
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
  const { q, city } = req.query;

  const query = {
    role: 'doctor',
  };

  if (q) {
    const keyword = q.trim();
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { 'profile.specialty': { $regex: keyword, $options: 'i' } },
      { 'profile.subSpecialty': { $regex: keyword, $options: 'i' } },
    ];
  }

  if (city) {
    query['profile.address.city'] = city;
  }
  console.log(query)

  const doctors = await User.find(query).select(
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

// Not in use
exports.getDoctors = catchAsync(async (req, res, next) => {
  const queryObj = {
    role: 'doctor',
    ...req.query,
  };

  const doctors = await User.find(queryObj);

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: { doctors },
  });
});

exports.addDoctorToClinic = catchAsync(async (req, res, next) => {
  const { clinicCode } = req.body;

  const doctor = await User.findOne({ clinicCode, role: 'doctor' });
  if (!doctor)
    return next(new AppError('Invalid code or doctor not found', 404));

  const clinic = await User.findById(req.user.id);
  if (!clinic || clinic.role !== 'clinic') {
    return next(new AppError('Only clinics can add doctors', 403));
  }

  if (!clinic.doctorsManaged.includes(doctor._id)) {
    clinic.doctorsManaged.push(doctor._id);
    await clinic.save();
  }

  res.status(200).json({
    status: 'success',
    message: 'Doctor linked to clinic successfully.',
    data: { doctorId: doctor._id },
  });
});

exports.regenerateClinicCode = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user || user.role !== 'doctor') {
    return next(new AppError('Only doctors can regenerate clinic codes', 403));
  }

  const newCode = crypto.randomBytes(4).toString('hex');
  user.clinicCode = newCode;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Clinic code regenerated',
    data: {
      clinicCode: newCode,
    },
  });
});
