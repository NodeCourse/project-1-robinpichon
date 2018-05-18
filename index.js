const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Sequelize = require('sequelize');

const db = new Sequelize('blog', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});


/*const Post = db.define('post', {
    title: {
        type: Sequelize.STRING
    },
    content: {
        type: Sequelize.TEXT
    }
}, {
    getterMethods: {
        score() {
            return this.getDataValue('votes').reduce((total, vote) => {
                if (vote.type === 'up') {
                    return total + 1;
                }

                if (vote.type === 'down') {
                    return total - 1;
                }

                return total;
            }, 0);
        }
    }
});*/

const Vote = db.define('vote', {
    type: { type: Sequelize.ENUM('up', 'down') }
});

const Article = db.define('article', {
    pseudo: { type: Sequelize.TEXT },
    title: { type: Sequelize.STRING },
    note: { type: Sequelize.TINYINT },
    content: { type: Sequelize.TEXT }
  }, {
        getterMethods: {
            score() {
                return this.getDataValue('votes').reduce((total, vote) => {
                    if (vote.type === 'up') {
                        return total + 1;
                    }

                    if (vote.type === 'down') {
                        return total - 1;
                    }

                    return total;
                }, 0);
            }
        }

});

Article.hasMany(Vote);
Vote.belongsTo(Article);

const Log = db.define('log', {
    email: { type: Sequelize.TEXT },
    password: { type: Sequelize.TEXT }
});

const Reponse = db.define('reponse', {
    reponse: { type: Sequelize.TEXT },
    pseudo: { type: Sequelize.TEXT }
});

Reponse.belongsTo(Article)
Article.hasMany(Reponse)

// This secret will be used to sign and encrypt cookies
const COOKIE_SECRET = 'cookie secret';

passport.use(new LocalStrategy((email, password, callback)=> {
  Log
  .findOne({ where: { email, password }})
  .then((user)=> {
    if (user){
      callback(null, user);
    }else {
      callback(null,false, {
        message: 'Invalid credentials'
      });
    }
  })
  .catch(callback);
}));

// Save the user's email address in the cookie
passport.serializeUser((user, cb) => {
    cb(null, user.email);
});

passport.deserializeUser((email, callback) => {
  Log
  .findOne({ where: { email }})
  .then((user)=> {
    if (user){
      callback(null, user);
    }else {
      callback(null,false, {
        message: 'Invalid credentials'
      });
    }
  })
  .catch(callback);
});

// Create an Express application
const app = express();

// Use Pug for the views
app.set('view engine', 'pug');

// Parse cookies so they're attached to the request as
// request.cookies
app.use(cookieParser(COOKIE_SECRET));

// Parse form data content so it's available as an object through
// request.body
app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize passport, it must come after Express' session() middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', (req, res) => {
    // Render the login page
    res.render('login');
});
app.get('/create', (req, res) => {
    // Render the login page
    res.render('create');
});

/*app.get('/', (req, res) => {
    Article
        .findAll({ include: [Vote] })
        .then(posts => res.render('home', { articles: posts, user: req.user }));
});*/

app.post('/login',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/login'
    })
);

app.post('/create', (req, res) => {
  Log.create({email: req.body.email, password: req.body.password})
  .then((log) => {
    req.login(log, ()=>{
      res.redirect('/')
    })
  })
});

app.get('/', (req, res) => {
    Article
        .findAll({ include: [ Vote, Reponse ] })
        .then((articles) => {
            res.render('home', { articles, user: req.user });
        });
});

app.get('/commentaire/:id', (req, res) => {
    Article
        .findById(req.params.id)
        .then((article) => {
            res.render('commentaire', { article:article, user:req.user });
        });
});

/*app.get('/', (req, res) => {
    Log
        .findAll({ include: [ Reponse ] })
        .then((logs) => {
            res.render('home', { logs, user:req.user });
        });
});*/

/*app.get('/home', (req, res) => {
    Reponse
        .findAll()
        .then((reponses) => {
            res.render('home', { logs, user:req.user });
        });
});*/

app.post('/', (req, res) => {
  console.log('RACINE');
    const { pseudo, title, note, content, } = req.body;
    Article
        .sync()
        .then(() => Article.create({ pseudo, title, note, content }))
        .then(() => res.redirect('/'));
});

app.post('/commentaire/:id', (req, res) => {
    const { reponse } = req.body;
    Reponse
        .sync()
        .then(() => Reponse.create({ reponse, pseudo:req.user.email, articleId:req.params.id }))
        .then(() => res.redirect('/'));
});

/*app.post('/', (req, res) => {
    const { email, password } = req.body;
    Log
        .sync()
        .then(() => log.create({ email, password }))
        .then(() => res.redirect('/'));
});*/

app.post('/:postID/upvote', (req, res) => {
  console.log('UP');
    Vote
        .create({ type: 'up', articleId: req.params.postID })
        .then(() => res.redirect('/'));
});

app.post('/:postID/downvote', (req, res) => {
    Vote
        .create({ type: 'down', articleId: req.params.postID })
        .then(() => res.redirect('/'));
});

db.sync()
app.listen(3000, () => {
    console.log('Listening on port 3000');
});
