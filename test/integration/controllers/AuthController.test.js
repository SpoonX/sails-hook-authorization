var request = require('supertest');
var assert  = require('chai').assert;

describe('AuthController', function () {

  var loginCredentials = {
    username: 'Bob',
    password: 'anicerandompassword'
  };

  describe('#login()', function () {
    it('should login with given credentials', function (done) {
      // login
      request(sails.hooks.http.app)
        .post('/login')
        .send(loginCredentials)
        .expect(200, function (error, response) {

          var body = response.body;

          // check tokens
          assert.isDefined(body.access_token);
          assert.isDefined(body.refresh_token);

          // verify token
          Auth.verifyToken(body.access_token, function (error, accessToken) {
            assert.ifError(error);

            Auth.verifyToken(body.refresh_token, function (error, refreshToken) {
              assert.ifError(error);

              // check if refreshToken unique matches the tokens `iat`
              assert.equal(refreshToken.unique, accessToken.iat + '.' + accessToken.user);

              done();
            });
          });
        });
    });
  });

  describe('#signup()', function () {
    it('should register the user', function (done) {
      request(sails.hooks.http.app)
        .post('/signup')
        .send({
          username       : 'kees',
          password       : 'aotherrandompassword',
          passwordConfirm: 'aotherrandompassword',
          email          : 'kees@example.org'
        })
        .expect(200, function (error, signupResponse) {
          assert.isDefined(signupResponse.body.access_token);
          assert.isDefined(signupResponse.body.refresh_token);

          done();
        });
    });
  });

  describe('#refreshToken()', function () {
    it('should generate tokens with new expire date', function (done) {

      // fetch tokens
      request(sails.hooks.http.app)
        .post('/login')
        .send(loginCredentials)
        .expect(200, function (error, loginResponse) {

          var query = {
            access_token : loginResponse.body.access_token,
            refresh_token: loginResponse.body.refresh_token
          };

          // increase the timeout of the test by 1 second
          this.timeout(1000);

          // make request to extend TTL of the token, wait 1 second to generate a new `iat` (issued at time)
          setTimeout(function () {
            request(sails.hooks.http.app)
              .post('/auth/refresh-token')
              .send(query)
              .expect(200, function (error, refreshResponse) {

                function decode (token) {
                  return Auth.decodeToken(token);
                }

                function deleteProps (obj) {
                  delete obj.iat; // issue at time
                  delete obj.exp; // expire date

                  return obj;
                }

                var body                = refreshResponse.body;
                var newToken            = decode(body.access_token);
                var newRefreshToken     = decode(body.refresh_token);
                var orginalToken        = decode(query.access_token);
                var orginalRefreshToken = decode(query.refresh_token);

                // check if set
                assert.isDefined(body.access_token);
                assert.isDefined(body.refresh_token);

                // check if the new expire date is higher in the new token than in the old one
                assert.isAbove(newToken.exp, orginalToken.exp);
                assert.isAbove(newRefreshToken.exp, orginalRefreshToken.exp);

                // check if the generated refreshToken unique matches the new token iat
                assert.equal(newRefreshToken.unique, newToken.iat + '.' + newToken.user);

                // check if the `iat` and the `exp` are changed
                assert.notEqual(newToken.iat, orginalToken.iat);
                assert.notEqual(newRefreshToken.iat, orginalRefreshToken.iat);
                assert.notEqual(newToken.exp, orginalToken.exp);
                assert.notEqual(newRefreshToken.exp, orginalRefreshToken.exp);

                // check if the data within the token is the same as in the old one
                assert.deepEqual(deleteProps(newToken), deleteProps(orginalToken));

                done();
              });
          }, 1000);
        });
    });
  });

});
