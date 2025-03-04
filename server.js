require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const moment = require('moment');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));

const db = mysql.createConnection({
   host: process.env.DB_HOST,
   user: process.env.DB_USER,
   password: process.env.DB_PASS,
   database: process.env.DB_NAME
});

db.connect(err => {
   if (err) throw err;
   console.log('MySQL Connected');
});

function isAuthenticated(req, res, next) {
   if (req.session.user) return next();
   res.redirect('/login');
}

app.get('/', isAuthenticated, (req, res) => {
   db.query("SELECT * FROM blog_posts", (err, results) => {
       if (err) throw err;
       results.forEach(post => post.createdAt = moment(post.createdAt).format("MMMM Do YYYY, h:mm:ss a"));
       res.render('index', { posts: results, user: req.session.user });
   });
});

app.get('/create', isAuthenticated, (req, res) => res.render('create'));

app.post('/create', isAuthenticated, (req, res) => {
   const { title, content } = req.body;
   db.query("INSERT INTO blog_posts (title, content) VALUES (?, ?)", [title, content], err => {
       if (err) throw err;
       res.redirect('/');
   });
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
   const { username, password } = req.body;
   db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
       if (err) throw err;
       if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
           req.session.user = results[0];
           res.redirect('/');
       } else {
           res.send('Invalid credentials');
       }
   });
});

app.get('/register', (req, res) => res.render('register'));

app.post('/register', (req, res) => {
   const { username, password } = req.body;
   const hashedPassword = bcrypt.hashSync(password, 10);
   db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], err => {
       if (err) throw err;
       res.redirect('/login');
   });
});

app.get('/logout', (req, res) => {
   req.session.destroy();
   res.redirect('/login');
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));