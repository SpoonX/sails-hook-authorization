    sails      = require('sails');
var Barrels    = require('barrels');
var path       = require('path');



var testConfig = {

	auth: {wetland: true},
	wetland: {entityPath: path.resolve(process.cwd(), 'api', 'entity')},

    models: {
    	migrate   : 'alter',
        attributes: {
        createdAt: { type: 'number', autoCreatedAt: true, },
        updatedAt: { type: 'number', autoUpdatedAt: true, },
        id: { type: 'number', autoIncrement: true, },
        },
      },
      hooks: {
        "authorization": require('../'),
        grunt: false
      }
    };

before(function (done) {

	console.log('*** Start testing with WETLAND hook ***')
  // increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(20 * 1000);

  sails.lift(testConfig, function (err, server) {
    if (err) {
      return done(err);
    }

  const migrator = sails.wetland.getMigrator();
  const cleaner = sails.wetland.getCleaner();

  cleaner.clean() // Will clean the database, NO MAGICAL GOING BACK
      .then(() => migrator.devMigrations(false)) // Will actually do the migrations : needed here because the clean method wipes the database entirely
      .then(() => done(err, server)) ;// Will seed accordingly to the configuration you gave wetland



  });
});

after(function (done) {
  sails.lower(done);
});
