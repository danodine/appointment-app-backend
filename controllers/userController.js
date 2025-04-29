const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const generateTimeSlots = require('./../utils/slotGenerator');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// update for doctors and clinic
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  let data = {};
  if (user.role == 'doctor') {
    // implement when doing the doctor part
    data = {
      user
    };
  }
  if (user.role == 'patient') {
    data = {
      user: {
        email: user.email,
        name: user.name,
        nationalId: user.nationalId,
        phone: user.phone,
        profile: user.profile,
        age: user.age,
        bloodType: user.bloodType,
        gender: user.gender,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        medicalConditions: user.medicalConditions,
      }
    };
  }
  if (user.role == 'clinic') {
    // implement when doing the clinic
    data = {
      user,
    };
  }

  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }

  const allowedUpdates = ['name', 'email', 'phone', 'profile'];
  const filteredBody = filterObj(req.body, ...allowedUpdates);

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  let profile;
  if (role === 'doctor') {
    profile = {
      consultationFee: req.body.consultationFee,
      biography: req.body.biography,
      availability: req.body.availability,
      consultationDuration: req.body.consultationDuration,
      insurances: req.body.insurances,
      treatments: req.body.treatments,
      paymentMethods: req.body.paymentMethods,
      profession: req.body.profession,
      specialty: req.body.specialty,
      subSpecialty: req.body.subSpecialty,
      languages: req.body.languages,
      verified: false,
    };
  } else if (role === 'patient') {
    profile = {
      age: req.body.age,
      gender: req.body.gender,
      photo: req.body.photo,
      weightKg: req.body.weightKg,
      heightCm: req.body.heightCm,
      bloodType: req.body.bloodType,
      medicalConditions: req.body.medicalConditions,
    };
  } else if (role === 'clinic') {
    profile = {
      doctorsManaged: [],
    };
  }
  if (req.body.role === 'doctor') {
    req.body.clinicCode = crypto.randomBytes(4).toString('hex'); // e.g., "a9b3c7e2"
  }

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    nationalId: req.body.nationalId,
    phone: req.body.phone,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: role,
    birthDate: req.body.birthDate,
    address: req.body.address,
    profile: profile,
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});

// whe use the one in doctor controller
// exports.getAvailableSlots = catchAsync(async (req, res, next) => {
//   const doctor = await User.findById(req.params.id);

//   if (!doctor || doctor.role !== 'doctor') {
//     return next(new AppError('Doctor not found or not a doctor', 404));
//   }

//   const availability = doctor.profile?.availability;
//   const duration = doctor.profile?.consultationDuration;

//   if (!availability || !duration) {
//     return next(
//       new AppError(
//         'Doctor availability or consultation duration is missing',
//         400,
//       ),
//     );
//   }

//   const formatted = availability.map((slot) => {
//     const generated = generateTimeSlots(slot.from, slot.to, duration);
//     return {
//       day: slot.day,
//       slots: generated,
//     };
//   });

//   res.status(200).json({
//     status: 'success',
//     data: formatted,
//   });
// });

exports.reactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      active: true,
      cancellationCount: 0,
      lastCancellationDate: null,
    },
    { new: true },
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'User reactivated successfully',
    data: { user },
  });
});

exports.getMyDoctors = catchAsync(async (req, res, next) => {
  const clinic = await User.findById(req.user.id).populate(
    'doctorsManaged',
    'name email specialty profile',
  );

  if (!clinic || clinic.role !== 'clinic') {
    return next(new AppError('Only clinics can access this route', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doctors: clinic.doctorsManaged,
    },
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
