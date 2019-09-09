
import ES6Promise from "es6-promise";
import QUtils from "./lib/qwiz-utils";
import QTextUtils from "./lib/qwiz-text-utils";
import QDateTimeUtils from "./lib/qwiz-datetime-utils";
import WebViewLibs from "./lib/webview-libs";
import WebApiClientImpl_Fetch from "./lib/webapi-client-fetch";

ES6Promise.polyfill();

const mods = {
    utils: QUtils,
    web: WebViewLibs
};
mods.utils.text = QTextUtils;
mods.utils.datetime = QDateTimeUtils;
mods.web.WebApiClient = mods.web.WebApiClientImpl_Fetch = WebApiClientImpl_Fetch;
console.log("Found modules: ", mods);

//Namespaces
var global = global || window;
global.chakritw = global.chakritw || {};
global.chakritw.qwiz = global.chakritw.qwiz || {};
QUtils.merge(global.chakritw.qwiz, mods);

export default mods;
