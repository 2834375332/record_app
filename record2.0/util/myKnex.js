const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: '81.68.94.79',
        user: 'root',
        password: 'Mysql20171025!',
        database: 'records'
    }
})

module.exports = knex