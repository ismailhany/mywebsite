const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login?error=Please login to access this page');
    }
    next();
};

const isTeacher = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'teacher') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You must be a teacher to access this page.'
        });
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You must be an administrator to access this page.'
        });
    }
    next();
};

module.exports = {
    isAuthenticated,
    isTeacher,
    isAdmin
}; 