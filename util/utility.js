const fs = require('fs');
const path = require('path');

exports.throwErr = (err, next) => {
    if(!err.statusCode) {
        err.statusCode = 500;
    }
    return next(err);
}

exports.deleteImage = (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}