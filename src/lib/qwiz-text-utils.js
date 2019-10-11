"use strict";

const debug = require("debug");
const IntlPolyfill = global.IntlPolyfill = require("intl");
const util = require("util");
const QUtils = require("./qwiz-utils");

/**
 * WORKAROUND FOR Intl BUGS
 * Ref: https://stackoverflow.com/questions/30385277/node-cannot-replace-intl-to-use-intlpolyfill
 * https://github.com/andyearnshaw/Intl.js/issues/256
 */
global.Intl = global.Intl || IntlPolyfill;
global.Intl.NumberFormat = IntlPolyfill.NumberFormat;
global.Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
IntlPolyfill.__disableRegExpRestore();

/**
 * Intl locale supports
 */
require("intl/locale-data/jsonp/en-US");
require("intl/locale-data/jsonp/en-GB");
require("intl/locale-data/jsonp/th-TH");
require("intl/locale-data/jsonp/ja-JP");

module.exports = (function(_namespace) {
    const DEBUG_NS = "qwiz.utils";
    const QTextUtils = {};

    //Text util functions
    function isNullOrEmpty(s) {
        return (typeof s === "undefined") || (s === null) || (s === "");
    }

    function padLeft(s, ch, len) {
        if (ch.length < 1) {
            return s;
        }
        const buf = [];
        let k = s.length;
        while (k < len) {
            buf.push(ch);
            k += ch.length;
        }
        buf.push(s);

        return buf.join("");
    }
    function padRight(s, ch, len) {
        if (ch.length < 1) {
            return s;
        }
        const buf = [ s ];
        let k = s.length;
        while (k < len) {
            buf.push(ch);
            k += ch.length;
        }

        return buf.join("");
    }
    function addCommas(x) {
        return addCommas.NUM_FORMAT.format(x*1);
    }
    addCommas.NUM_FORMAT = new global.Intl.NumberFormat("en-US", {style:"decimal"});

    function renderTemplate(tmpl, vars, opts) {
        opts = opts || {};
        let s = tmpl.replace(renderTemplate.EXPR_PATTERN, function (match, key) {
            let val = QUtils.getPropByPath(vars, key, { delimiter: opts.pathDelimiter });

            return ((val) || (val === 0) || (val === false)) ? val : "";
        });

        return s;
    }
    renderTemplate.EXPR_PATTERN = /\$\{(\S+?)\}/g;

    class TextFieldsParser {
        constructor(pattern, opts) {
            this.pattern = pattern;
            this.tokens = [];
            (opts) && QUtils.merge(this, opts, { deep: true });
            this.rebuild();
        }
        addToken(prefix, key, suffix) {
            let token = {
                prefix: prefix,
                key: key,
                suffix: suffix
            };
            this.tokens.push(token);

            return token;
        }
        rebuild() {
            const regex = new RegExp(renderTemplate.EXPR_PATTERN.source, renderTemplate.EXPR_PATTERN.flags);
            this.tokens.length = 0;
            let matches;
            let k1 = 0;
            let i = 0;
            let lastToken;
            while ((matches = regex.exec(this.pattern)) !== null) {
                let dk = matches[0].length;
                let k = regex.lastIndex - dk;
                let prefix = this.pattern.substring(k1, k);
                let key = matches[1];
                (lastToken) && (lastToken.suffix = prefix);
                lastToken = this.addToken(prefix, key);
                k1 = regex.lastIndex;
                i++;
            }
            if (k1 < this.pattern.length) {
                //let lastToken = (this.tokens.length >= 1) ? this.tokens[this.tokens.length - 1] : null;
                if (lastToken) {
                    lastToken.suffix = this.pattern.substring(k1, this.pattern.length);
                }
            }
        }
        parseText(text) {
            const flds = {};
            if ((!text) && (text !== 0)) {
                return flds;
            }
            const n = this.tokens.length;
            let k1 = 0;
            for (let i = 0;i < n;i++) {
                let token = this.tokens[i];
                let preLen = (!isNullOrEmpty(token.prefix)) ? token.prefix.length : 0;
                let sufLen = (!isNullOrEmpty(token.suffix)) ? token.suffix.length : 0;
                if ((!isNullOrEmpty(token.prefix))
                    && (text.substring(k1, k1 + preLen) !== token.prefix))
                {
                    break;
                }
                let k2 = (!isNullOrEmpty(token.suffix))
                    ? k1 + preLen + text.substring(k1 + preLen).indexOf(token.suffix)
                    : text.length;
                if (k2 < 0) {
                    break;
                }
                let fldVal = text.substring(k1 + preLen, k2);
                QUtils.setPropByPath(flds, token.key, fldVal);
                k1 = k2; //+ sufLen;
            }
            debug(DEBUG_NS)(`Parsed fields from text: ${text} : ${this.pattern} => ${util.inspect(flds)}`);

            return flds;
        }
    }
    function parseTextFields(text, pattern, opts) {
        return new TextFieldsParser(pattern, opts).parseText(text);
    }
    //parseTextFields.TextFieldsParser = TextFieldsParser;

    function safeSerializeJSON(obj, opts) {
        opts = opts || {};
        let obj2 = QUtils.createEmptyCopy(obj);
        QUtils.walkObject(obj, {
            maxDepth: opts.maxDepth,
            includesList: opts.includesList,
            excludesList: opts.excludesList,
            protoLimit: opts.protoLimit,
            target: obj2,
            onDefault: function (val, ctx) {
                if (ctx.isCircularRef) {
                    return null;
                }
                if (!ctx.isLeaf) {
                    return;
                }

                return val;
            }
        });
        
        return JSON.stringify(obj2);
    }
        
    function getURL(baseURL, path, query) {
        let parts = ((baseURL) || (baseURL === 0))
            ? [ baseURL ]
            : [];
        if (Array.isArray(path)) {
            parts = parts.concat(path)
        } else {
            parts.push(path);
        }
        
        let parts2 = [];
        let i = 0;
        //let nParts = parts.length;
        parts.forEach((part) => {
            if ((!part) && (part !== 0)) {
                return false;
            }
            let part2 = `${part}`;
            (i > 0) && (part2 = part2.replace(/(^\/)/, ""));
            ((i > 0) || (part2 !== "/")) && (part2 = part2.replace(/(\/$)/, ""));
            if (part2.length <= 0) {
                return false;
            }
            parts2.push(part2);
            i++;
        });

        let parts3 = [ parts2.join("/") ];
        parts3.push(this.getQueryString(query));

        return parts3.join("");
    }
    function getQuery(queryString) {
        const query = {};
        const pairs = ((queryString[0] === '?') ? queryString.substr(1) : queryString).split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }

        return query;
    }
    function getQueryString(query) {
        const qParts = [];
        let nQPairs = 0;
        (query) && QUtils.forEachField(query, (k, v) => {
            qParts.push((nQPairs <= 0) ? "?" : "&");
            qParts.push(encodeURIComponent(k));
            qParts.push("=");
            qParts.push(encodeURIComponent(v));
            nQPairs++;
        });

        return qParts.join("");
    }
    
    function getUrlDiff(fromURL, toURL) {
        const fromParts = ((fromURL) || (fromURL === 0)) ? `${fromURL}`.split("/") : [];
        const toParts = ((toURL) || (toURL === 0)) ? `${toURL}`.split("/") : [];
        const minLen = (fromParts.length < toParts.length) ? fromParts.length : toParts.length;
        //TODO:
    }

    QUtils.merge(QTextUtils, {
        isNullOrEmpty: isNullOrEmpty,
        padLeft: padLeft,
        padRight: padRight,
        addCommas: addCommas,
        renderTemplate: renderTemplate,
        TextFieldsParser: TextFieldsParser,
        parseTextFields: parseTextFields,
        safeSerializeJSON: safeSerializeJSON,
        getURL: getURL,
        getQuery: getQuery,
        getQueryString: getQueryString,
        getUrlDiff: getUrlDiff
    });

    (_namespace) && QUtils.merge(_namespace, QTextUtils);

    return QTextUtils;
})( /*global.chakritw.qwiz.utils.text*/ );
