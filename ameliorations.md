# Ameliorations a prevoir

## Priorite
- Ajouter une vraie echelle de temps pour les graphiques (Chart.js + adapter date)
- Ajouter des labels lisibles (mois/annee) et un lissage plus fin
- Ajouter un etat "rapport pret" plus visible apres generation
- Afficher clairement la source et la fraicheur des donnees (cache)
- Ajouter une option pour choisir l'horizon (30j, 180j, 365j)
- Ajouter un mode "comparaison visuelle" (sparklines cote a cote)

## Notes techniques
- Pour l'echelle de temps: ajouter `chartjs-adapter-date-fns` et repasser l'axe x en `time`
