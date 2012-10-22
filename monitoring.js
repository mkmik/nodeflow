'use strict';

var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.set('public root', 'app');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.json());
    app.use(express.methodOverride());
    app.use(express.cookieParser('iecieroboNgeiyohcaechoolail3uoda'));
    app.use(app.router);
});

app.configure('development', function(){
    app.set('static max age', 0);
    app.set('main script', "jam/require.js");

    app.use(express.static(path.join(__dirname, app.get('public root'))));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

function listen(port) {
    http.createServer(app).listen(port, function(){
        console.log("Express server listening on port " + port);
    });
}

exports.listen = listen;
exports.app = app;
