# Community locale review

## Current language coverage

English (`en`) is the canonical dictionary. French (`fr`), Hinglish
(`hinglish`), Swahili (`sw`), and Arabic (`ar`) share the same 1,314-key
dictionary shape as English. A regression test checks key parity. Arabic uses
right-to-left direction metadata.

Hausa (`ha`), Nigerian Pidgin (`pcm`), and Gambian Wolof (`wo`) have been
expanded to cover more frequently used navigation, account/profile, assessment,
course, dashboard, and Programming Studio interface text. They remain
**partial UI translations**; many long-form strings and specialist messages
still use English fallback. Do not describe these locales as fully translated.

Some technical product terms (for example, API, browser, code, and dashboard)
are intentionally retained where translating them could make instructions less
recognizable. These additions should be treated as translation drafts until
reviewed by fluent readers.

## Scope and quality

These are interface translations, not a claim that course lesson bodies, exam
questions, career-assessment question banks, or all English-authored content
have been localized. Before calling any locale production-complete, have a
fluent native or community reviewer check terminology, register, regional
spelling, accessibility labels, text wrapping, and RTL behavior.

The language selector offers the supported locales listed in `public/i18n.js`;
Fon remains disabled until reviewed translations exist. The admin dashboard
uses a separate `public/admin-locales/` system and has its own parity test.
It currently supports English, French, Hinglish, Swahili, and Arabic.
