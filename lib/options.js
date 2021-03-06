/*
 * Copyright 2017 Joyent, Inc.
 */

var assert = require('assert-plus');
var strsplit = require('strsplit');

var cc = require('./create_client');

module.exports = {
    parseOptions: parseOptions
};


/**
 * Parse the common command options and then check any command-specific options
 *  represented by the caller as a function from opts Object to options Object
 *
 *
 * @param {Object} args: Required. Object to specify parsing arguments with
 *                       the following fields:
 *      - `name`: String. The command name.
 *      - `parser`: Object. A dashdash options parser.
 *      - `argTypes`: Array of String. An array of types for positional
 *                    arguments to this command. See 'argtypes' docs here:
 *                    // JSSTYLED
 *                    <https://github.com/trentm/node-dashdash/blob/1dd7379640462a21ca6d92502803de830b4acfa2/lib/dashdash.js#L753-L760>
 *      - `parseCmdOptions`: Function. A function takes a parsed options
 *                           object and a parser instance as input and
 *                           performs command-specific options options
 *                           parsing. The options object is returned and
 *                           may be mutated by the function.
 *      - `log`: Object. Bunyan Logger instance
 * @returns {Object} Parsed `opts`. It has special keys `_args` (the
 *                   remaining args from `argv`) and `_order` (gives the
 *                   order that options were specified).
 */
function parseOptions(args) {
    assert.object(args, 'args');
    assert.string(args.name, 'args.name');
    assert.object(args.parser, 'args.parser');
    assert.optionalArrayOfString(args.argTypes, 'args.argTypes');
    assert.func(args.parseCmdOptions, 'args.parseCmdOptions');
    assert.object(args.log, 'args.log');

    var parser = args.parser;
    var opts;

    try {
        opts = parser.parse(process.argv);
        cc.checkBinEnv(opts);
    } catch (e) {
        cc.usage(parser, e.message, 'path...');
    }

    cc.setupLogger(opts, args.log);

    if (opts.help)
        cc.usage(parser, false, 'path...');

    cc.versionCheckPrintAndExit(opts);
    cc.completionCheckPrintAndExit(opts, parser, args.name, args.argTypes);

    if (opts._args.length < 1)
        cc.usage(parser, 'path required', 'path...');

    opts.paths = opts._args;

    opts.headers = {};
    (opts.header || []).forEach(function (h) {
        if (h.indexOf(':') === -1) {
            cc.usage(parser, 'header must be in the form of "[header]: value"',
                     'path...');
        }
        var tokens = strsplit(h, ':', 2);
        opts.headers[tokens[0]] = tokens[1].trim();
    });

    args.parseCmdOptions(opts, parser);

    return (opts);
}