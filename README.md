# polyfillSvgUri

Polyfill for plain SVG as Data URI scheme.

The plain SVG without encoding (e.g. Base64, URL encoding, etc.) that is written in the [Data URI scheme](http://tools.ietf.org/html/rfc2397) is easy to read, easy to edit and small size.  
That Data URI scheme is written in for example, `background-image`, `list-style-image`, `cursor` CSS properties, `src`, `data` attributes of `<img>`, `<input>`, `<iframe>`, `<object>` elements, etc..

```css
div {
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><path d="M10,10L32,90L90,32z" fill="lightgreen"/></svg>') center no-repeat;
}
```

But IE ignores it, and some browsers consider `#` as the hash.  
This polyfill solves those problems. It passes encoded SVG to IE, and it escapes `#`.

## Usage

```html
<script src="polyfill-svg-uri.min.js"></script>
```

### Supported Places

The plain SVGs as Data URI scheme are enabled in:

#### CSS styles in stylesheets

For example: `<link>` and `<style>` tags

#### CSS styles in inline-style

For example:

```html
<div style="background-image: url('data:image/svg+xml;utf8,<svg>...')">
```

#### `src` and `data` attributes of `<img>`, `<input>`, `<iframe>`, `<object>` tags, etc.

For example:

```html
<img src="data:image/svg+xml;utf8,<svg>...">
```

#### CSS properties of `elment.style`

For example:

```js
document.getElementById('media-1').style.backgroundImage =
  'url(\'data:image/svg+xml;utf8,<svg>...\')';
```

#### `elment.style.cssText` property

For example:

```js
document.getElementById('media-1').style.cssText =
  'background-image: url(\'data:image/svg+xml;utf8,<svg>...\');';
```

#### `elment.style.setProperty` method

For example:

```js
document.getElementById('media-1').style.setProperty(
  'background-image', 'url(\'data:image/svg+xml;utf8,<svg>...\')');
```

#### New CSS rules

For example:

```js
var styleSheet = document.styleSheets[0],
  selector = '#media-1',
  cssText = 'background-image: url(\'data:image/svg+xml;utf8,<svg>...\');';
if (styleSheet.insertRule) {
  styleSheet.insertRule(selector + '{' + cssText + '}', 0);
} else if (styleSheet.addRule) {
  styleSheet.addRule(selector, cssText);
}
```

#### Existing CSS rules

For example:

```js
document.styleSheets[0].cssRules[0].style.backgroundImage =
  'url(\'data:image/svg+xml;utf8,<svg>...\')';
```

#### `elment.src` and `elment.data` properties

For example:

```js
document.getElementById('media-1').src =
  'data:image/svg+xml;utf8,<svg>...';
```
