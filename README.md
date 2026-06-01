# Bettermoove — Thème Shopify (Online Store 2.0)

Thème e-commerce orienté **conversion**, conçu pour **Bettermoove** et la genouillère de compression **BetterKnee**.
Optimisé pour une audience **45-65 ans** : gros caractères, fort contraste, réassurance et preuve sociale.

## 🎨 Charte graphique
| Usage | Couleur |
|------|---------|
| Fond | `#FFFFFC` |
| Texte | `#000000` |
| Boutons (CTA) | `#8FAF8A` |

Réglable dans **Personnaliser → Paramètres du thème → Couleurs**.

## 🧱 Structure
```
assets/        theme.css · theme.js
config/        settings_schema.json · settings_data.json
layout/        theme.liquid · password.liquid
locales/       fr.default.json · en.json
sections/      hero, benefits, trust-strip, testimonials, faq, comparison,
               how-it-works, image-with-text, cta-banner, newsletter,
               header, footer, main-product, main-collection, main-cart…
snippets/      icon, stars, product-card, cart-drawer, cart-contents
templates/     index · product · collection · cart · page · search · 404 …
```

## ⭐ Fonctionnalités conversion
- Page d'accueil landing : hero, bandeau de confiance, bénéfices, problème/solution,
  étapes, témoignages vérifiés, comparatif, FAQ, bannière CTA, newsletter
- Page produit : galerie, sélecteur de tailles, **offres par lot**, stock dynamique,
  **barre d'ajout collante (mobile)**, réassurance, moyens de paiement, données structurées SEO
- Panier en **tiroir latéral AJAX** avec barre de livraison offerte
- 100 % responsive, accessible (WCAG), rapide

## 🚀 Mise en ligne
1. Compresser le contenu du dépôt en `.zip` (les dossiers à la racine du zip).
2. Shopify Admin → **Boutique en ligne → Thèmes → Ajouter → Importer un thème**.
3. Ou via Shopify CLI : `shopify theme push`.
4. Pensez à **publier le produit** Genouillère BetterKnee (actuellement en brouillon).

## 🛠️ Personnalisation
Tous les textes, témoignages, FAQ et bénéfices sont éditables sans code depuis
l'éditeur de thème Shopify (chaque section dispose de blocs configurables).
