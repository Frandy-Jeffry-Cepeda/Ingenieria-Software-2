#!/usr/bin/env bash
# =====================================================================
#  MEDICIÓN DEL PROCESO DE DESARROLLO
#  INF-5250 · Ingeniería de Software II · Unidad 7 — Mejoras de procesos
#  Equipo 6 · Sistema de Inventario de Equipos de TI
#
#  Uso:   bash medir-proceso.sh            ejecuta todo de corrido
#         bash medir-proceso.sh --pausa    se detiene entre secciones
#                                          (recomendado para la exposición)
#
#  Requiere Git Bash, que viene con Git para Windows.
#  Ejecutar desde la raíz del repositorio.
# =====================================================================

set -u

PAUSA=0
for a in "$@"; do [ "$a" = "--pausa" ] && PAUSA=1; done

# --- colores: se desactivan solos si la salida no es una terminal ---
if [ -t 1 ]; then
  B=$'\033[1m'; D=$'\033[2m'; G=$'\033[32m'; R=$'\033[31m'; N=$'\033[0m'
else
  B=""; D=""; G=""; R=""; N=""
fi

linea(){ printf "%s\n" "────────────────────────────────────────────────────────────────────"; }
titulo(){ printf "\n${B}%s${N}\n" "$1"; linea; }
dato(){ printf "   ${B}%9s${N}   %s\n" "$2" "$1"; }
estado(){
  if [ "$2" -gt 0 ]; then printf "   ${G}%9s${N}   %s\n" "$2" "$1"
  else printf "   ${R}%9s${N}   %s ${R}— ausente${N}\n" "0" "$1"; fi
}
juicio(){ printf "   ${D}→${N} %s\n" "$1"; }
pausa(){ [ "$PAUSA" -eq 1 ] && { printf "\n   ${D}[Enter para continuar]${N}"; read -r _; printf "\n"; }; return 0; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf "${R}Esto no es un repositorio Git. Ubícate en la raíz del proyecto.${N}\n"; exit 1
fi

REPO=$(basename "$(git rev-parse --show-toplevel)")
RAMA=$(git rev-parse --abbrev-ref HEAD)
HASH=$(git rev-parse --short HEAD)

printf "\n${B}╔══════════════════════════════════════════════════════════════════╗${N}\n"
printf "${B}║  MEDICIÓN DEL PROCESO — Equipo 6 · INF-5250 · Unidad 7           ║${N}\n"
printf "${B}╚══════════════════════════════════════════════════════════════════╝${N}\n"
printf "   Repositorio : %s\n" "$REPO"
printf "   Rama        : %s   ·   HEAD: %s\n" "$RAMA" "$HASH"
printf "   Medido el   : %s\n" "$(date '+%d/%m/%Y %H:%M')"
pausa

# =====================================================================
titulo "1 · ¿QUIÉN TRABAJA?   distribución del esfuerzo"
TOTAL=$(git rev-list --count --all)
git log --all --format='%an' | sort | uniq -c | sort -rn | while read -r c nombre; do
  p=$(( c * 100 / TOTAL ))
  printf "   ${B}%9s${N}   %-34s ${D}%s%%${N}\n" "$c" "$nombre" "$p"
done

AUTORES=$(git log --all --format='%an' | sort -u | wc -l | tr -d ' ')
TOP=$(git log --all --format='%an' | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
if [ "$TOTAL" -gt 0 ]; then PCT=$(( TOP * 100 / TOTAL )); else PCT=0; fi
printf "\n"
dato "Commits totales" "$TOTAL"
dato "Personas distintas que han hecho commits" "$AUTORES"
dato "Concentración en el autor principal" "${PCT}%"
if [ "$PCT" -ge 70 ]; then
  juicio "${R}El trabajo está concentrado en una sola persona.${N}"
  juicio "Riesgo de dependencia: nadie más conoce ese código."
else
  juicio "${G}El esfuerzo está repartido entre varios integrantes.${N}"
fi
pausa

# =====================================================================
titulo "2 · ¿CON QUÉ RITMO?   frecuencia de integración"
git log --all --date=short --format='   %ad  %h  %<(17,trunc)%an %<(32,trunc)%s' | head -12

DIAS=$(git log --all --format='%ad' --date=short | sort -u | wc -l | tr -d ' ')
PRIMERA=$(git log --all --reverse --format='%ad' --date=short | head -1)
ULTIMA=$(git log --all -1 --format='%ad' --date=short)
printf "\n"
dato "Días distintos con actividad" "$DIAS"
dato "Primer commit" "$PRIMERA"
dato "Último commit" "$ULTIMA"
if [ "$DIAS" -le 2 ]; then
  juicio "${R}Todo el trabajo se integró en muy pocos días.${N}"
  juicio "No hubo integración continua: hubo una carga masiva."
else
  juicio "El trabajo se integró de forma distribuida en el tiempo."
fi
pausa

# =====================================================================
titulo "3 · ¿CÓMO ENTRA EL CÓDIGO?   verificación por pares"
FUS=$(git log --all --oneline --merges | wc -l | tr -d ' ')
DIR=$(git log --all --oneline --no-merges | wc -l | tr -d ' ')
SUM=$(( FUS + DIR ))
if [ "$SUM" -gt 0 ]; then PCTREV=$(( FUS * 100 / SUM )); else PCTREV=0; fi
dato "Commits integrados por fusión (revisados)" "$FUS"
dato "Commits directos a la rama principal" "$DIR"
dato "Porcentaje que pasó por revisión" "${PCTREV}%"
RAMAS=$(git branch -a --format='%(refname:short)' | grep -vcE 'HEAD' || true)
dato "Ramas existentes (locales y remotas)" "$RAMAS"
printf "\n"
if [ "$PCTREV" -eq 0 ]; then
  juicio "${R}INDICADOR CLAVE: ningún cambio fue revisado por otro integrante.${N}"
  juicio "Todo entró directo a la rama principal: es la debilidad"
  juicio "que ataca nuestra propuesta de mejora."
else
  juicio "${G}${PCTREV}% de los cambios pasó por una revisión.${N}"
fi
pausa

# =====================================================================
titulo "4 · ¿QUÉ NOS PROTEGE?   red de seguridad del proceso"
PRUEBAS=$(git ls-files | grep -cE '\.(spec|test)\.[tj]sx?$' || true)
LINT=$(git ls-files | grep -icE 'eslintrc|eslint\.config|\.prettierrc|sonar-project' || true)
CI=$(git ls-files | grep -cE '^\.github/workflows/|^\.gitlab-ci|^azure-pipelines' || true)
COBERTURA=$(git ls-files | grep -icE 'jest\.config|vitest\.config|coverage' || true)

estado "Archivos de prueba automatizada" "$PRUEBAS"
estado "Configuración de análisis estático" "$LINT"
estado "Integración continua" "$CI"
estado "Configuración de cobertura" "$COBERTURA"
printf "\n"
FALTAN=0
for v in "$PRUEBAS" "$LINT" "$CI" "$COBERTURA"; do [ "$v" -eq 0 ] && FALTAN=$((FALTAN+1)); done
if [ "$FALTAN" -eq 4 ]; then
  juicio "${R}No hay ninguna red de seguridad automática.${N}"
  juicio "Cualquier regresión se detecta a mano, o no se detecta."
elif [ "$FALTAN" -ge 2 ]; then
  juicio "Ya hay algo, pero la red todavía tiene huecos."
else
  juicio "${G}Existen mecanismos automáticos de verificación.${N}"
fi
pausa

# =====================================================================
titulo "5 · TAMAÑO DE LOS CAMBIOS   ¿incrementos o cargas masivas?"
git log --all --format='%h|%<(32,trunc)%s' | head -12 | while IFS='|' read -r h msg; do
  stat=$(git show --numstat --format="" "$h" \
         | awk '{a+=$1; b+=$2; n++} END {printf "%d arch.  +%d  -%d", n+0, a+0, b+0}')
  printf "   %-9s %s  %s\n" "$h" "$msg" "$stat"
done
printf "\n"
MAX=$(git log --all -30 --format='%H' | while read -r h; do
        git show --numstat --format="" "$h" | awk '{s+=$1+$2} END {print s+0}'
      done | sort -rn | head -1)
dato "Líneas del commit más grande" "${MAX:-0}"
if [ "${MAX:-0}" -gt 2000 ]; then
  juicio "${R}Hay al menos un commit enorme.${N} Un cambio de ese tamaño"
  juicio "es imposible de revisar con criterio."
else
  juicio "${G}Los commits tienen un tamaño revisable.${N}"
fi
pausa

# =====================================================================
titulo "6 · PARA CONTRASTAR   esto mide el PRODUCTO, no el proceso"
ARCHIVOS=$(git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' | grep -vcE 'node_modules|\.min\.' || true)
LINEAS=$(git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' | grep -vE 'node_modules|\.min\.' \
         | xargs cat 2>/dev/null | grep -cve '^[[:space:]]*$' || true)
ENDPOINTS=$(git grep -hoE '@(Get|Post|Patch|Put|Delete)\(' -- '*.ts' 2>/dev/null | wc -l | tr -d ' ')
dato "Archivos de código fuente" "$ARCHIVOS"
dato "Líneas de código (sin líneas en blanco)" "$LINEAS"
dato "Rutas HTTP expuestas por la API" "$ENDPOINTS"
juicio "Estas son métricas de ${B}producto${N}: las de la Unidad 1."
juicio "Las cinco secciones anteriores miden el ${B}proceso${N}."
juicio "Un producto correcto no demuestra un proceso sano."
pausa

# =====================================================================
titulo "RESUMEN PARA LA RETROSPECTIVA"
dato "Concentración del trabajo en una persona" "${PCT}%"
dato "Cambios revisados por un par" "${PCTREV}%"
dato "Días con actividad de integración" "$DIAS"
dato "Mecanismos automáticos ausentes" "${FALTAN} de 4"
printf "\n   ${D}Estos cuatro números son las medidas de proceso de la Unidad 7.${N}\n"
printf "   ${D}La propuesta de mejora debe mover al menos uno de ellos.${N}\n\n"
