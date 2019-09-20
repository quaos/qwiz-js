# qwiz-js

Q'Wiz Utilities, for JS

by Chakrit W. <quaos.qrz@gmail.com>

This is a minimal collection of tools for my most frequently-needed repetitive tasks

_I try to make this depend on the least number of most lightweight tools & frameworks, such as [browserify][3] and [intl][2] (instead of [webpack](https://www.npmjs.com/package/webpack) and [moment.js](https://www.npmjs.com/package/moment), you got the idea)_

## Modules

### utils

* ***forEachField({Object} obj, {Function<String, \*>} callback***
  
  Shallow Object Iteration

* ***walkObject({Object} obj, {Object} opts)***
  
  Deep Object Iteration

  See: ***walkObject.Options***

* ***walkObject.Options***

  {Number|Boolean} maxDepth

  {Object} expressionsMap

  {Function<\*, walkObject.Context>|\*} defaultExpression

* ***merge({Object} dest, {Object} src, {Object} opts)***

  Shallow&Deep Object Merge

* ***clone({Object} src, {Object} opts)***

  Shallow&Deep Object Clone

* ***extendClass({Function} parentCls, {Object} childProto, {Object} childStatic)***

  Prototype/class Extension

* ***attachExtension({Function} targetCls, {Function} extClass)***

  Class Extension Attachment


### utils.text
 ***TODO:***

### utils.datetime
 ***TODO:***




### web.WebView
 ***TODO:***


### web.IndexView
 ***TODO:***


### web.WebApiClient
Web API client Interface & registry point for implementations

### web.WebApiClientImpl_Fetch
  (also aliased as web.WebApiClient)
 ***TODO:***



## Grunt Tasks

* ***build:*** Build library for Browser use (output to `dist/qwiz.bundle.js` and minified version `dist/qwiz.bundle.min.js`, and copy `dist/qwiz.bundle.js` to `web-demo/assets/js/`)

* ***demo-web:*** Run demo web server on _localhost:3000_ to test web libs functionality


## NPM Scripts

* ***browserify:*** Build library for Browser use (output to `dist/qwiz.bundle.js` and minified version `dist/qwiz.bundle.min.js`)

  `npm run browserify`

* ***lint:*** Run eslint

  `npm run lint`

* ***lint-fix:*** Run eslint with auto-fix mode

  `npm run lint-fix`

* ***test:*** Run mocha unit tests

  `npm test`

* ***test-debug:*** Run mocha unit tests in debug mode (can be inspected by tools like Chrome node.js inspector)

  `npm run test-debug` 

## Usage in NodeJS & other runtimes

```javascript
//For ES6 Modules:
//import qwiz from "qwiz/src/index";

//For pre-ES6-Modules Node.JS:
const qwiz = require("qwiz");

qwiz.utils.merge(dest, src, { deep: true });
/* .... */

```

## Usage in Browsers

```html
<!--<script src="assets/js/qwiz.bundle.js"></script>--><!-- For Development -->
<script src="assets/js/qwiz.bundle.min.js"></script><!-- For Production -->
<script type="text/javascript">
(function(qwiz) {

const api = new qwiz.web.WebApiClient({
    window: window,
    document: document,
    /* ... */
});
api.on(qwiz.web.WebApiClient.EVT_ERROR, (err) => {
    /* ... */
});

const view = new qwiz.web.WebView({
    window: window,
    document: document,
    /* ... */
}).initOnReady();
view.on(qwiz.web.WebView.EVT_INIT_COMPLETE, (stepResults) => {
    /* ... */
});
view.on(qwiz.web.WebView.EVT_ERROR, (err) => {
    /* ... */
});

/* .... */

})(com.chakritw.qwiz);
</script>
```

## Runtime Dependencies

* [esm][1]
* [intl][2]
* [cross-fetch][6]
* [es6-promise][7]
* [debug][10]

[1]: https://www.npmjs.com/package/esm "esm"
[2]: https://www.npmjs.com/package/intl "intl"
[3]: https://www.npmjs.com/package/browserify "browserify"
[4]: https://www.npmjs.com/package/esmify "esmify"
[5]: https://www.npmjs.com/package/uglifyify "uglifyify"
[6]: https://www.npmjs.com/package/cross-fetch "cross-fetch" 
[7]: https://www.npmjs.com/package/es6-promise "es6-promise"
[8]: https://www.npmjs.com/package/eslint "eslint"
[9]: https://www.npmjs.com/package/mocha "mocha"
[10]: https://www.npmjs.com/package/debug "10"

