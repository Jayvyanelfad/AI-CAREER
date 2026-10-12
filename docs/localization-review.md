# Community locale review

Nigerian Pidgin (`pcm`), Gambian Wolof (`wo`), and Hausa (`ha`) are selectable
and persisted through the existing `aicareer-language` preference. Their files
translate navigation, common controls, Programming Studio execution controls,
and notification UI. Every other key deliberately falls back to English.

These are **partial UI translations**, not claims of fully translated courses,
assessment questions, lesson prose, certificates, or error messages. Before a
release that advertises any locale as complete, have a fluent Nigerian Pidgin,
Gambian Wolof, and Hausa reviewer respectively check terminology, register,
regional spelling, and the untranslated-key inventory. Arabic keeps its own
`rtl` metadata and is not altered by these additions.

Canonical English (`en.json`) now also carries the `notifications.*` and
`lessonVisual.*` keys used by `public/notifications.js`,
`public/dashboard.html`, and `public/lesson-visuals.js`, so every locale has
an English fallback. `fr`, `hinglish`, `sw`, and `ar` do not yet translate
those notification/diagram keys and intentionally fall back to English;
`pcm`, `wo`, and `ha` translate notifications but fall back to English for
lesson-diagram titles. `pcm`, `wo`, and `ha` remain `ltr`; only `ar` is `rtl`.
