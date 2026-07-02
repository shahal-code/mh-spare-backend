export const preventCache = (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "-1");
    next();
};

export const setLocals = (req, res, next) => {
    res.locals.loginMethod = req.session ? req.session.loginMethod : null;
    res.locals.path = req.path;
    next();
};
