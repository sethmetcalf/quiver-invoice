'use strict';

angular.module('quiverInvoiceApp')
  .service('userService', function userService($q, $firebase, $firebaseSimpleLogin, environmentService) {
    var envDeferred = $q.defer(),
      env = envDeferred.promise,
      Handler = function (deferred) {
        return {
          resolve: function (res) {
            deferred.resolve(res);
          },
          reject: function (err) {
            deferred.reject(err);
          }
        }
      },
      envDependentFunction = function (action) {
        var deferred = $q.defer(),
          handler = new Handler(deferred);
        env.then(function (env) {
          action(handler, env);
        });
        return deferred.promise;
      },
      firebase,
      firebaseSimpleLogin,
      usersRef;

    environmentService.get().then(function (env) {
      firebase = new Firebase(env.firebase);
      firebaseSimpleLogin = $firebaseSimpleLogin(firebase);
      usersRef = $firebase(new Firebase(env.firebase + '/users'));
      envDeferred.resolve(env);
    });

    return {
      get: function () {
        return envDependentFunction(function (handler, env) {
          firebaseSimpleLogin.$getCurrentUser().then(function (user) {
            handler.resolve(user ? $firebase(new Firebase(env.firebase + '/users/' + user.id)) : null);
          }, handler.reject);
        });
      },

      getRef: function () {
        return envDependentFunction(function (handler) {
          firebaseSimpleLogin.$getCurrentUser().then(function (user) {
            handler.resolve(user ? usersRef.$child(user.id) : null);
          }, handler.reject);
        });
      },

      getCurrentUser: function () {
        return envDependentFunction(function (handler, env) {
          firebaseSimpleLogin.$getCurrentUser().then(function (user) {
            handler.resolve(user);
          }, handler.reject);
        });
      },

      create: function (user) {
        return envDependentFunction(function (handler, env) {
          firebaseSimpleLogin.$createUser(user.email, user.password).then(function (user) {
            var userRef = $firebase(new Firebase(env.firebase + '/users/' + user.id));
            userRef.email = user.email;
            userRef.$save().then(handler.resolve);
          }, handler.reject);
        });
      },

      remove: function () {

      },

      reset: function (email) {
        var deferred = $q.defer(),
          auth;
        env.then(function (env) {
          // firebaseSimpleLogin.$resetPassword has not yet been implemented in angularfire. We're going it alone.
          auth = new FirebaseSimpleLogin(firebase, function (err, user) {
            console.log('err, user', err, user);
          });
          auth.sendPasswordResetEmail(email, function (err, success) {
            if (err) {
              deferred.reject(err);
            } else {
              deferred.resolve(success);
            }
          });
        });
        return deferred.promise;
      },

      logIn: function (user) {
        return envDependentFunction(function (handler) {
          user.rememberMe = true; // Override default session length (browser session) to be 30 days.
          firebaseSimpleLogin.$login('password', user).then(handler.resolve, handler.reject);
        });
      },

      logOut: function () {
        return envDependentFunction(function (handler) {
          var res = firebaseSimpleLogin.$logout();
          return handler.resolve(res);
        });
      }

    }
  });
