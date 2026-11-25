# Changelog

## 1.0.0 - 2026-11-25

Première version publique, reprise du prototype `2D Billiards`.

- Billard complet : quinze billes, blanche, rack et six poches.
- Visée à la souris, puissance réglable, effet sur la blanche et simulation physique.
- Score, combos, billes empochées, particules et traînées.
- Musique et effets sonores synthétisés avec Web Audio.

Corrections apportées au prototype :

- mise en page mobile : panneau sous la table au lieu d'être hors écran, table pleine largeur
- table de référence 960 x 480 conservée, mise à l’échelle en CSS avec conversion des coordonnées du pointeur
- base Vite fixée à /billiards/, langue française, métadonnées et image Open Graph
- toast d'aide rendu cliquable-transparent : il interceptait le troisième tap sur mobile et empêchait le tir.
- visée et effet calculés depuis le clic, transitions d'état par référence pour éviter les fermetures obsolètes.
