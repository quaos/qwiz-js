
import fetch from "cross-fetch";
import events from "events";
import util from "util";
import QUtils from "./qwiz-utils";
import QTextUtils from "./qwiz-text-utils";

//DEPRECATED:
/*
var global = global || window;
global.ChakritQ = global.ChakritQ || {};
//const QUtils = global.ChakritQ.utils;
*/

export default (function(_namespace) {
    class WebApiClientImpl_Fetch {
        constructor(props) {
            const _static = WebApiClientImpl_Fetch;
            const api = this;
            this.baseURL = null;
            this.loginPath = "login";
            this.logoutPath = "logout";
            (props) && QUtils.merge(this, props, { deep: true });
            events.EventEmitter.call(this);

            const _private = {
                userAuth: null,
                userSession: null
            };
            this._loginInternal = function (method, reqData, opts) {
                method = method || _static.POST;
                opts = opts || {};
                if (method === _static.GET) {
                    return Promise.reject(new Error("GET Method Not Supported for login"));
                }
                if (_private.userSession) {
                    return Promise.reject(new Error("Already logged in"));
                }

                return this._callApiInternal(method, this.loginPath, reqData, opts)
                    .then((respData) => {
                        console.log("Logged in with response: ", respData);
                        _private.userSession = respData;
                        (typeof opts.loginCallback == "function")
                            && opts.loginCallback.call(api, respData);
                        api.emit(_static.EVT_LOGGED_IN, _private.userSession);
                        
                        return Promise.resolve(respData);
                    });
            };
            this._logoutInternal = function (method, opts) {
                method = method || _static.POST;
                opts = opts || {};
                if (!_private.userSession) {
                    console.warn("Not Logged In");
                    return Promise.resolve(false);
                }

                return this._callApiInternal(method, this.logoutPath, null, opts)
                    .then((respData) => {
                        console.log("Logged out with response: ", respData);
                        let lastSession = _private.userSession;
                        (typeof opts.logoutCallback == "function")
                            && opts.logoutCallback.call(api, respData, lastSession);
                        _private.userSession = null;
                        api.emit(_static.EVT_LOGGED_OUT, lastSession);

                        return Promise.resolve(respData);
                    });
            },
            this._callApiInternal = function (method, path, reqData, opts) {
                method = method || _static.GET;
                opts = opts || {};
                const reqOpts = {
                    method: method,
                    headers: {},
                    query: null,
                    body: null,
                    credentials: _static.DEFAULT_CRED_MODE
                };
                if (method !== _static.GET) {
                    reqOpts.query = opts.query;
                    if (opts.useFormData) {
                        let formData = new FormData(opts.form);
                        this._checkUpdateFormData(formData, reqData);
                        reqOpts.body = formData;
                        reqOpts.headers[_static.HEADER_CONTENT_TYPE] = _static.CTYPE_MULTIPART_FORM_DATA;
                    } else {
                        reqOpts.body = QTextUtils.safeSerializeJSON(reqData);
                        reqOpts.headers[_static.HEADER_CONTENT_TYPE] = _static.CTYPE_JSON;
                    }
                } else {
                    reqOpts.query = reqData;
                }
                const url = QTextUtils.getURL(this.baseURL, path, reqOpts.query);
                (opts.headers) && QUtils.merge(reqOpts.headers, opts.headers);
                api._checkUpdateAuth(reqOpts.headers);
                let resp = null;

                return fetch(url, reqOpts)
                    .then((_resp) => {
                        resp = _resp;
                        try {
                            api._checkResponseStatus(resp, {
                                method: method,
                                noContentExpected: opts.noContentExpected
                            });
                        } catch (err) {
                            return Promise.reject(err);
                        }
                        const respCType = resp.headers.get(_static.HEADER_CONTENT_TYPE);
                        const cTypeParts = ((respCType) || (respCType === 0))
                            ? respCType.split(";", 2)
                            : [];
                        let data;
                        if (cTypeParts.length >= 1) {
                            if (cTypeParts[0] === _static.CTYPE_JSON) {
                                data = resp.json();
                            } else if (_static.CTYPE_REGEX_TEXTS.test(cTypeParts[0])) {
                                data = resp.text();
                            } else {
                                data = resp.blob();
                            }
                        } else {
                            data = resp.blob();
                        }
                        (opts.onResponse) && opts.onResponse(null, resp, data);
                        
                        return data;
                    })
                    .catch((err) => {
                        (opts.onResponse) && opts.onResponse(err, resp);
                        api.emit(_static.EVT_ERROR, err);
                        return Promise.reject(err);
                    });
            };

            this._checkUpdateFormData = function (formData, src) {
                QUtils.forEachField(src, (k, v) => {
                    if ((!k) && (k !== 0)) {
                        return;
                    }
                    if ((typeof k === "undefined") || (k === null)) {
                        return;
                    }
                    formData.append(k, v);
                });

                return formData;
            };
            this._checkUpdateAuth = function (headers, opts) {
                opts = opts || {};
                const authOpts = opts.auth || _private.userAuth;
                if (!authOpts) {
                    return headers;
                }
                let authType = authOpts.type || _static.AUTH_BASIC;
                let authParts = [ authType ];
                let credStr;
                switch (authType) {
                    case _static.AUTH_BASIC:
                        credStr = ((_private.userSession) && (_private.userSession.token))
                            ? btoa(`${authOpts.userName}:${_private.userSession.token}`)
                            : btoa(`${authOpts.userName}:${authOpts.password}`);
                        authParts.push(credStr);
                        break;
                    case _static.AUTH_BEARER:
                        authParts.push(this.userSession.token);
                        break;
                    default:
                        break;
                }
                headers[_static.HEADER_AUTHORIZATION] = authParts.join(" ");

                return headers;
            };

            this._checkResponseStatus = function (resp, opts) {
                const _static = WebApiClientImpl_Fetch;
                const api = this;
                opts = opts || {};

                if (resp.status !== _static.HTTP_OK) {
                    if ((resp.status === _static.HTTP_CREATED) && (opts.method === _static.POST)) {
                        //Ignore
                    } else if ((resp.status === _static.HTTP_NO_CONTENT) && (opts.noContentExpected)) {
                        //Ignore
                    } else {
                        throw new Error(`Got response status: ${resp.status} ${resp.statusText}`);
                    }
                }

                return true;
            };
        }
        
        login(method, reqData, opts) {
            return this._loginInternal(method, reqData, opts);
        }
        logout(method, opts) {
            return this._logoutInternal(method, opts);
        }

        callAPI(method, path, reqData, opts) {
            const _static = WebApiClientImpl_Fetch;
            const api = this;
            opts = opts || {};

            opts.auth = undefined;

            return this._callApiInternal(method, path, reqData, opts);
        }
    }
    QUtils.attachExtension(WebApiClientImpl_Fetch, events.EventEmitter);
    QUtils.merge(WebApiClientImpl_Fetch, {
        //statics
        GET: "GET",
        POST: "POST",
        PUT: "PUT",
        PATCH: "PATCH",
        DELETE: "DELETE",

        HEADER_CONTENT_TYPE: "Content-Type",
        HEADER_AUTHORIZATION: "Authorization",
    
        CTYPE_JSON: "application/json",
        CTYPE_MULTIPART_FORM_DATA: "multipart/form-data",
        CTYPE_FORM_URL: "application/x-www-form-urlencoded",
        CTYPE_REGEX_TEXTS: /^(text\/(.+))/,

        DEFAULT_CHARSET: "UTF-8",
        DEFAULT_CRED_MODE: "include", //"same-origin"

        AUTH_BASIC: "Basic",
        AUTH_BEARER: "Bearer",

        HTTP_OK: 200,
        HTTP_CREATED: 201,
        HTTP_NO_CONTENT: 204,
        HTTP_UNAUTHORIZED: 401,
        HTTP_FORBIDDEN: 403,
        HTTP_NOT_FOUND: 404,

        EVT_LOGGED_IN: "logged-in",
        EVT_LOGGED_OUT: "logged-out",
        EVT_ERROR: "error"
    });
    (_namespace) && (_namespace.WebApiClientImpl_Fetch = WebApiClientImpl_Fetch);

    return WebApiClientImpl_Fetch;
})( /*global.chakritw*/ );
