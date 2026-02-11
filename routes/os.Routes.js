var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/os', function(req, res, next) {
  res.json('index');
  res.json({ message: 'Operating Systems router' });
});

module.exports = router;
