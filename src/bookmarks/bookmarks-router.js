const express = require('express');
const { isURL } = require('validator');
const logger = require('../logger');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');


const bookmarksRouter = express.Router();
const bodyParser = express.json();

const sanatizeBookmark = (bookmark) => {
    return {
        id: bookmark.id,
        title: xss(bookmark.title),
        url: bookmark.url,
        description: xss(bookmark.description),
        rating: bookmark.rating,
    };
}

bookmarksRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                const sanatizedBookmarks = bookmarks.map(sanatizeBookmark);
                res.json(sanatizedBookmarks);
            })
            .catch(next);
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const newBookmark = { title, url, description, rating };
        for (const [key, value] of Object.entries(newBookmark)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` },
                });
            }
        }

        if (!isURL(url)) {
            logger.error(`Invalid url supplied: ${url}`);
            return  res.status(400).json({
                error: { message: `Invalid url supplied` },
            });
        }

        if (parseInt(rating) < 1 || parseInt(rating) > 5 || isNaN(parseInt(rating))) {
            logger.error(`Invalid rating supplied: ${rating}`);
            return  res.status(400).json({
                error: { message: `Invalid rating supplied. Rating must be an integer between 1 and 5` },
            });
        }

        const bookmarkToPost = {
            title, 
            url,
            description,
            rating: parseInt(rating),
        }

        BookmarksService.insertBookmark(req.app.get('db'), bookmarkToPost)
            .then(bookmark => {
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(sanatizeBookmark(bookmark));
                logger.info(`Bookmark created with id ${bookmark.id}`);
            })
            .catch(next);
    });

    bookmarksRouter
        .route('/:bookmark_id')
        .all((req, res, next) => {
            BookmarksService.getById(req.app.get('db'), req.params.bookmark_id)
                .then(bookmark => {
                    if (!bookmark) {
                        return res.status(404).json({
                            error: { message: `Bookmark doesn't exist` }
                        });
                    }
                    res.bookmark = bookmark;
                    next();
                })
                .catch(next);
        })
        .get((req, res, next) => {
            res.json(sanatizeBookmark(res.bookmark));
        })
        .delete((req, res, next) => {
            const idToDelete = req.params.bookmark_id;
            BookmarksService.deleteBookmark(req.app.get('db'), idToDelete)
                .then(() => {
                    res.status(204).end();
                    logger.info(`Bookmark with id ${idToDelete} deleted.`);
                })
                .catch(next);
        });

module.exports = bookmarksRouter;