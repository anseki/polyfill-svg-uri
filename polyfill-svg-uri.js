/*
 * polyfillSvgUri
 * https://github.com/anseki/polyfill-svg-uri
 *
 * Copyright (c) 2016 anseki
 * Licensed under the MIT license.
 */

;(function(global) { // eslint-disable-line no-extra-semi
  'use strict';

  function polyfillSvgUri() {

    var IS_IE = !!document.uniqueID,

      list2array = Function.prototype.call.bind(Array.prototype.slice),
      reDataUri = new RegExp('^data:(.+?),(.*)$'), // Data URI scheme
      // [^\1] isn't supported by JS
      reUrlFunc = new RegExp('\\burl\\((?:(\'|")(.*?)\\1|(.*?))\\)', 'g');

    function convertDataUri(uri) {
      return (uri + '').replace(reDataUri, function(s, params, content) {
        params = params.split(';');
        if (params.indexOf('image/svg+xml') > -1 && params.indexOf('base64') === -1 &&
            /^<svg\b/i.test(content)) { // Check more surely than `utf8` in params.
          params = params.filter(
            function(param) { return param !== 'utf8' && param !== 'charset=utf-8'; });
          if (IS_IE) {
            // Fragments must have already escaped. `%23` was replaced by `%2523`.
            // content.replace(/%23/g, '#')
            // But IE doesn't parse those. Therefore, Unescape all escaped characters.
            content = encodeURIComponent(decodeURIComponent(content));
            params.push('charset=utf-8');
          } else {
            // Firefox handles `#` as fragment.
            content = content.replace(/#/g, '%23'); // escape #
            params.push('utf8');
          }
        }
        return 'data:' + params.join(';') + ',' + content;
      });
    }

    function convertCssValue(value) {
      return (value + '').replace(reUrlFunc, function(s, qt, val1, val2) {
        qt = qt || '';
        return 'url(' + qt + convertDataUri(val1 || val2) + qt + ')';
      });
    }

    function parseStyle(style) {
      var propName, value, newValue, i;
      for (i = style.length - 1; i >= 0; i--) {
        propName = style[i];
        if ((value = style.getPropertyValue(propName)) &&
            // Blink has a bug that break the style when some properties are updated.
            // https://bugs.chromium.org/p/chromium/issues/detail?id=652362
            (newValue = convertCssValue(value)) !== value) {
          try {
            style.setProperty(propName, newValue, style.getPropertyPriority(propName));
          } catch (e) {
            global.console.warn('Couldn\'t set property.', e, propName);
          }
        }
      }
    }

    function parseRule(cssRule) {
      /*
        Normally, doesn't have multiple properties of following.
        But unknown type should be covered. i.e. Don't use `else if`.
      */
      // CSSStyleDeclaration
      if (cssRule.style) { parseStyle(cssRule.style); }
      // CSSStyleSheet, CSSMediaRule, CSSKeyframesRule, etc.
      if (cssRule.cssRules) { list2array(cssRule.cssRules).forEach(parseRule); }
      // CSSImportRule
      if (cssRule.styleSheet) { parseRule(cssRule.styleSheet); }
    }

    // ================================ Style Sheets
    list2array(document.styleSheets).forEach(parseRule);

    // ================================ Attributes
    ['src', 'data'].forEach(function(attrName) {
      list2array(document.querySelectorAll('[' + attrName + '^="data:"]')).forEach(function(element) {
        element[attrName] = convertDataUri(element[attrName]);
      });
    });

    // ================================ Inline Style
    list2array(document.querySelectorAll('[style]')).forEach(function(element) {
      parseStyle(element.style);
    });

    // ================================ CSSStyleDeclaration
    (function(styleDeclarationProto) {
      var constructorName, targetProto, properties, checkProto;

      if (!styleDeclarationProto) { return; }

      // ------------------------ setProperty
      (function(nativeMethod) {
        if (!nativeMethod) { return; }
        styleDeclarationProto.setProperty = function(property, value, priority) {
          // IE needs priority as string
          nativeMethod.call(this, property, convertCssValue(value), priority || '');
        };
      })(styleDeclarationProto.setProperty);

      // ------------------------ properties
      if ((constructorName = (Object.prototype.toString.call(document.body.style) || '')
          .replace(/^\[object (.+?)\]$/, '$1'))) {

        if (constructorName === 'CSS2Properties' ||
            constructorName === 'CSS3Properties' ||
            constructorName === 'CSSProperties') {
          targetProto = global[constructorName].prototype;
          properties = Object.keys(targetProto);
        } else if (constructorName === 'MSStyleCSSProperties') {
          targetProto = styleDeclarationProto;
          properties = Object.keys(targetProto);
        } else {
          targetProto = styleDeclarationProto;
          properties = Object.keys(targetProto);
          if (properties.indexOf('color') === -1) {
            properties = Object.keys(document.body.style);
            checkProto = document.body.style;
            if (properties.indexOf('color') === -1) {
              properties = Object.keys(global.getComputedStyle(document.body, ''));
            }
          }
        }

        properties.forEach(function(property) {
          var descriptor =
            Object.getOwnPropertyDescriptor(checkProto || targetProto, property);
          if (descriptor && descriptor.enumerable && (checkProto || descriptor.set)) {

            if (checkProto) {
              Object.defineProperty(targetProto, property, {
                /* eslint-disable key-spacing */
                configurable:   true,
                enumerable:     true,
                get:            function() {
                  return targetProto.getPropertyValue.call(this, property);
                },
                set:            function(value) {
                  // setProperty was already replaced.
                  targetProto.setProperty.call(this, property, value, '');
                }
                /* eslint-enable key-spacing */
              });
            } else {
              (function(nativeMethod) {
                Object.defineProperty(targetProto, property, {
                  /* eslint-disable key-spacing */
                  configurable:   descriptor.configurable,
                  enumerable:     descriptor.enumerable,
                  get:            descriptor.get,
                  set:            function(value) {
                    nativeMethod.call(this, convertCssValue(value));
                  }
                  /* eslint-enable key-spacing */
                });
              })(descriptor.set);
            }
          }
        });
      }

      // ------------------------ cssText
      if (!properties || properties.indexOf('cssText') === -1) {
        (function(descriptor) {
          if (!descriptor || !descriptor.set) { return; }
          (function(nativeMethod) {
            Object.defineProperty(styleDeclarationProto, 'cssText', {
              /* eslint-disable key-spacing */
              configurable:   descriptor.configurable,
              enumerable:     descriptor.enumerable,
              get:            descriptor.get,
              set:            function(value) {
                nativeMethod.call(this, convertCssValue(value));
              }
              /* eslint-enable key-spacing */
            });
          })(descriptor.set);
        })(Object.getOwnPropertyDescriptor(styleDeclarationProto, 'cssText'));
      }
    })(global.CSSStyleDeclaration && global.CSSStyleDeclaration.prototype);

    // ------------------------ CSSStyleSheet
    (function(styleSheetProto) {
      if (!styleSheetProto) { return; }

      (function(nativeMethod) {
        if (!nativeMethod) { return; }
        styleSheetProto.insertRule = function(rule, index) {
          nativeMethod.call(this, convertCssValue(rule), index);
        };
      })(styleSheetProto.insertRule);

      (function(nativeMethod) {
        if (!nativeMethod) { return; }
        styleSheetProto.addRule = function(selector, style, index) {
          nativeMethod.call(this, selector, convertCssValue(style), index);
        };
      })(styleSheetProto.addRule);
    })(global.CSSStyleSheet && global.CSSStyleSheet.prototype);

    // ------------------------ HTMLElement
    (function(HTMLElement) {
      if (!HTMLElement) { return; }
      Object.getOwnPropertyNames(global).forEach(function(constructorName) {
        var htmlElementProto;

        try {
          htmlElementProto = global[constructorName] && global[constructorName].prototype;
        } catch (e) {
          global.console.warn('Couldn\'t get prototype.', e, constructorName);
          return;
        }

        if (!htmlElementProto ||
          !HTMLElement.prototype.isPrototypeOf(htmlElementProto)) { return; }

        /*
          If the DOM prototype doesn't have these properties (e.g. old Chrome, etc.),
          it can't set descriptor.
          https://developers.google.com/web/updates/2015/04/DOM-attributes-now-on-the-prototype-chain
          But, those may be able to parse SVG.
        */

        ['src', 'data'].forEach(function(propName) {
          // if (!htmlElementProto.hasOwnProperty(propName)) { return; }

          (function(descriptor) {
            if (!descriptor || !descriptor.set) { return; }
            (function(nativeMethod) {
              Object.defineProperty(htmlElementProto, propName, {
                /* eslint-disable key-spacing */
                configurable:   descriptor.configurable,
                enumerable:     descriptor.enumerable,
                get:            descriptor.get,
                set:            function(value) {
                  nativeMethod.call(this, convertDataUri(value));
                }
                /* eslint-enable key-spacing */
              });
            })(descriptor.set);
          })(Object.getOwnPropertyDescriptor(htmlElementProto, propName));
        });
      });
    })(global.HTMLElement);
  }

  if (document.readyState === 'complete') {
    polyfillSvgUri();
  } else {
    document.addEventListener('DOMContentLoaded', polyfillSvgUri, false);
  }

})(Function('return this')()); // eslint-disable-line no-new-func
