const BookmarksService = {
    getAllBookmarks(knex) {
        return knex.select('*').from('bookmarks');
    },
    getById(knex, id) {
        return knex.from('bookmarks').select('*').where({ id }).first();
    },
};

module.exports = BookmarksService;