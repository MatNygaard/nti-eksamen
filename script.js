//Priser og satser
//Alle konstanter som brukes i prisberegningen.
//Disse kan enkelt justeres uten å endre logikken i koden.

const SCAN_DAY_RATE = 17500           //Dagspris for skanning i felt
const OFFICE_DAY_RATE = 13250         //Dagspris for etterarbeid på kontor
const MINIMUM_DAYS = 0.5              //Minimum antall dager (halv dag)
const MINIMUM_TOTAL = 17500           //Laveste mulige totalpris
const ADMIN_MARKUP = 0.10             //10% administrasjonspåslag
const TRAVEL_HOURLY_RATE = 1820       //Timepris for reise
const OFFICE_WORK_MULTIPLIER = 3.0    //Etterarbeid tar 3x så lang tid som skanning
const BIM_RATE_PER_M2 = 7.0           //Kostnad per m2 for BIM-modellering

//Hvor mange timer det tar å skanne 1000 m2, per skannertype.
//"office" = innendørs bygg, "open" = åpne/utendørs områder.
const SCAN_HOURS_PER_1000M2 = {
  matterport_pro3: { office: 2.0, open: 1.0 },
  blk360_g2:       { office: 2.0, open: 1.0 },
  blk2go:          { office: 1.0, open: 0.5 },
  rtc360:          { office: 2.0, open: 1.0 },
}

//Visningsnavn for hver skanner, brukes i estimat-panelet.
const SCANNER_NAMES = {
  matterport_pro3: 'Matterport Pro3',
  blk2go:          'Leica BLK2GO',
  blk360_g2:       'Leica BLK360 G2',
  rtc360:          'Leica RTC360',
}

//Skjemavalg (state)
//Dette objektet holder styr på hva brukeren har valgt i skjemaet.
//Oppdateres hver gang brukeren klikker en knapp eller skriver i et felt.

const form = {
  projectType: null,
  scanPurpose: null,
  areaM2: 0,
  postalCode: '',
  deliverables: [],
  precisionLevel: null,
}

//Hjelpefunksjoner

//Formaterer et tall til norsk valutaformat, f.eks. 17 500 kr
function formatKr(tall) {
  return tall.toLocaleString('nb-NO') + ' kr'
}

//Runder timer opp til nærmeste halve dag (0.5, 1.0, 1.5 osv.)
//Returnerer alltid minst MINIMUM_DAYS (0.5)
function roundToHalfDay(hours) {
  const days = Math.ceil((hours / 8) * 2) / 2
  if (days < MINIMUM_DAYS) {
    return MINIMUM_DAYS
  }
  return days
}

//Velg skanner
//Bestemmer hvilken skanner som anbefales basert på brukerens valg, prioritert rekkefølge: presisjon --> formål --> standard.

function selectScanner() {
  if (form.precisionLevel === 'high') return 'blk360_g2'
  if (form.scanPurpose === 'visualization') return 'matterport_pro3'
  if (form.scanPurpose === 'bim_projection') return 'blk2go'
  return 'blk360_g2'
}

//Reisekostnad
//Estimerer reisekostnad basert på postnummer.
//Kontoret ligger i Sandvika (1300–1399), så reise dit er gratis.
//Jo lenger unna, jo høyere reisekostnad.

function estimateTravelCost() {
  if (!form.postalCode) return 0

  const code = parseInt(form.postalCode, 10)

  if (code >= 1300 && code <= 1399) return 0                      // Sandvika (lokalt)
  if (code >= 900  && code <= 1299) return TRAVEL_HOURLY_RATE * 0.5  // Nærområde
  if (code >= 200  && code <= 899)  return TRAVEL_HOURLY_RATE * 1.5  // Oslo-regionen
  if (code >= 4000 && code <= 5999) return TRAVEL_HOURLY_RATE * 4    // Sørlandet/Vestland
  if (code >= 7000 && code <= 7999) return TRAVEL_HOURLY_RATE * 6    // Trøndelag
  if (code >= 8000 && code <= 9999) return TRAVEL_HOURLY_RATE * 8    // Nord-Norge

  return TRAVEL_HOURLY_RATE * 2  //Alt annet
}

//Hovedberegning
//Tar alle valg fra form-objektet og beregner et komplett prisestimat.
//Returnerer et objekt med alle delkostnader og totalpris.

//Flyten --> 
//1-Velg skanner basert på formål/presisjon
//2-Beregn skannetid ut fra areal og skannertype
//3-Regn om timer til dager (felt + kontor)
//4-Gang dager med dagsrater for å få kostnader
//5-Legg til BIM, reise og administrasjon
//6-Beregn totalspenn (min/max) med +-10-15% margin

