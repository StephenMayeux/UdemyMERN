const mongoose = require('mongoose')
const Schema = mongoose.Schema

const searchSchema = new Schema({
  term: String
}, { timestamps: true })

const ModelClass = mongoose.model('search', searchSchema)
module.exports = ModelClass
