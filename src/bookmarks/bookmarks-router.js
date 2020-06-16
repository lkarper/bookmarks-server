const express = require('express');
const { v4: uuid } = require('uuid');
const { isURL } = require('validator');
const logger = require('../logger');
const bookmarks = require('../store');
const app = require('../app');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        return res.json(bookmarks);
    })
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;

        if (!title) {
            logger.error('Title is required');
            return res 
                .status(400)
                .send('Invalid data');
        }

        if (!url) {
            logger.error('URL is required');
            return res 
                .status(400)
                .send('Invalid data');
        }

        if (!description) {
            logger.error('Description is required');
            return res 
                .status(400)
                .send('Invalid data');
        }

        if (!rating) {
            logger.error('Rating is required');
            return res 
                .status(400)
                .send('Invalid data');
        }

        if (!isURL(url)) {
            logger.error(`Invalid url supplied: ${url}`);
            return res 
                .status(400)
                .send('Invalid url supplied')
        }

        if (parseInt(rating) < 1 || parseInt(rating) > 5 || isNaN(parseInt(rating))) {
            logger.error(`Invalid rating supplied: ${rating}`);
            return res
                .status(400)
                .send('Invalid rating supplied.  Rating must be an interger between 0 and 5.')
        }

        if (!title.trim().length) {
            logger.error('Title supplied as empty string');
            return res 
                .status(400)
                .send('Title invalid.  Title must be at least one character long.')
        }

        if (!description.trim().length) {
            logger.error('Title supplied as empty string');
            return res 
                .status(400)
                .send('Title invalid.  Title must be at least one character long.')
        }

        const id = uuid();

        const bookmark = {
            id,
            title,
            url,
            description,
            rating: parseInt(rating)
        }

        bookmarks.push(bookmark);

        logger.info(`Bookmark created with id ${id}`);

        res
            .status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(bookmark);
        
    });

    bookmarksRouter
        .route('/bookmarks/:id')
        .get((req, res) => {
            const { id } = req.params;
            const bookmark = bookmarks.find(b => b.id == id);

            if (!bookmark) {
                logger.error(`Bookmark with id ${id} not found.`)
                return res.status(404).send('Bookmark not found');
            }

            res.json(bookmark);
        })
        .delete((req, res) => {
            const { id } = req.params;

            const bookmarkIndex = bookmarks.findIndex( b => b.id == id);

            if (bookmarkIndex === -1) {
                logger.error(`Bookmark with id ${id} not found.`);
                return res.status(404).send('Bookmark not found.');
            }

            bookmarks.splice(bookmarkIndex, 1);

            logger.info(`Bookmark with id ${id} deleted.`);

            res.status(204).end();
        });

module.exports = bookmarksRouter;