function calculateEstimate() {
  const area = form.areaM2
  const scanner = selectScanner()

  //Steg 1–2: Finn skannetid basert på type bygg og skanner
  const isOpen = (form.projectType === 'industrial' || form.projectType === 'outdoor')
  const type = isOpen ? 'open' : 'office'
  const scanHours = (area / 1000) * SCAN_HOURS_PER_1000M2[scanner][type]

  //Steg 3: Regn om til dager
  const scanDays = roundToHalfDay(scanHours)
  const officeDays = roundToHalfDay(scanHours * OFFICE_WORK_MULTIPLIER)

  //Steg 4: Beregn grunnkostnader
  const scanCost = scanDays * SCAN_DAY_RATE
  const officeCost = officeDays * OFFICE_DAY_RATE

  //Steg 5: Tilleggskostnader
  const needsBim = form.deliverables.indexOf('ifc_bim') !== -1
                 || form.deliverables.indexOf('2d_drawings') !== -1
  const bimCost = needsBim ? area * BIM_RATE_PER_M2 : 0
  const travelCost = estimateTravelCost()
  const subtotal = scanCost + officeCost + bimCost + travelCost
  const adminMarkup = subtotal * ADMIN_MARKUP

  //Steg 6: Totalspenn
  const baseTotal = subtotal + adminMarkup
  const totalMin = Math.max(MINIMUM_TOTAL, Math.round(baseTotal * 0.90))
  const totalMax = Math.round(baseTotal * 1.15)

  return {
    scanner: scanner,
    scanDays: scanDays,
    officeDays: officeDays,
    scanCost: scanCost,
    officeCost: officeCost,
    bimCost: bimCost,
    travelCost: travelCost,
    adminMarkup: adminMarkup,
    totalMin: totalMin,
    totalMax: totalMax,
  }
}

//Oppdater estimat-panelet
//Disse funksjonene oppdaterer det brukeren ser i sidepanelet.
//All HTML ligger allerede i index.html
//elementer og oppdaterer teksten med textContent.

//Viser eller skjuler én kostnadslinje i panelet.
//Hvis verdien er 0 skjules linjen, ellers vises den med formatert beløp.
function showLine(id, value) {
  const line = document.getElementById(id)
  if (value > 0) {
    line.style.display = 'flex'
    line.querySelector('.value').textContent = formatKr(value)
  } else {
    line.style.display = 'none'
  }
}

//Kalles hver gang brukeren endrer noe i skjemaet.
//Hvis areal ikke er fylt inn vises en placeholder-tekst.
//Ellers beregnes estimat og alle felter i panelet oppdateres.
function updateEstimate() {
  const emptyHint = document.getElementById('emptyHint')
  const details = document.getElementById('estimateDetails')

  if (!form.areaM2) {
    emptyHint.style.display = 'block'
    details.style.display = 'none'
    return
  }

  emptyHint.style.display = 'none'
  details.style.display = 'block'

  const est = calculateEstimate()

  showLine('lineScan', est.scanCost)
  showLine('lineOffice', est.officeCost)
  showLine('lineBim', est.bimCost)
  showLine('lineTravel', est.travelCost)
  showLine('lineAdmin', est.adminMarkup)

  document.getElementById('valTotal').textContent =
    formatKr(est.totalMin) + ' – ' + formatKr(est.totalMax)

  document.getElementById('scannerBadge').textContent = SCANNER_NAMES[est.scanner]
  document.getElementById('daysInfo').textContent =
    est.scanDays + 'd felt / ' + est.officeDays + 'd kontor'
}

//Knappehåndtering
//Knappene ligger i HTML-en med data-value attributter.
//Disse funksjonene legger til click-handlers som:
//1.Oppdaterer form-objektet med brukerens valg
//2.Markerer riktig knapp som aktiv (css-klasse)
//3.Kjører updateEstimate() for å oppdatere prisen

//For knappgrupper der kun en kan velges om gangen (radio-oppførsel).
//Fjerner "active" fra alle knapper, legger til på den som ble klikket.
function setupSingleSelect(groupId, field) {
  const buttons = document.querySelectorAll('#' + groupId + ' .btn')

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      form[field] = this.dataset.value

      // Fjern "active" fra alle, legg til på den som ble klikket
      const siblings = this.parentElement.querySelectorAll('.btn')
      for (let j = 0; j < siblings.length; j++) {
        siblings[j].classList.remove('active')
      }
      this.classList.add('active')

      updateEstimate()
    })
  }
}

//For knappgrupper der flere kan velges samtidig (checkbox-oppførsel).
//Toggler verdien inn/ut av en liste, og toggler "active"-klassen.
function setupMultiSelect(groupId, field) {
  const buttons = document.querySelectorAll('#' + groupId + ' .btn')

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      const value = this.dataset.value
      const index = form[field].indexOf(value)

      // Legg til eller fjern fra listen, og oppdater klassen
      if (index === -1) {
        form[field].push(value)
        this.classList.add('active')
      } else {
        form[field].splice(index, 1)
        this.classList.remove('active')
      }

      updateEstimate()
    })
  }
}

//Start
//Kobler knapper og input-felter til form-objektet.
//Dette kjøres når siden lastes, og setter opp all interaktivitet.

setupSingleSelect('projectType', 'projectType')
setupSingleSelect('scanPurpose', 'scanPurpose')
setupMultiSelect('deliverables', 'deliverables')
setupSingleSelect('precisionLevel', 'precisionLevel')

//Når brukeren skriver inn areal, oppdater form og beregn på nytt
document.getElementById('areaM2').addEventListener('input', function (e) {
  form.areaM2 = e.target.value ? Number(e.target.value) : 0
  updateEstimate()
})

//Når brukeren skriver inn postnummer, filtrer bort ikke-tall og begrens til 4 siffer
document.getElementById('postalCode').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  form.postalCode = e.target.value
  updateEstimate()
})
