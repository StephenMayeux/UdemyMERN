const fetch = require('isomorphic-fetch')
const async = require('async')
const _ = require('lodash')

const helper = require('sendgrid').mail
const fromEmail = new helper.Email('info@booktrader.com')
const acceptSubject = 'Your request was accepted'
const rejectSubject = 'Your request was rejected'
const acceptContent = 'Your book request was accepted and was added to your library!'
const rejectContent = 'Your book request was rejected and has been removed. Request another book.'
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY)

const User = require('../models/user')
const Book = require('../models/book')

const BASE_API_URL = `https://www.googleapis.com/books/v1/volumes?key=${process.env.GOOGLE_BOOKS_API}`

exports.searchForBooks = (req, res) => {
  fetch(`${BASE_API_URL}&q=${req.params.book}`)
    .then(response => response.json())
    .then(bookData => {
      const books = bookData.items.map(book => {
        const { id, volumeInfo: { title, subtitle, authors, imageLinks: { thumbnail } }  } = book
        return { _id: id, title, subtitle, authors, thumbnail }
      })
      res.send({ success: true, books })
    })
    .catch(err => res.status(500).send({ success: false, err }))
}

exports.addBookToMyLibrary = (req, res) => {
  const { _id, title, subtitle, authors, thumbnail } = req.body
  async.waterfall([
    (callback) => {
      Book.findById(_id).lean().exec((err, book) => {
        if (err) return callback(err)
        callback(null, book)
      })
    },
    (book, callback) => {
      if (!book) {
        const newBook = new Book({ _id, title, subtitle, authors, thumbnail })
        newBook.save(err => {
          if (err) return callback(err)
          callback(null, newBook.toObject())
        })
      }
      else {
        callback(null, book)
      }
    },
    (book, callback) => {
      const newBookObj = { book: book._id, requested_by: [] }
      User.findByIdAndUpdate(req.user._id, { $push: { library: newBookObj } }, { new: true }).populate('library.book').populate('library.requested_by').exec((err, user) => {
        if (err) return callback(err)
        // TODO: only send properties from user object that we care about
        callback(null, user)
      })
    }
  ], (err, user) => {
    if (err) return res.status(500).send({ success: false, err })
    res.send({ success: true, user })
  })
}

exports.getUsersBooks = (req, res) => {
  User.findById(req.params.id).populate('library.book').populate('library.requested_by').exec((err, user) => {
    if (err) return res.status(500).send({ success: false, err })
    res.send({ success: true, user })
  })
}

exports.removeBookFromMyLibrary = (req, res) => {
  User.findByIdAndUpdate(req.user._id, { $pull: { library: { _id: req.query.id } } }, { new: true }).populate('library.book').populate('library.requested_by').exec((err, user) => {
    res.send(user)
  })
}

exports.requestBook = (req, res) => {
  const { user_id, book_id } = req.body
  User.findOneAndUpdate({ _id: user_id, 'library._id': book_id }, { $push: { 'library.$.requested_by': req.user._id } }, { new: true }, (err, user) => {
    if (err) return res.status(500).send({ success: false, err })
    res.send({ success: true, user })
  })
}

exports.getMyRequests = (req, res) => {
  async.waterfall([
    (callback) => {
      // Collect requests for my books by other users
      User.findById(req.user._id).populate('library.book').populate('library.requested_by').lean().exec((err, requests) => {
        if (err) return callback(err)
        let { library } = requests
        let filteredLibrary = library.filter(obj => obj.requested_by.length > 0)
        callback(null, filteredLibrary)
      })
    },
    (requests, callback) => {
      // Now find the requests I have made to other people
      User.find({ 'library.requested_by': { $in: [req.user._id] } }).populate('library.book').populate('library.requested_by').lean().exec((err, myRequests) => {
        if (err) return callback(err)
        const filtered = myRequests.reduce((acc, owner) => {
          const { library } = owner
          const filteredLibrary = library.filter(book => {
            return book.requested_by.some(({ _id }) => _.isEqual(_id, req.user._id))
          })
          Object.assign(owner, { library: filteredLibrary })
          acc.push(owner)
          return acc
        }, [])
        callback(null, requests, filtered)
      })
    }
  ], (err, requests, myRequests) => {
    if (err) return res.status(500).send({ success: false, err })
    res.send({ success: true, requests, myRequests })
  })
}

exports.respondToRequests = (req, res) => {
  const { approved, requester_id, bookObj: { book, _id } } = req.body
  if (approved) {
    User.findByIdAndUpdate(req.user._id, { $pull: { library: { _id } } }, { new: true }, (err, user) => {
      if (err) return res.send({ success: false, err })
      const newBookObj = { book, _id, requested_by: [] }
      User.findByIdAndUpdate(requester_id, { $push: { library: newBookObj } }, (err, requester) => {
        if (err) return res.send({ success: false, err })
        const toEmail = new helper.Email(requester.email)
        const mail = new helper.Mail(fromEmail, acceptSubject, toEmail, acceptContent)
        const request = sg.emptyRequest({ method: 'POST', path: '/v3/mail/send', body: mail.toJSON() })
        sg.API(request, (err, respone) => {
          if (err) return res.send({ success: false, err })
          res.send({ success: true, user })
        })
      })
    })
  }
  else {
    User.findOneAndUpdate({ _id: req.user._id, 'library._id': _id}, { $pull: { 'library.$.requested_by': requester_id } }, { new: true }, (err, user) => {
      if (err) return res.send({ success: false, err })
      const toEmail = new helper.Email(user.email)
      const mail = new helper.Mail(fromEmail, rejectSubject, toEmail, rejectContent)
      const request = sg.emptyRequest({ method: 'POST', path: '/v3/mail/send', body: mail.toJSON() })
      sg.API(request, (err, response) => {
        if (err) return res.send({ success: false, err })
        res.send({ success: true, user })
      })
    })
  }
}
