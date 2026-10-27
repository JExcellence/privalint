# third-party-embeds

[English](third-party-embeds.md)

Die Regel meldet beobachtete Kontakte eingebetteter Drittanbieter vor einer Consent-Interaktion.
Sie erfasst YouTube, Vimeo, Google Maps, reCAPTCHA, Gravatar, X, Instagram, Facebook-Plugins,
Spotify, Disqus sowie hCaptcha, Cloudflare Turnstile, OpenStreetMap-Kacheln, TikTok und Calendly.

Turnstile wird auf `challenges.cloudflare.com/turnstile/` eingegrenzt, OpenStreetMap auf
`tile.openstreetmap.org` einschließlich Subdomains und TikTok auf `/embed`, `/embed.js` und
`/player/`. Verwechselbare Domains und andere Inhalte derselben Anbieter werden nicht pauschal
erfasst. Fehlgeschlagene, ausgelassene und sicherheitsblockierte Anfragen zählen nicht als
Nachweis eines geladenen Anbieters.

Jeder Anbieter erscheint einmal pro Seite als Warnung. Zweck, Erforderlichkeit und Rechtsgrundlage
müssen im konkreten Kontext geprüft werden. Insbesondere Sicherheits-Widgets können eine andere
Bewertung benötigen als Video- oder Social-Media-Einbindungen. Ein Netzwerk-Kontakt beweist nicht
automatisch eine Einwilligungspflicht oder einen Datenschutzverstoß.

Soweit Einwilligung erforderlich ist, einen Platzhalter einsetzen und die Ressource erst nach
Einwilligung bzw. Klick laden. Karten können alternativ durch einen statischen Verweis ersetzt
werden; Captchas möglichst nur an tatsächlich geschützten Formularen laden. Länderprofile steuern
die Einordnung des Tools und bestimmen nicht automatisch anwendbares Recht.

Die [englische Fassung](third-party-embeds.md) verlinkt die Originaldokumentation aller neuen Anbieter.
