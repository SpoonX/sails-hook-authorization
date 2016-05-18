var sails      = require('sails');
var Barrels    = require('barrels');
var testConfig = {
      connections: {
        testDB: {
          adapter: 'sails-memory'
        }
      },
      models: {
        connection: 'testDB',
        migrate   : 'drop'
      },
      hooks: {
        grunt: false
      }
    };

before(function (done) {
  // increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(20 * 1000);

  sails.lift(testConfig, function (err, server) {
    if (err) {
      return done(err);
    }

    // load fixtures
    var barrels = new Barrels();

    // Populate the DB
    barrels.populate(function(err) {
      done(err, server);
    });
  });
});

after(function (done) {
  sails.lower(done);
});
