# Pulling out all the stops in webfont performance

Web fonts give you the awesome ability to provide text to your user in exactly the style that you want to. Unfortunately the default load behavior of web fonts is so bad, that they are one of the biggest performance detractors on the time to meaningful paint metric. After all, the user probably went to your site to read stuff, you should show them text as soon as possible.

This problem has been described well in lots of conference talks and articles, and i you are new to this I recommend watching [Patrick Hamann](https://twitter.com/patrickhamann) in [The First Meaningful Paint](https://youtu.be/NGX0gYOo-Nk?t=18m59s) or reading [Ben Schwarz](https://twitter.com/benschwarz) in [The Critical Request](https://css-tricks.com/the-critical-request/)
[70% of sites use web fonts](http://httparchive.org/interesting.php#fonts), where this quote is from:

> [69% of sites use web fonts](http://httparchive.org/interesting.php#fonts), and unfortunately, they're providing a sub-par experience in most cases. They appear, then disappear, then appear again, change weights and jolt the page around during the render sequence.
>
> Frankly, this sucks on almost every level.
> <footer>— <a href="https://css-tricks.com/the-critical-request/#article-header-id-4">Ben Schwarz, The Critical Request</a></footer>

The behavior Ben is describing is what happens when web fonts load slowly, and trickle in gradually after the page has started rendering. The browser re-renders according to the [font style matching algorithm](https://www.w3.org/TR/css-fonts-3/#font-style-matching), which can cause normal text to suddenly be bold, or lighter, or jump around. A hot mess, and a really bad default for the best reading experience.

Lets see what we can do about it!

## Understanding performance detractors

An HTTP request can generally be broken down into these phases which take up the bulk of the time until the request has finished:

|| delay / queueing | DNS lookup | TLS handshake | TTFB | Download ||

There might be a delay before the request even starts, you might have to look up the DNS for the domain, establish a secure connection, wait a bit for the server to respond to your request and finally wait for the download to finish.

The default webfont loading happens like this:

- HTML loads, the pre-scanner discovers some CSS
- The CSS is queued for load, this is render blocking
- When the CSS has loaded the page renders
- The browser discovers that a webfont is needed to render some text
- The webfont is queued for load. If the page has renedered your text might be invisible
- The webfont has loaded, the text has the font applied

What happens here is incremental discovery. The browser only download webfonts on demand, when a glyph has a non-loaded font variation applied. So in order to even know that a specific font file is needed, the browser needs to go through a full CSS downloading roundtrip and can then discover what it needs.

This is painfully slow when you think about how few bytes are actually transferred. Most of the time is spent waiting to be discovered or hanging in TCP connection establishment.

Lets take a default use of google fonts as an example to improve performance on:

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css?family=Open+Sans">
<style>
  p {
    font-family: 'Open Sans';
  }
</style>
```

Google hosts their CSS on `https://fonts.googleapis.com`, but their fonts are hosted on `https://fonts.gstatic.com`. That's two different domains, making your worst case two serial requests that both have to go through DNS lookup, TLS handshake and TCP slowstart for a font payload that might be as little as 9kb. On high latency connections, like mobile phones often have, these delays matter a lot.

Google fonts is only and example, which I chose because they are widely used. Other web font providers have similar or worse performance profiles on their web font loading.


## Optimizing the load sequence

Lets attack each phase of the font loading request and see how much we can remove or minimize with frontend development techniques. If we can optimize in a way so we get the fonts to finish loading before the pages CSS has finished loading, then the first render will be with full web fonts. This is the goal.

So we need to have the font finish loading before it would even be queued for download in a non-optimized setup. Sounds daunting, but fear not :)

### Preload

Preloading your fonts is by far the biggest bang for the buck. If you are in a hurry just remember this take-away and you have covered most of the ground.

Preloading is essentially telling the browser that you need a specific thing queued for download immediately, even though thr browser does not know that it needs it yet. So if you know the URL of your font, you can queue the font request in such a way that the font will be downloaded in parallel with your CSS, thus eliminating one full CSS download roundtrip from your time to first font render!

Here's how that looks:

```html
<link rel="preload"
  href="https://fonts.gstatic.com/s/notoserif/v6/HQ...Vs.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous">
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css?family=Open+Sans">
```

Put your `preload` as early in your document as possible, or even better, directly in your HTTP-headers in the HTML response. This ensures the font being queued first, and side stepping the cirical request chain.

There are a few problems here though. The font URL might not be stable. The good thing about Google fonts is that their license is very liberal. This means you are allowed to download them to your own website and serve them from there. Now you can guarantee URL stability, and also eliminate the double connection delays to external domains.

A downside is you need to provide the relevant font format fallbacks yourself for browsers without woff2 or even woff capability. Here you can see an inlined example of such an `@font-face` declaration

```html
<link rel="preload"
  href="/google-fonts/OpenSans.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous">
<style>
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: url(/google-fonts/OpenSans.woff2) format('woff2'),
    url(/google-fonts/OpenSans.woff) format('woff'),
    /* And if you support really old browsers: */
    url(/google-fonts/OpenSans.ttf) format('truetype');
}
</style>
```

Now a modern browser with preload and woff2 support will load fast

### Javascript Preload

For browsers with no preload support, around 40% at this time according to [caniuse.com](https://caniuse.com/#search=preload), and browsers with no woff2 support, there is still a way to trigger an immediate load of the fonts with Javascript.

Using the [FontFace Interface](https://drafts.csswg.org/css-font-loading/#font-face-constructor) we can programatically trigger a download like this:

```js
var fontUrls = [
  "url(/google-fonts/OpenSans.woff2) format('woff2')",
  "url(/google-fonts/OpenSans.woff) format('woff')"
];
var props = {
  style: 'normal', // Initial values can be excluded
  weight: 'normal', // These are mostly here for the example
  stretch: 'normal'
};
new FontFace('Open Sans', fontUrls.join(','), props).load();
```

By specifying the font both with woff2 and woff urls the browser can load the best one it supports.

If you can inline this snippet of javascript into your pages right after your `<link rel="preload">` you're suddenly covering an [extra 25 percentage points of browser usage](https://caniuse.com/#search=font%20load) with font preloading.

Still, some browsers don't support `FontFace`, so we'll need to wrap that in a little `try`/`catch`, giving us this setup:

```html
<link rel="preload"
  href="/google-fonts/OpenSans.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous">
<script>
var fontUrls = [
  "url(/google-fonts/OpenSans.woff2) format('woff2')",
  "url(/google-fonts/OpenSans.woff) format('woff')"
];
try {
  new FontFace('Open Sans', fontUrls.join(',')).load();
} catch(e) {}
</script>
<style>
@font-face {
  font-family: 'Open Sans';
  font-style: normal;
  font-weight: 400;
  src: url(/google-fonts/OpenSans.woff2) format('woff2'),
    url(/google-fonts/OpenSans.woff) format('woff'),
    /* And if you support really old browsers: */
    url(/google-fonts/OpenSans.ttf) format('truetype');
}
</style>
```

### Reducing Latency

When you serve your fonts yourself you'll need to take control of the latency that is induced by your server possibly being physically very far away from your visitors browser. In order to do this it's a good idea to put your site on a CDN.

By now it's pretty cheap to do so, and the amount of services you get are astonishing, so I highly recommend you do so.

Choose whichever one you prefer, they will almost inevitably make your page faster than your own server can. Remember to set good caching headers.


### Use HTTP2

If you're not on a CDN that provides HTTP2, or have HTTP2 enabled in your own server, you are missing out. When many requests are queued at once, which might happen quick if you preload 4 variations of each of your 2 web fonts, you might block your own critical CSS request if you are limited to the amount of parallel requests that can happen at once on HTTP in most browsers.
