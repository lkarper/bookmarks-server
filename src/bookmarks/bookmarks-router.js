const path = require('path');
const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');
const { validateBookmark } = require('./bookmarks-validator');


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

        const error = validateBookmark(newBookmark);
        
        if (error) {
            return res.status(400).json(error);
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
                    .location(path.posix.join(req.originalUrl, `${bookmark.id}`))
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
        })
        .patch(bodyParser, (req, res, next) => {
            const { title, url, description, rating } = req.body;
            const bookmarkToUpdate = {title, url, description, rating };

            const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
            if (numberOfValues === 0) {
                logger.error(`Invalid body object supplied on PATCH: ${req.body}`);
                return res.status(400).json({
                    error: {
                        message: `Request body must contain at least one of 'title', 'url', 'description', or 'rating'`
                    }
                });
            }

            const error = validateBookmark(bookmarkToUpdate);
        
            if (error) {
                return res.status(400).json(error);
            }

            BookmarksService.updateBookmark(
                req.app.get('db'),
                req.params.bookmark_id,
                bookmarkToUpdate
            )
                .then(numRowsAffected => {
                    res.status(204).end();
                    logger.info(`Bookmark with id ${req.params.bookmark_id} updated.`);
                })
                .catch(next);
        });

module.exports = bookmarksRouter;