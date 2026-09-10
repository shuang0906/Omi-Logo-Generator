# p5.capture 1.6.1

Source: https://cdn.jsdelivr.net/npm/p5.capture@1.6.1/dist/p5.capture.umd.js

Upstream: https://github.com/tapioca24/p5.capture (MIT license).

The bundled WebM writer supports alpha, but p5.capture 1.6.1 does not expose
its `transparent` option. This local copy adds `transparent:true` to the
`webmWriterOptions` passed in `createRecorder()`. No other library code is changed.
This preserves the existing recording controls and export formats.

When updating the library, retain this option so WebM exports preserve canvas alpha.
