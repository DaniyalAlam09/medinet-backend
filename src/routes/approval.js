const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
    getPendingUsers,
    getPendingHospitals,
    getPendingDoctors,
    approveUser,
    rejectUser,
    approveHospital,
    rejectHospital,
    getApprovalStats
} = require('../controllers/approvalController');

const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Approval
 *   description: User and hospital approval management
 */

/**
 * @swagger
 * /api/approval/pending-users:
 *   get:
 *     summary: Get all pending users (Super Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [doctor, hospital, patient]
 *         description: Filter by user role
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Pending users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/pending-users', protect, authorize('super_admin'), getPendingUsers);

/**
 * @swagger
 * /api/approval/pending-hospitals:
 *   get:
 *     summary: Get all pending hospitals (Super Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Pending hospitals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     hospitals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Hospital'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/pending-hospitals', protect, authorize('super_admin'), getPendingHospitals);

/**
 * @swagger
 * /api/approval/pending-doctors:
 *   get:
 *     summary: Get pending doctors for hospital (Hospital Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Pending doctors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     doctors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hospital Admin only
 */
router.get('/pending-doctors', protect, authorize('hospital'), getPendingDoctors);

/**
 * @swagger
 * /api/approval/approve-user/{userId}:
 *   post:
 *     summary: Approve a user (Super Admin or Hospital Admin)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to approve
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Optional approval message
 *                 example: "Welcome to MediNet! Your account has been approved."
 *     responses:
 *       200:
 *         description: User approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - User not pending approval
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post('/approve-user/:userId', protect, authorize('super_admin', 'hospital'), [
    body('message').optional().isString().trim().isLength({ max: 500 })
], approveUser);

/**
 * @swagger
 * /api/approval/reject-user/{userId}:
 *   post:
 *     summary: Reject a user (Super Admin or Hospital Admin)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: User rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User rejected successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - Missing reason or user not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post('/reject-user/:userId', protect, authorize('super_admin', 'hospital'), [
    body('reason').notEmpty().isString().trim().isLength({ min: 10, max: 500 })
], rejectUser);

/**
 * @swagger
 * /api/approval/approve-hospital/{hospitalId}:
 *   post:
 *     summary: Approve a hospital (Super Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hospitalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID to approve
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Optional approval message
 *                 example: "Welcome to the MediNet network!"
 *     responses:
 *       200:
 *         description: Hospital approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hospital approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Bad request - Hospital not pending approval
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Hospital not found
 */
router.post('/approve-hospital/:hospitalId', protect, authorize('super_admin'), [
    body('message').optional().isString().trim().isLength({ max: 500 })
], approveHospital);

/**
 * @swagger
 * /api/approval/reject-hospital/{hospitalId}:
 *   post:
 *     summary: Reject a hospital (Super Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hospitalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Hospital rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hospital rejected successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Bad request - Missing reason or hospital not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 *       404:
 *         description: Hospital not found
 */
router.post('/reject-hospital/:hospitalId', protect, authorize('super_admin'), [
    body('reason').notEmpty().isString().trim().isLength({ min: 10, max: 500 })
], rejectHospital);

/**
 * @swagger
 * /api/approval/stats:
 *   get:
 *     summary: Get approval statistics (Super Admin only)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approval statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     pendingUsers:
 *                       type: integer
 *                       example: 15
 *                     approvedUsers:
 *                       type: integer
 *                       example: 150
 *                     rejectedUsers:
 *                       type: integer
 *                       example: 5
 *                     pendingHospitals:
 *                       type: integer
 *                       example: 3
 *                     approvedHospitals:
 *                       type: integer
 *                       example: 25
 *                     rejectedHospitals:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get('/stats', protect, authorize('super_admin'), getApprovalStats);

module.exports = router;
