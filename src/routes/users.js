const express = require('express');
const {
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
    toggleUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getAllUsers);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;