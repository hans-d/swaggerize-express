'use strict';

var path = require('path'),
    utils = require('swaggerize-builder/lib/utils'),
    thing = require('core-util-is');

/**
 * Routes handlers to express router.
 * @param router
 * @param mountpath
 * @param options
 */
function expressroutes(router, options) {
    var routes = options.routes || [];

    router.get(options.api.resourcePath + utils.prefix(options.docspath || '', '/'), function (req, res) {
        res.json(options.api);
    });

    routes.forEach(function (route) {
        var args, path, before;

        path = route.path.replace(/{([^}]+)}/g, ':$1');
        args = [options.api.resourcePath + utils.prefix(path, '/')];
        before = [];

        route.validators.forEach(function (validator) {
            var parameter, validate;

            parameter = validator.parameter;
            validate = validator.validate;

            before.push(function validateInput(req, res, next) {
                var value, isPath, isForm, textBody;

                isPath = parameter.paramType === 'path' || parameter.paramType === 'query';
                isForm = parameter.paramType === 'form';
                textBody = req.body == {} ? '' : req.body;
                value = isPath ? req.param(parameter.name) : (isForm ?  req.body[parameter.name] : textBody);

                validate(value, function (error, newvalue) {
                    if (error) {
                        res.statusCode = 400;
                        next(error);
                        return;
                    }

                    if (isPath) {
                        req.params[parameter.name] = newvalue;
                    }

                    next();
                });
            });
        });

        if (thing.isArray(route.handler)) {
            if (route.handler.length > 1) {
                Array.prototype.push.apply(before, route.handler.slice(0, route.handler.length - 1));
            }
            route.handler = route.handler[route.handler.length - 1];
        }

        Array.prototype.push.apply(args, before);
        args.push(route.handler);
        router[route.method].apply(router, args);
    });
}

module.exports = expressroutes;
