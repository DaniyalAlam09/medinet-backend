const User = require('../models/User');
const Hospital = require('../models/Hospital');

// Check if user is approved based on their role
const checkApprovalStatus = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Super admins are always approved
        if (user.role === 'super_admin') {
            return next();
        }

        // Check approval status based on role
        if (user.role === 'hospital') {
            // Hospitals need to be approved by super admin
            if (user.approvalStatus !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: 'Your hospital registration is pending approval from Super Admin. Please wait for approval.',
                    requiresApproval: true,
                    approvalType: 'hospital',
                    status: user.approvalStatus
                });
            }
        }

        if (user.role === 'doctor') {
            // Doctors need to be approved by hospital
            if (user.approvalStatus !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: 'Your doctor registration is pending approval from Hospital. Please wait for approval.',
                    requiresApproval: true,
                    approvalType: 'doctor',
                    status: user.approvalStatus
                });
            }

            // Also check if their hospital is approved
            const hospital = await Hospital.findById(user.hospitalId);
            if (!hospital || hospital.status !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: 'Your hospital is not approved yet. Please wait for hospital approval.',
                    requiresApproval: true,
                    approvalType: 'hospital',
                    status: hospital?.status || 'not_found'
                });
            }
        }

        if (user.role === 'patient') {
            // Patients don't need approval
            return next();
        }

        next();
    } catch (error) {
        console.error('Approval check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during approval check'
        });
    }
};

module.exports = { checkApprovalStatus };
