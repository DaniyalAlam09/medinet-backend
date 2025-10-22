const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getSuperAdminDashboard,
    getHospitalDashboard,
    getDoctorDashboard,
    getPatientDashboard
} = require('../controllers/analyticsController');

// @route   GET /api/analytics/super-admin-dashboard
// @desc    Get super admin dashboard data
// @access  Private (Super Admin only)
router.get('/super-admin-dashboard', protect, authorize('super_admin'), getSuperAdminDashboard);

// @route   GET /api/analytics/hospital-dashboard
// @desc    Get hospital dashboard data
// @access  Private (Hospital only)
router.get('/hospital-dashboard', protect, authorize('hospital'), getHospitalDashboard);

// @route   GET /api/analytics/doctor-dashboard
// @desc    Get doctor dashboard data
// @access  Private (Doctor only)
router.get('/doctor-dashboard', protect, authorize('doctor'), getDoctorDashboard);

// @route   GET /api/analytics/patient-dashboard
// @desc    Get patient dashboard data
// @access  Private (Patient only)
router.get('/patient-dashboard', protect, authorize('patient'), getPatientDashboard);

// Legacy routes for backward compatibility
router.get('/dashboard', (req, res) => {
    res.json({ message: 'Get dashboard analytics endpoint - to be implemented' });
});

router.get('/hospitals', (req, res) => {
    res.json({ message: 'Get hospital analytics endpoint - to be implemented' });
});

router.get('/referrals', (req, res) => {
    res.json({ message: 'Get referral analytics endpoint - to be implemented' });
});

router.get('/patients', (req, res) => {
    res.json({ message: 'Get patient analytics endpoint - to be implemented' });
});

router.get('/reports', (req, res) => {
    res.json({ message: 'Get reports endpoint - to be implemented' });
});

module.exports = router;
