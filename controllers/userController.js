const User = require('./../models/userModel');
const Appointment = require('./../models/appointmentModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// const filterObj = (obj, ...allowedFields) => {
//   const newObj = {};
//   Object.keys(obj).forEach((el) => {
//     if (allowedFields.includes(el)) newObj[el] = obj[el];
//   });
//   return newObj;
// };

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/img/users'));
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    const filename = `user-${req.user.id}.${ext}`;
    cb(null, filename);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Please upload only images', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

// update for doctors and clinic
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  let data = {};
  if (user.role == 'doctor') {
    // implement when doing the doctor part
    data = {
      user,
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
      },
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

// check for doctors and clinic
exports.updateMe = [
  upload.single('photo'),
  async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400,
        ),
      );
    }

    const updateObject = {};

    // Root fields
    if (req.body.name) updateObject.name = req.body.name;
    if (req.body.email) updateObject.email = req.body.email;
    if (req.body.phone) updateObject.phone = req.body.phone;

    // Profile fields (flatten dot notation from FormData)
    for (const key in req.body) {
      if (key.startsWith('profile.')) {
        for (const key in req.body) {
          if (key.startsWith('profile.')) {
            const subKey = key.replace('profile.', '');
            try {
              if (
                ['medicalConditions', 'vaccines', 'address'].includes(subKey)
              ) {
                updateObject[`profile.${subKey}`] = JSON.parse(req.body[key]);
              } else {
                updateObject[`profile.${subKey}`] = req.body[key];
              }
            } catch (err) {
              console.error(`Error parsing ${key}:`, err.message);
            }
          }
        }
      }
    }

    // Save uploaded photo
    if (req.file) {
      updateObject['profile.photo'] = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateObject,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  },
];

// check for doctors and clinic
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Delete user's photo if it exists
  const photoFilename = user?.profile?.photo;
  if (photoFilename) {
    const photoPath = path.join(
      __dirname,
      '../public/img/users',
      photoFilename,
    );
    fs.unlink(photoPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting photo:', err);
      }
    });
  }

  // Delete appointments and user
  await Appointment.deleteMany({ user: req.user.id });
  await User.findByIdAndDelete(req.user.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// works for patient chek for doctor
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

// not in use
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

// not in use
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

// not in use using delete me
exports.inactivateMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
