const db = require('../config/database');

exports.auditLog = (tableName) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data.success && req.user) {
        const action = `${req.method} ${req.path}`;
        const recordId = data.data?.id || req.params.id;
        
        db.run(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_value, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.user.id, action, tableName, recordId, JSON.stringify(data.data), req.ip]
        );
      }
      
      return originalJson(data);
    };
    
    next();
  };
};
