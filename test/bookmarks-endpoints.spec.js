require('dotenv').config();
const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const supertest = require('supertest');
const { makeBookmarksArray, makeMaliciousBookmark, makeSanatizedBookmark } = require('./bookmarks.fixtures');

describe('Bookmarks endpoints', () => {
    let db;
    
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('bookmarks').truncate());

    afterEach('cleanup', () => db('bookmarks').truncate());

    describe('GET /api/bookmarks', () => {
        context('Given there are no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('GET /api/bookmarks responds with 200 and all bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });
        });

        context('Given XSS attack bookmarks', () => {
            const maliciousBookmark = makeMaliciousBookmark();
            const sanatizedBookmark = makeSanatizedBookmark();

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([...makeBookmarksArray(), maliciousBookmark])
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [...makeBookmarksArray(), sanatizedBookmark]);
            });
        });
    });

    describe('GET /api/bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 435;
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } });
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 5;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            })
        });

        context('Given an XSS attack bookmark', () => {
            const maliciousBookmark = makeMaliciousBookmark();

            beforeEach('insert malicious bookmark', () => {
                return db 
                    .into('bookmarks')
                    .insert([ maliciousBookmark ]);
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body).to.eql(makeSanatizedBookmark());
                    });
            });
        });
    });

    describe('Post /api/bookmarks', () => {
        const testNewBookmark = (newBookmark, expectedResponse) => {
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    const { title, url, description, rating } = res.body;
                    expect(title).to.eql(expectedResponse.title);
                    expect(url).to.eql(expectedResponse.url);
                    expect(description).to.eql(expectedResponse.description);
                    expect(rating).to.eql(expectedResponse.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                    );
        };

        context('Given no missing fields', () => {

            it('creates a bookmark, responding with 201 and the new bookmark', () => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'http://www.bookmarz.com',
                    description: 'My dope bookmark',
                    rating: 4,
                };
                return testNewBookmark(newBookmark, newBookmark);
            });

            it('creates and sanatizes a bookmark, respondig with 201 and the sanatized bookmark', () => {
                return testNewBookmark(makeMaliciousBookmark(), makeSanatizedBookmark());
            });
        });

        context('Given missing fields', () => {

            const requiredFields = ['title', 'url', 'description', 'rating'];

            requiredFields.forEach(field => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'http://www.bookmarz.com',
                    description: 'My dope bookmark',
                    rating: 4,
                };

                it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                    delete newBookmark[field];
                    return supertest(app)
                        .post('/api/bookmarks')
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .send(newBookmark)
                        .expect(400, {
                            error: { message: `Missing '${field}' in request body` },
                        });
                });
            });
        });

        context('Given incorrectly formed parameters', () => {
            it('responds with 400 and an error message when a bad url is entered', () => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'mybookmark',
                    description: 'My dope bookmark',
                    rating: 4,
                };
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Invalid url supplied` },
                    });
            });

            it('responds with 400 and an error message when rating is not entered as an integer', () => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'mybookmark.com',
                    description: 'My dope bookmark',
                    rating: 'four',
                };
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Invalid rating supplied. Rating must be an integer between 1 and 5` },
                    });
            });

            it('responds with 400 and an error message when rating is less than 1', () => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'mybookmark.com',
                    description: 'My dope bookmark',
                    rating: 0,
                };
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Invalid rating supplied. Rating must be an integer between 1 and 5` },
                    });
            });
            it('responds with 400 and an error message when rating is greater than 5', () => {
                const newBookmark = {
                    title: 'Bookmarkz, yo',
                    url: 'mybookmark.com',
                    description: 'My dope bookmark',
                    rating: 10,
                };
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Invalid rating supplied. Rating must be an integer between 1 and 5` },
                    });
            });
        });
    });

    describe('DELETE /api/bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } });
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks)
                        );
            });
        });
    });

    describe.only('PATCH /api/bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } });
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated title',
                    url: 'http://www.updated.com',
                    description: 'updated description',
                    rating: 3
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                        );
            });

            it('responds with 400 when no required fields supplied', () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain at least one of 'title', 'url', 'description', or 'rating'`
                        }
                    });
            });

            it('responds with 204 when updating only a subset of fields', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated bookmark title',
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response',
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/bookmarks/${idToUpdate}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmark)
                    );
            });
        });
    });
});