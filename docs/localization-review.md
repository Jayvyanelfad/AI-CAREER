# Community locale review

## Current language coverage

English (`en`) is the canonical dictionary. French (`fr`), Hinglish
(`hinglish`), Swahili (`sw`), and Arabic (`ar`) are expected to share the
same key set as English; a regression test checks this parity. Course-card
descriptions and learning-diagram labels are included in all selectable
locale dictionaries. Arabic keeps right-to-left direction metadata.

Hausa (`ha`), Nigerian Pidgin (`pcm`), and Gambian Wolof (`wo`) remain
**partial UI translations**. They now include the same course-card descriptions
and learning-diagram labels, but many other UI strings still use English
fallback. Do not market these three locales as fully translated.

## Scope and quality

These are interface translations, not a claim that course lesson bodies,
exam questions, career-assessment question banks, or all English-authored
content have been localized. Before calling any locale production-complete,
have a fluent native or community reviewer check terminology, register,
regional spelling, layout, and RTL behavior. Keep technical terms consistent.

The language selector intentionally offers the supported locales listed in
`public/i18n.js`; Fon remains disabled until reviewed translations exist.
The admin dashboard uses a separate `public/admin-locales/` system and has
its own parity test. It currently supports English, French, Hinglish, Swahili,
and Arabic.
