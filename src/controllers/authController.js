const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../config/email');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    const options = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                phone: user.phone,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
                profileImage: user.profileImage,
                isActive: user.isActive,
                isEmailVerified: user.isEmailVerified,
                approvalStatus: user.approvalStatus,
                hospitalId: user.hospitalId,
                licenseNumber: user.licenseNumber,
                specialization: user.specialization,
                yearsOfExperience: user.yearsOfExperience,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            role,
            phone,
            dateOfBirth,
            gender,
            address,
            hospitalId,
            licenseNumber,
            specialization,
            yearsOfExperience,
            department,
            position,
            qualification,
            emergencyContact,
            emergencyPhone,
            medicalHistory,
            adminLevel,
            organization,
            responsibilities
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const userData = {
            firstName,
            lastName,
            email,
            password,
            role,
            phone,
            dateOfBirth,
            gender,
            address
        };

        // Add role-specific fields
        if (role === 'doctor') {
            if (!hospitalId) {
                return res.status(400).json({
                    success: false,
                    message: 'Hospital ID is required for doctors'
                });
            }
            userData.hospitalId = hospitalId;
        }

        if (role === 'doctor') {
            if (!licenseNumber || !specialization || !yearsOfExperience) {
                return res.status(400).json({
                    success: false,
                    message: 'License number, specialization, and years of experience are required for doctors'
                });
            }
            userData.licenseNumber = licenseNumber;
            userData.specialization = specialization;
            userData.yearsOfExperience = yearsOfExperience;
            userData.qualification = qualification;
        }

        if (role === 'hospital') {
            if (!department || !position) {
                return res.status(400).json({
                    success: false,
                    message: 'Department and position are required for hospital admins'
                });
            }
            userData.department = department;
            userData.position = position;
        }

        if (role === 'patient') {
            if (!emergencyContact || !emergencyPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Emergency contact and phone are required for patients'
                });
            }
            userData.emergencyContact = emergencyContact;
            userData.emergencyPhone = emergencyPhone;
            userData.medicalHistory = medicalHistory;
        }

        if (role === 'super_admin') {
            if (!adminLevel || !organization || !responsibilities) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin level, organization, and responsibilities are required for super admins'
                });
            }
            userData.adminLevel = adminLevel;
            userData.organization = organization;
            userData.responsibilities = responsibilities;
        }

        // Set approval status based on role
        if (userData.role === 'hospital') {
            userData.approvalStatus = 'pending'; // Will be approved when hospital is approved
        } else if (userData.role === 'doctor') {
            userData.approvalStatus = 'pending'; // Needs hospital admin approval
        } else if (userData.role === 'patient') {
            userData.approvalStatus = 'approved'; // Patients don't need approval
        } else if (userData.role === 'super_admin') {
            userData.approvalStatus = 'approved'; // Super admins are auto-approved
        }

        const user = await User.create(userData);

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(20).toString('hex');
        user.emailVerificationToken = emailVerificationToken;
        await user.save();

        // Send verification email
        try {
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${emailVerificationToken}`;

            await sendEmail({
                email: user.email,
                subject: 'Email Verification - MediNet',
                html: `
                    <h2>Welcome to MediNet!</h2>
                    <p>Please click the link below to verify your email address:</p>
                    <a href="${verificationUrl}" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p>If you didn't create this account, please ignore this email.</p>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Don't fail registration if email sending fails
        }

        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists and is active
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email address'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email address'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send reset email
        try {
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

            await sendEmail({
                email: user.email,
                subject: 'Password Reset - MediNet',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <a href="${resetUrl}" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    <p>This link will expire in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `
            });

            res.status(200).json({
                success: true,
                message: 'Password reset email sent'
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();

            res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide password and confirm password'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Get user by reset token
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Set new password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({ emailVerificationToken: token });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const fieldsToUpdate = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            address: req.body.address,
            profileImage: req.body.profileImage,
            // Role specific optional fields
            licenseNumber: req.body.licenseNumber,
            specialization: req.body.specialization,
            yearsOfExperience: req.body.yearsOfExperience,
            qualification: req.body.qualification,
            department: req.body.department,
            position: req.body.position,
            emergencyContact: req.body.emergencyContact,
            emergencyPhone: req.body.emergencyPhone,
            medicalHistory: req.body.medicalHistory,
            adminLevel: req.body.adminLevel,
            organization: req.body.organization,
            responsibilities: req.body.responsibilities
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key =>
            fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        const user = await User.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all password fields'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateProfile,
    changePassword
};
