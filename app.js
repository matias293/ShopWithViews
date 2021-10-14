const path = require('path');
const fs = require('fs')

const csrf = require('csurf')
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const multer = require('multer')
const { v4: uuidv4 } = require('uuid');
const helmet = require("helmet");
const compression = require('compression')
const morgan = require('morgan')

const errorController = require('./controllers/error');
const User = require('./models/user');
const {dbConnection} = require('./database/connection')

const MONGODB_URI =
`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@maxcourseshop.wdx8w.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`


const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf()

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'images');
  },
  filename: function(req, file, cb) {
      cb(null, uuidv4() + file.originalname)
  }
});

const fileFilter = (req,file,cb) => {
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    cb(null,true)

  } else {
    cb(null,false)

  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const accessLogStream = fs.createWriteStream(path.join(__dirname,'access.log'),
{ flags: 'a'})

app.use(helmet());
app.use(compression())
app.use(morgan('combined', {stream: accessLogStream}))
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

 app.use(
   multer({storage, fileFilter }).single('image')
 );
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


app.use(express.static(path.join(__dirname, 'public')));

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrfProtection)
app.use(flash())


app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if(!user){
        next()
      }
      req.user = user;
      next();
    })
    .catch(err => {
      throw new Error(err)
    });
});

app.use((req,res,next) => {
   res.locals.isAuthenticated = req.session.isLoggedIn
   res.locals.csrfToken = req.csrfToken()
   next()
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);
const puerto = process.env.PORT || 3000
dbConnection()
  .then(result => {
    console.log('Base de datos online')
    app.listen(puerto);
    console.log('Escuchando puerto', puerto)
  })
  .catch(err => {
    console.log(err);
  });
