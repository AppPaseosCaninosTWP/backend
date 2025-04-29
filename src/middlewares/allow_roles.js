/**
 * Middleware que permite el acceso solo a usuarios con ciertos roles.
 * @param  {...number} roles_permitidos - Lista de role_id permitidos
 */
const allow_roles = (...roles_permitidos) => {
  return (req, res, next) => {
    if (!req.user || !roles_permitidos.includes(req.user.role_id)) {
      return res.status(403).json({
        msg: "Acceso denegado: no tienes permisos suficientes",
        error: true,
      });
    }
    next();
  };
};

module.exports = allow_roles;
