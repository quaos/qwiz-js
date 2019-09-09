
import ES6Promise from "es6-promise";
import Utils from "./lib/qwiz-utils";
import TextUtils from "./lib/qwiz-text-utils";
import DateTimeUtils from "./lib/qwiz-datetime-utils";
import WebViewLibs from "./lib/webview-libs";
import WebApiClientImpl_Fetch from "./lib/webapi-client-fetch";

ES6Promise.polyfill();

const mods = {
    utils: Utils,
    web: WebViewLibs
};
mods.utils.text = TextUtils;
mods.utils.datetime = DateTimeUtils;
mods.web.WebApiClient = mods.web.WebApiClientImpl_XHR = WebApiClientImpl_Fetch;
console.log("Found modules: ", mods);

export default mods;
