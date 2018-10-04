    sails      = require('sails');
var Barrels    = require('barrels');
var testConfig = {

      models: {
        migrate   : 'drop',
        attributes: {
          createdAt: { type: 'number', autoCreatedAt: true, },
          updatedAt: { type: 'number', autoUpdatedAt: true, },
          id: { type: 'number', autoIncrement: true, },
        },
      },
      hooks: {
        wetland: false,
        "authorization": require('../'),
        grunt: false
      }
    };

before(function (done) {

  console.log('*** Start testing with ORM hook ***');
  // increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(20 * 1000);

  sails.lift(testConfig, function (err, server) {
    if (err) {
      return done(err);
    }

    // load fixtures
    //var barrels = new Barrels();

    // Populate the DB
    // barrels.populate(function(err) {

    done(err, server);

    //});
    //});
  });
});

after(function (done) {
  sails.lower(done);
});
