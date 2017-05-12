const path = require('path')
const express = require('express')
const app = express()
const mongoose = require('mongoose')

const routes = require('./routes')
routes(app)

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/shorturl')

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('Server running on port', port)
})
