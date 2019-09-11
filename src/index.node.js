"use strict";

const ES6Promise = require("es6-promise");
const QUtils = require("./lib/qwiz-utils");
const QTextUtils = require("./lib/qwiz-text-utils");
const QDateTimeUtils = require("./lib/qwiz-datetime-utils");
const WebViewLibs = require("./lib/webview-libs");
const WebApiClientImpl_Fetch = require("./lib/webapi-client-fetch");

ES6Promise.polyfill();

const mods = {
    utils: QUtils,
    web: WebViewLibs
};
mods.utils.text = QTextUtils;
mods.utils.datetime = QDateTimeUtils;
mods.web.WebApiClient = mods.web.WebApiClientImpl_XHR = WebApiClientImpl_Fetch;
console.log("Found modules: ", mods);

module.exports = mods;
