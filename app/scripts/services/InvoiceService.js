'use strict';

angular.module('quiverInvoiceApp')
  .service('invoiceService', function invoiceService($q, $firebase, environmentService, userService, notificationService, $state, Restangular) {
    var invoicesRef,
      getNextInvoiceNumber = function () {
        var increment = function (handler) {
          if (!invoicesRef.next) {
            invoicesRef.next = 100;
          }

          handler.resolve(invoicesRef.next);
          invoicesRef.next += 1;
          invoicesRef.$save();
        };

        return environmentService.envDependentFunction(function (envHandler) {
          if (!invoicesRef.next) {
            invoicesRef.$on('loaded', function () {
              increment(envHandler);
            });
          } else {
            increment(envHandler);
          }

        });
      };

    environmentService.get().then(function (env) {
      userService.getCurrentUser().then(function (user) {
        invoicesRef = $firebase(new Firebase(env.firebase + '/users/' + user.id + '/invoices'));
        environmentService.deferred.resolve(env);
      });

    });

    var service = {
      newInvoice: function () {
        var deferred = $q.defer();

        getNextInvoiceNumber().then(function (next) {
          deferred.resolve({
            date: moment().format('YYYY-MM-DD'),
            number: next,
            project: null,
            address: null,
            items: []
          });
        });

        return deferred.promise;
      },

      get: function (id) {
        return environmentService.envDependentFunction(function (handler, env) {
          userService.getCurrentUser().then(function (user) {
            var path = env.firebase + '/users/' + user.id + '/invoices';
            if (id) {
              path += '/' + id;

            }
            handler.resolve($firebase(new Firebase(path)));
          });
        });
      },

      create: function (invoice, copy) {
        invoice.state = 'created';

        var deferred = $q.defer(),
          promise = notificationService.promiseNotify('Invoice', 'Invoice created', 'Invoice creation failed', function () {
            service.get().then(function (invoicesRef) {
              if (copy) {
                getNextInvoiceNumber().then(function (next) {
                  invoice.number = next;
                  invoicesRef.$add(invoice).then(deferred.resolve);
                });
              } else {
                invoicesRef.$add(invoice).then(deferred.resolve);
              }


            });

            return deferred.promise;
          });

        promise.then(function (res) {
          $state.go('dashboard');
        });

        return deferred.promise;

      },

      remove: function (id) {
        var deferred = $q.defer(),
          promise = notificationService.promiseNotify('Invoice', 'Invoice deleted', 'Deletion failed', function () {
            service.get(id).then(function (invoice) {
              invoice.$remove().then(deferred.resolve);
            });
            return deferred.promise;
          });

        promise.then(function () {
          $state.go('dashboard');
        });

        return deferred.promise;

      },

      send: function (loggedInUser, invoiceId) {
        return Restangular.one('user', loggedInUser.id).one('invoice', invoiceId).all('send').post(loggedInUser);
      }
    };

    return service;

  });
