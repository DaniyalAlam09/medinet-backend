const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Register validation rules
const validateRegister = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),

    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),

    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    body('role')
        .isIn(['super_admin', 'hospital', 'doctor', 'patient'])
        .withMessage('Invalid role selected'),

    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    body('gender')
        .optional()
        .isIn(['male', 'female', 'other'])
        .withMessage('Invalid gender selected'),

    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date of birth'),

    body('hospitalId')
        .if(body('role').equals('doctor'))
        .notEmpty()
        .withMessage('Hospital ID is required for doctors')
        .isMongoId()
        .withMessage('Invalid hospital ID format'),

    body('licenseNumber')
        .if(body('role').equals('doctor'))
        .notEmpty()
        .withMessage('License number is required for doctors')
        .isLength({ min: 5, max: 20 })
        .withMessage('License number must be between 5 and 20 characters'),

    body('specialization')
        .if(body('role').equals('doctor'))
        .notEmpty()
        .withMessage('Specialization is required for doctors')
        .isLength({ min: 2, max: 100 })
        .withMessage('Specialization must be between 2 and 100 characters'),

    body('yearsOfExperience')
        .if(body('role').equals('doctor'))
        .isInt({ min: 0, max: 50 })
        .withMessage('Years of experience must be between 0 and 50'),

    body('qualification')
        .if(body('role').equals('doctor'))
        .notEmpty()
        .withMessage('Qualification is required for doctors')
        .isLength({ min: 2, max: 100 })
        .withMessage('Qualification must be between 2 and 100 characters'),


    // Patient validations
    body('emergencyContact')
        .if(body('role').equals('patient'))
        .notEmpty()
        .withMessage('Emergency contact name is required for patients')
        .isLength({ min: 2, max: 100 })
        .withMessage('Emergency contact name must be between 2 and 100 characters'),

    body('emergencyPhone')
        .if(body('role').equals('patient'))
        .notEmpty()
        .withMessage('Emergency contact phone is required for patients')
        .isMobilePhone()
        .withMessage('Please provide a valid emergency contact phone number'),

    body('medicalHistory')
        .if(body('role').equals('patient'))
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Medical history cannot exceed 1000 characters'),

    // Super admin validations
    body('adminLevel')
        .if(body('role').equals('super_admin'))
        .isIn(['system', 'platform', 'support'])
        .withMessage('Invalid admin level selected'),

    body('organization')
        .if(body('role').equals('super_admin'))
        .notEmpty()
        .withMessage('Organization is required for super admins')
        .isLength({ min: 2, max: 100 })
        .withMessage('Organization must be between 2 and 100 characters'),

    body('responsibilities')
        .if(body('role').equals('super_admin'))
        .notEmpty()
        .withMessage('Responsibilities are required for super admins')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Responsibilities must be between 10 and 1000 characters'),

    handleValidationErrors
];

// Login validation rules
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    handleValidationErrors
];

// Forgot password validation rules
const validateForgotPassword = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    handleValidationErrors
];

// Reset password validation rules
const validateResetPassword = [
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    handleValidationErrors
];

// Change password validation rules
const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    handleValidationErrors
];

// Update profile validation rules
const validateUpdateProfile = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),

    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    body('gender')
        .optional()
        .isIn(['male', 'female', 'other'])
        .withMessage('Invalid gender selected'),

    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date of birth'),

    body('address.street')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Street address must not exceed 100 characters'),

    body('address.city')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('City must not exceed 50 characters'),

    body('address.state')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('State must not exceed 50 characters'),

    body('address.zipCode')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Zip code must not exceed 10 characters'),

    body('address.country')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Country must not exceed 50 characters'),

    handleValidationErrors
];

// Hospital validation
const validateHospital = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Hospital name is required')
        .isLength({ max: 100 })
        .withMessage('Hospital name cannot exceed 100 characters'),

    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('phone')
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),

    body('address.street')
        .trim()
        .notEmpty()
        .withMessage('Street address is required')
        .isLength({ max: 200 })
        .withMessage('Street address cannot exceed 200 characters'),

    body('address.city')
        .trim()
        .notEmpty()
        .withMessage('City is required')
        .isLength({ max: 50 })
        .withMessage('City cannot exceed 50 characters'),

    body('address.state')
        .trim()
        .notEmpty()
        .withMessage('State is required')
        .isLength({ max: 50 })
        .withMessage('State cannot exceed 50 characters'),

    body('address.zipCode')
        .trim()
        .notEmpty()
        .withMessage('ZIP code is required')
        .isLength({ max: 10 })
        .withMessage('ZIP code cannot exceed 10 characters'),

    body('address.country')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Country cannot exceed 50 characters'),

    body('type')
        .isIn(['public', 'private', 'non-profit', 'government'])
        .withMessage('Invalid hospital type'),

    body('capacity.beds')
        .isInt({ min: 1 })
        .withMessage('Bed capacity must be at least 1'),

    body('capacity.icuBeds')
        .optional()
        .isInt({ min: 0 })
        .withMessage('ICU bed capacity cannot be negative'),

    body('capacity.emergencyBeds')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Emergency bed capacity cannot be negative'),

    body('website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid website URL'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateChangePassword,
    validateUpdateProfile,
    validateHospital,
    handleValidationErrors
};
