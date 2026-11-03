// User hooks/api


function setUserSession(req, user) {
    req.session.user = {
        user_id: user.user_id,
        username: user.username,
        email: user.email
    };
}

function isAuthenticated(req) {
    return !!req.session.user;
}

/* 
Use this function when routing to any protected path (next).
For example:
router.get('/courses', requireAuth, (req, res) => {
    res.render('courses');
});
*/
function requireAuth(req, res, next) {
    if (!isAuthenticated(req)) {
        return res.redirect('/login');
    }

    next();
}

function getCurrentUser(req) {
    return req.session.user || null;
}

function clearUserSession(req) {
    req.session.destroy((err) => {
        if (err) {
            console.error('Failed to destroy session:', err);
        }
    });
}

module.exports = {
    setUserSession,
    isAuthenticated,
    requireAuth,
    getCurrentUser,
    clearUserSession
};