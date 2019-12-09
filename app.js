const path = require('path');
const https = require('https');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const graphqlHttp = require('express-graphql');

const connectDB = require('./util/database');
const { deleteImage } = require('./util/utility');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const isAuth = require('./middleware/isAuth');

const app = express();

const privateKey = fs.readFileSync('server.key');
const certificate = fs.readFileSync('server.cert');


const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, `${new Date().toISOString()}_${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if(['image/png','image/jpg','image/jpeg'].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

app.use(bodyParser.json()); // application/json 
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

//CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // graphQL only accepts get and post request.
    if(req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(isAuth);

// call this api separately(from frontend) to store image as graphQL only works with JSON obj.
app.put('/post-image', (req, res, next) => {
    if(!req.isAuth) {
        throw new Error('Not Authenticated')
    }
    if(!req.file) {
        return res.status(200).json({message: 'No file provided!'});
    }
    if(req.body.oldPath) deleteImage(req.body.oldPath);
    return res.status(201).json({
        message: 'File stored',
        filePath: req.body.oldPath
    });
});

app.use('/graphql', graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true, // gives GraphiQL (visit localhost:PORT/graphql)
    customFormatErrorFn(err) {
        if(!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An error occurred';
        const code = err.originalError.code || 500;
        return {
            message: message,
            status: code,
            data: data
        };
    }
}));

// error handling middleware
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({
        message: message,
        data: data
    });
});

connectDB(() => {
    app.listen(process.env.PORT);
    // https
    //     .createServer({ key: privateKey, cert: certificate}, app)
    //     .listen(process.env.PORT);
    console.log(`Node server listening on port: ${process.env.PORT}`);
});